const ACCOUNT_OPERATION_FIELDS = [
  "company",
  "targetMembership",
  "createdByMembership",
  "createdBy",
  "linkedTransaction",
  "type",
  "status",
  "amount",
  "currency",
  "previousBalance",
  "currentBalance",
  "operationCode",
  "collectorName",
  "collectorPhone",
  "reference",
  "note",
  "confirmedByMembership",
  "confirmedBy",
  "confirmedAt",
  "rejectedAt",
  "reversedAt",
  "reversedBy",
  "reversedReason",
  "createdAt",
  "updatedAt",
];

const ID_FIELDS = new Set([
  "company",
  "targetMembership",
  "createdByMembership",
  "createdBy",
  "linkedTransaction",
  "confirmedByMembership",
  "confirmedBy",
  "reversedBy",
]);

export function serializeAccountOperation(operation) {
  if (!operation) {
    return null;
  }

  const serialized = {
    id: serializeId(operation._id ?? operation.id),
  };

  for (const field of ACCOUNT_OPERATION_FIELDS) {
    serialized[field] = ID_FIELDS.has(field)
      ? serializeId(operation[field])
      : operation[field];
  }

  serialized.ledgerEntries = Array.isArray(operation.ledgerEntries)
    ? operation.ledgerEntries.map((entry) => serializeId(entry))
    : undefined;

  return serialized;
}

export function serializeAccountOperations(operations) {
  return operations.map((operation) => serializeAccountOperation(operation));
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
