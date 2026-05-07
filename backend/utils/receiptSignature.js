import crypto from "crypto";

export function generateReceiptSignature(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
