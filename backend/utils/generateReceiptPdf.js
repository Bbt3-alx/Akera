import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRcode from "qrcode";

export async function generateReceiptPdf({
  receiptNumber,
  snapshot,
  company,
  branding,
  signatureHash,
}
) {
  const receiptsDir = path.join(process.cwd(), "uploads", "receipts");

  if(!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, {recursive: true});
  }

  const fileName = `receipt-${receiptNumber}.pdf`;
  const filePath = path.join(receiptsDir, fileName);

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // QR verification
  const verificationUrl = `${process.env.BASE_URL}/api/v1/receipts/verify/${receiptNumber}`;
  const qrImage = await QRcode.toDataURL(verificationUrl);

  // Header with company branding
  if(branding?.logoUrl){
    try {
      doc.image(branding.logoUrl, 450, 20, {width: 100})
    } catch (_) {}
  }

  doc
    .fillColor(branding?.primaryColor || "#000")
    .fontSize(22)
    .text(company.name || "Company", {align: "center"});

  doc.moveDown();

  doc
    .fontSize(18)
    .fillColor("#000")
    .text("PAYMENT RECEIPT", { align: "center"});

  doc.moveDown(2);

  // Receipt details
  doc.fontSize(12);

  doc.text(`Receipt Number: ${receiptNumber}`);
  doc.text(`Transaction Code: ${snapshot.transactionCode}`);
  doc.text(`Beneficiary: ${snapshot.beneficiaryName}`);

  doc.moveDown();

  doc.text(
    `Amount: ${snapshot.companyAmount} ${snapshot.companyCurrency}`,
  );
  
  doc.text(`Exchange Rate: ${snapshot.exchangeRate}`);

  doc.text(`Processed At: ${new Date(snapshot.processedAt).toLocaleString()}`);

  doc.moveDown();

  // QR code
  doc.image(qrImage, {
    fit: [100, 100],
    align: "center",
  });

  doc.moveDown(8);

  // Signature
  doc.fontSize(10).text(`Signature Hash: ${signatureHash}`);

  doc.moveDown(8);

  // Footer
  doc
    .fontSize(10)
    .fillColor("#666")
    .text(
      branding?.footerText || "Generated securely by Akera System",
      {align: "center"},
    );

  doc.end();

  return new Promise((resolve) => {
    stream.on("finish", () => {
      resolve(filePath)
    })
  });
}
