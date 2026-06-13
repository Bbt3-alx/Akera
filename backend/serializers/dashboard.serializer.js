import { serializeTransaction } from "./transaction.serializer.js";

export function serializeDashboardTransaction(transaction) {
  const serialized = serializeTransaction(transaction);

  if (!serialized) {
    return null;
  }

  return {
    id: serialized.id,
    transactionCode: serialized.transactionCode,
    status: serialized.status,
    inputAmount: serialized.inputAmount,
    inputCurrency: serialized.inputCurrency,
    companyAmount: serialized.companyAmount,
    companyCurrency: serialized.companyCurrency,
    beneficiaryName: serialized.beneficiaryName,
    partner: serialized.partner,
    createdAt: serialized.createdAt,
    processedAt: serialized.processedAt ?? null,
  };
}

export function serializeDashboardTransactions(transactions) {
  return transactions
    .map((transaction) => serializeDashboardTransaction(transaction))
    .filter(Boolean);
}

export function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value === "object") {
    return serializeId(value._id ?? value.id);
  }

  return value.toString();
}
