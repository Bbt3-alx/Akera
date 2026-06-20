const REMOTE_AGENT_GROUP_FIELDS = [
  "company",
  "name",
  "currency",
  "balance",
  "reservedBalance",
  "status",
  "createdAt",
  "updatedAt",
];

const ID_FIELDS = new Set(["company"]);

export function serializeRemoteAgentGroup(group) {
  if (!group) {
    return null;
  }

  const balance = toNumber(group.balance);
  const reservedBalance = toNumber(group.reservedBalance);
  const serialized = {
    id: serializeId(group._id ?? group.id),
  };

  for (const field of REMOTE_AGENT_GROUP_FIELDS) {
    serialized[field] = ID_FIELDS.has(field)
      ? serializeId(group[field])
      : group[field];
  }

  serialized.balance = balance;
  serialized.reservedBalance = reservedBalance;
  serialized.availableBalance = balance - reservedBalance;
  serialized.members = Array.isArray(group.members)
    ? group.members.map((member) => serializeMember(member))
    : [];

  return serialized;
}

export function serializeRemoteAgentGroups(groups) {
  return groups.map((group) => serializeRemoteAgentGroup(group));
}

function serializeMember(member) {
  return {
    membership: serializeId(member.membership),
    user: serializeUser(member.membership?.user ?? member.user),
    role: member.role,
    permissions: Array.isArray(member.permissions)
      ? [...member.permissions]
      : [],
    status: member.status,
    joinedAt: member.joinedAt,
    updatedAt: member.updatedAt,
  };
}

function serializeUser(user) {
  if (!user || typeof user !== "object") {
    return user ? { id: serializeId(user) } : undefined;
  }

  return {
    id: serializeId(user._id ?? user.id),
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.name ||
      user.email,
    email: user.email,
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

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
