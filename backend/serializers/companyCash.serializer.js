export function serializeCompanyCashDeposit(deposit) {
  if (!deposit) {
    return null;
  }

  return {
    id: serializeId(deposit._id ?? deposit.id),
    company: serializeId(deposit.company),
    type: deposit.type,
    amount: deposit.amount,
    currency: deposit.currency,
    method: deposit.method,
    reference: deposit.reference,
    note: deposit.note,
    previousBalance: deposit.previousBalance,
    currentBalance: deposit.currentBalance,
    createdBy: serializeId(deposit.createdBy),
    createdAt: deposit.createdAt,
    updatedAt: deposit.updatedAt,
  };
}

function serializeId(value) {
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
