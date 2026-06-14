import crypto from "crypto";
import CompanyBranding from "../models/CompanyBranding.js";
import Receipt from "../models/Receipt.js";
import Company from "../models/Company.js";
import { generateReceiptPdf } from "../utils/generateReceiptPdf.js";
import { ApiError } from "../middlewares/errorHandler.js";

const MAX_RECEIPT_CREATE_ATTEMPTS = 3;

function generateSignature(snapshot) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function buildCompanyShortCode(companyId) {
  return companyId.toString().slice(-6).toUpperCase();
}

function buildReceiptNumber({ prefix, companyId, counter }) {
  return [
    prefix || "RCPT",
    buildCompanyShortCode(companyId),
    counter.toString().padStart(6, "0"),
  ].join("-");
}

function buildReceiptSnapshot(transaction) {
  return {
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
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function isDuplicateKeyFor(error, field) {
  return Boolean(error?.keyPattern?.[field] || error?.keyValue?.[field]);
}

function findReceiptForTransaction(transactionId, session) {
  return Receipt.findOne({
    transaction: transactionId,
  }).session(session);
}

async function getNextReceiptBranding({ company, companyId, session }) {
  return CompanyBranding.findOneAndUpdate(
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
}

export async function generateReceipt({
  transaction,
  companyId,
  managerId,
  session,
}) {
  const existing = await findReceiptForTransaction(transaction._id, session);
  if (existing) return existing;

  const company = await Company.findById(companyId).session(session);
  if (!company) {
    throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const snapshot = buildReceiptSnapshot(transaction);
  const signatureHash = generateSignature(snapshot);

  for (let attempt = 0; attempt < MAX_RECEIPT_CREATE_ATTEMPTS; attempt += 1) {
    const receipt = await createReceiptAttempt({
      company,
      companyId,
      managerId,
      session,
      signatureHash,
      snapshot,
      transaction,
    });

    if (receipt) return receipt;
  }

  throw new ApiError(
    409,
    "Unable to generate a unique receipt number",
    "RECEIPT_NUMBER_COLLISION",
  );
}

async function createReceiptAttempt({
  company,
  companyId,
  managerId,
  session,
  signatureHash,
  snapshot,
  transaction,
}) {
  const existing = await findReceiptForTransaction(transaction._id, session);
  if (existing) return existing;

  const branding = await getNextReceiptBranding({ company, companyId, session });
  const receiptNumber = buildReceiptNumber({
    prefix: branding.receiptPrefix,
    companyId,
    counter: branding.receiptCounter,
  });

  const numberAlreadyExists = await Receipt.findOne({
    receiptNumber,
  }).session(session);

  if (numberAlreadyExists) return null;

  const pdfPath = await generateReceiptPdf({
    receiptNumber,
    snapshot,
    company,
    branding,
    signatureHash,
  });

  try {
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
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const existing = await findReceiptForTransaction(transaction._id, session);
    if (existing) return existing;

    if (isDuplicateKeyFor(error, "receiptNumber")) return null;

    throw error;
  }
}
