import crypto from "crypto";

// Generate unique transaction code
export function generateTransactionCode(companyCode) {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");

  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `${companyCode}-${date}-${random}`;
}
