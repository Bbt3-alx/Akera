import crypto from "crypto";

const buildCompanyPrefix = (name) => {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return (normalized.slice(0, 3) || "CMP").padEnd(3, "X");
};

export function generateCompanyCode(name) {
  const prefix = buildCompanyPrefix(name);
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `${prefix}-${date}-${random}`;
}
