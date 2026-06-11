const TRANSACTION_FIELDS = [
  "_id",
  "id",
  "transactionCode",
  "company",
  "membership",
  "inputAmount",
  "inputCurrency",
  "partnerAmount",
  "partnerCurrency",
  "companyAmount",
  "companyCurrency",
  "exchangeRate",
  "beneficiaryName",
  "description",
  "status",
  "idempotencyKey",
  "createdBy",
  "processedBy",
  "processedAt",
  "canceledAt",
  "cancelReason",
  "canceledBy",
  "reversedAt",
  "reversedBy",
  "reversedReason",
  "archived",
  "createdAt",
  "updatedAt",
];

const ID_FIELDS = new Set([
  "_id",
  "id",
  "company",
  "membership",
  "createdBy",
  "processedBy",
  "canceledBy",
  "reversedBy",
]);

export function serializeTransaction(transaction) {
  if (!transaction) {
    return null;
  }

  const serialized = {};

  for (const field of TRANSACTION_FIELDS) {
    serialized[field] = ID_FIELDS.has(field)
      ? serializeId(transaction[field])
      : transaction[field];
  }

  if (!serialized.id) {
    serialized.id = serialized._id;
  }

  serialized.partner = serializePartner(transaction.membership);

  return serialized;
}

export function serializeTransactions(transactions) {
  return transactions.map((transaction) => serializeTransaction(transaction));
}

function serializePartner(membership) {
  if (!isObject(membership) || !isObject(membership.user)) {
    return null;
  }

  const user = membership.user;
  const email = user.email;
  const name = getPartnerName(user);

  return {
    membershipId: serializeId(membership),
    userId: serializeId(user),
    name,
    email,
  };
}

function getPartnerName(user) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    fullName.trim() ||
    user.name?.trim() ||
    user.email ||
    "Unknown partner"
  );
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (isObject(value)) {
    const id = value._id ?? value.id;
    return id === undefined ? value : serializeId(id);
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return value;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}
