import CompanyBranding from "../models/CompanyBranding.js";
import Receipt from "../models/Receipt.js";
import { generateReceiptPdf } from "../utils/generateReceiptPdf.js";
import { generateReceiptSignature } from "../utils/receiptSignature.js";

export async function generateReceipt({
  transaction,
  companyId,
  managerId,
  session,
}) {
  const existing = await Receipt.findOne({
    transaction: transaction._id,
  }).session(session);

  if (existing) return existing;

  const snapshot = {
    transactionCode: transaction.transactionCode,
    beneficiaryName: transaction.beneficiaryName,
    inputAmount: transaction.inputAmount,
    inputCurrency: transaction.inputCurrency,
    companyAmount: transaction.companyAmount,
    companyCurrency: transaction.companyCurrency,
    exchangeRate: transaction.exchangeRate,
    processedAt: transaction.processedAt,
  };

  const signature = generateReceiptSignature(snapshot);

  const branding = await CompanyBranding.findOneAndUpdate(
    { company: companyId },
    { $inc: { receiptCounter } },
    { new: true, session },
  );

  const receiptNumber = `${branding.receiptPrefix}-${branding.receiptCounter
    .toString()
    .padStart(6, "0")}`;

  const pdfPath = generateReceiptPdf({
    receiptNumber,
    ...snapshot,
    signatureHash: signature,
  });

  const [receipt] = await Receipt.create(
    [
      {
        transaction: transaction._id,
        company: companyId,
        receiptNumber,
        snapshot,
        signatureHash: signature,
        pdfPath,
        generatedBy: managerId,
      },
    ],
    { session },
  );

  return receipt;
}
