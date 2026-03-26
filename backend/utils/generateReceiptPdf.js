import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRcode from "qrcode";

const verificationUrl = `${process.env.BASE_URL}/verify/${receiptNumber}`;
const qrImage = await QRcode.toDataURL(verificationUrl);

export function generateReceiptPdf(receiptData) {
  const fileName = `receipt-${receiptData.receiptNumber}.pdf`;
  const dirPath = path.join("uploads", "receipts");
  const filePath = path.join(dirPath, fileName);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("PAYMENT RECEIPT", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Receipt No: ${receiptData.receiptNumber}`);
  doc.text(`Transaction Code: ${receiptData.transactionCode}`);
  doc.text(`Beneficiary: ${receiptData.beneficiaryName}`);
  doc.text(
    `Amount: ${receiptData.companyAmount} ${receiptData.companyCurrency}`,
  );
  doc.text(`Exchange Rate: ${receiptData.exchangeRate}`);
  doc.text(`Processed At: ${receiptData.processedAt}`);
  doc.moveDown();
  doc.text(`Signature: ${receiptData.signatureHash}`);

  doc.end();

  return filePath;
}
