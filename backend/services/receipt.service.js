import crypto from "crypto";
import CompanyBranding from "../models/CompanyBranding.js";
import Receipt from "../models/Receipt.js";
import Company from "../models/Company.js";
import { generateReceiptPdf } from "../utils/generateReceiptPdf.js";
import { ApiError } from "../middlewares/errorHandler.js";

function generateSignature(snapshot) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

export async function generateReceipt({
  transaction,
  companyId,
  managerId,
  session,
}) {
  const company = await Company.findById(companyId).session(session);

  const branding = await CompanyBranding.findOneAndUpdate(
    {company: companyId},
    {
      $setOnInsert: {
        company: companyId,
        receiptPrefix: company.receiptPrefix || "RCPT",
        primaryColor: "#1A73E8",
        footerText: "Generated securely by Akera system"
      },
      $inc: {receiptCounter: 1},
    },
    {
      new: true,
      upsert: true,
      session,
    }
  );

  const existing = await Receipt.findOne({
    transaction: transaction._id,
  }).session(session);

  
  const receiptNumber = `${branding.receiptPrefix}-${branding.receiptCounter
    .toString()
    .padStart(6, "0")}`;

  if (existing) return existing;

  const snapshot = {
    transactionCode: transaction.transactionCode,
    beneficiaryName: transaction.beneficiaryName,

    inputAmount: transaction.inputAmount,
    inputCurrency: transaction.inputCurrency,

    companyAmount: transaction.companyAmount,
    companyCurrency: transaction.companyCurrency,

    partnerAmount: transaction.partnerAmount,
    partnerCurrency: transaction.partnerCurrency,

    exchangeRate: transaction.exchangeRate,

    processedAt: transaction.processedAt,
  };

const signatureHash = generateSignature(snapshot);

  const pdfPath = await generateReceiptPdf({
    receiptNumber,
    snapshot,
    company,
    branding,
    signatureHash,
  });

  const [receipt] = await Receipt.create(
    [
      {
        transaction: transaction._id,
        company: companyId,
        receiptNumber,
        snapshot,
        signatureHash,
        pdfPath,
        generatedBy: managerId,
      },
    ],
    { session },
  );

  return receipt;
}
