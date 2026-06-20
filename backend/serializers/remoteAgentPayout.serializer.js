const REMOTE_AGENT_PAYOUT_FIELDS = [
  "company",
  "payoutCode",
  "assignedAgentGroup",
  "createdByMembership",
  "createdBy",
  "amount",
  "currency",
  "beneficiaryName",
  "beneficiaryPhone",
  "note",
  "status",
  "beneficiaryCodeLast4",
  "accountOperation",
  "paidBy",
  "paidByMembership",
  "paidAt",
  "canceledBy",
  "canceledByMembership",
  "canceledAt",
  "cancelReason",
  "createdAt",
  "updatedAt",
];

const ID_FIELDS = new Set([
  "company",
  "assignedAgentGroup",
  "createdByMembership",
  "createdBy",
  "accountOperation",
  "paidBy",
  "paidByMembership",
  "canceledBy",
  "canceledByMembership",
]);

export function serializeRemoteAgentPayout(payout) {
  if (!payout) {
    return null;
  }

  const serialized = {
    id: serializeId(payout._id ?? payout.id),
  };

  for (const field of REMOTE_AGENT_PAYOUT_FIELDS) {
    serialized[field] = ID_FIELDS.has(field)
      ? serializeId(payout[field])
      : payout[field];
  }

  return serialized;
}

export function serializeRemoteAgentPayouts(payouts) {
  return payouts.map((payout) => serializeRemoteAgentPayout(payout));
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
