export function serializeReceipt(receipt) {
  if (!receipt) {
    return null;
  }

  const id = serializeId(receipt._id ?? receipt.id);
  const snapshot = receipt.snapshot ?? {};

  return {
    id,
    receiptNumber: receipt.receiptNumber,
    transaction: serializeId(receipt.transaction),
    company: serializeId(receipt.company),
    amount: snapshot.companyAmount ?? snapshot.inputAmount ?? null,
    currency: snapshot.companyCurrency ?? snapshot.inputCurrency ?? null,
    createdAt: receipt.createdAt,
    downloadUrl: id ? `/api/v1/transactions/receipt/${id}` : null,
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
    const id = value._id ?? value.id;

    if (id !== undefined && id !== value) {
      return serializeId(id);
    }
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return value;
}
