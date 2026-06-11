import Receipt from '../models/Receipt.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

function generateSignature(snapshot) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");
}

export const verifyReceipt = async (req, res) => {
    const {receiptNumber} = req.params;

    const receipt = await Receipt.findOne({
        receiptNumber,
    }).populate("company")

    if (!receipt) {
        return res.status(404).json({
            success: false,
            valid: false,
            message: "Receipt not found",
        })
    }

    const recalculatedHash = generateSignature(receipt.snapshot);

    const isValid = recalculatedHash === receipt.signatureHash;

    return res.status(200).json({
        success: true,
        valid: isValid,
        receiptNumber: receipt.receiptNumber,
        company: receipt.company.name,
        issuedAt: receipt.createdAt,
        snapshot: {
            transactionCode: receipt.snapshot.transactionCode,
            beneficiaryName: receipt.snapshot.beneficiaryName,
            inputAmount: receipt.snapshot.inputAmount,
            inputCurrency: receipt.snapshot.inputCurrency,
            companyAmount: receipt.snapshot.companyAmount,
            companyCurrency: receipt.snapshot.companyCurrency,
            processedAt: receipt.snapshot.processedAt,
        }
    })
}

export const downloadReceipt = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  const receipt = await Receipt.findOne({
    _id: req.params.id,
    company: req.context.companyId,
  });

  if (!receipt) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  res.download(receipt.pdfPath);
};
