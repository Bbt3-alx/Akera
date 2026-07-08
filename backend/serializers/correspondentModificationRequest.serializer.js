export function serializeCorrespondentModificationRequest(request) {
  if (!request) {
    return null;
  }

  return {
    id: serializeId(request._id ?? request.id),
    targetType: request.targetType,
    targetId: serializeId(request.targetId),
    oldValues: request.oldValues,
    requestedValues: request.requestedValues,
    reason: request.reason,
    decisionReason: request.decisionReason,
    initiatedBy: serializeId(request.initiatedBy),
    initiatedByName: resolveUserName(request.initiatedBy),
    initiatedByMembership: serializeId(request.initiatedByMembership),
    approvedBy: serializeId(request.approvedBy),
    approvedByName: resolveUserName(request.approvedBy),
    approvedByMembership: serializeId(request.approvedByMembership),
    status: request.status,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function serializeCorrespondentModificationRequests(requests) {
  return requests.map((request) =>
    serializeCorrespondentModificationRequest(request),
  );
}

function resolveUserName(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  if (typeof user.name === "string" && user.name.trim()) {
    return user.name.trim();
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return user.email ?? null;
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
