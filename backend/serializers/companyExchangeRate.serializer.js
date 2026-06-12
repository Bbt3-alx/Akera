export function serializeCompanyExchangeRate(exchangeRate) {
  if (!exchangeRate) {
    return null;
  }

  return {
    id: serializeId(exchangeRate._id ?? exchangeRate.id),
    company: serializeId(exchangeRate.company),
    rate: exchangeRate.rate,
    from: exchangeRate.from,
    to: exchangeRate.to,
    setBy: serializeId(exchangeRate.setBy),
    createdAt: exchangeRate.createdAt,
    updatedAt: exchangeRate.updatedAt,
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
