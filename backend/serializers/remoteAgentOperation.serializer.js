export function serializeRemoteAgentOperation(operation) {
  if (!operation) {
    return null;
  }

  const actor = serializeActor(operation.actor);
  const group = serializeGroup(operation.group);

  return {
    id: operation.id,
    date: operation.date,
    type: operation.type,
    reference: operation.reference,
    group,
    groupName: operation.groupName ?? group?.name ?? null,
    actor,
    actorName: operation.actorName ?? actor?.name ?? null,
    actorEmail: operation.actorEmail ?? actor?.email ?? null,
    beneficiaryName: operation.beneficiaryName ?? null,
    amount: operation.amount,
    currency: operation.currency,
    status: operation.status,
  };
}

export function serializeRemoteAgentOperations(operations) {
  return operations
    .map((operation) => serializeRemoteAgentOperation(operation))
    .filter(Boolean);
}

function serializeActor(actor) {
  if (!actor || typeof actor !== "object") {
    return {
      membershipId: null,
      name: null,
      email: null,
      role: null,
    };
  }

  return {
    membershipId: serializeId(actor.membershipId),
    name: actor.name ?? null,
    email: actor.email ?? null,
    role: actor.role ?? null,
  };
}

function serializeGroup(group) {
  if (!group || typeof group !== "object") {
    return {
      id: null,
      name: null,
    };
  }

  return {
    id: serializeId(group.id),
    name: group.name ?? null,
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
