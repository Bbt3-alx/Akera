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
  const user = serializeUser(member.membership?.user ?? member.user);

  return {
    membership: serializeId(member.membership),
    agentName: user?.name ?? null,
    agentEmail: user?.email ?? null,
    user,
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
    return user
      ? { id: serializeId(user), name: null, email: null }
      : undefined;
  }

  const name = resolveUserName(user);

  return {
    id: serializeId(user._id ?? user.id),
    name,
    email: user.email,
  };
}

function resolveUserName(user) {
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

  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  return null;
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
