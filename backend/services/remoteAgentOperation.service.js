import { Types } from "mongoose";

import AccountOperation from "../models/AccountOperation.js";
import RemoteAgentGroup from "../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../models/RemoteAgentPayout.js";
import { ApiError } from "../middlewares/errorHandler.js";

const REMOTE_AGENT_WORKFLOW = "remote_agent_payout";
const VIEW_PERMISSION = "remote_payout:view";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const OPERATION_TYPES = new Set([
  "remote_agent_deposit",
  "remote_payout_created",
  "remote_payout_paid",
  "remote_payout_canceled",
]);

const ACTOR_MEMBERSHIP_POPULATE = (path) => ({
  path,
  select: "user role status",
  populate: {
    path: "user",
    select: "firstName lastName name email",
  },
});

const ACTOR_USER_POPULATE = (path) => ({
  path,
  select: "firstName lastName name email",
});

export async function listRemoteAgentOperations({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  if (role !== "manager" && role !== "employee") {
    throw new ApiError(
      403,
      "Access denied",
      "REMOTE_AGENT_OPERATION_ACCESS_DENIED",
    );
  }

  const normalized = normalizeQuery(query);
  const companyObjectId = normalizeObjectId(
    companyId,
    "Company ID",
    "INVALID_COMPANY_ID",
  );
  const visibleGroups = await listVisibleGroups({
    companyId: companyObjectId,
    membershipId,
    role,
  });

  if (role === "employee" && visibleGroups.length === 0) {
    return emptyResult(normalized);
  }

  const groupMap = new Map(
    visibleGroups.map((group) => [serializeId(group._id ?? group.id), group]),
  );
  const groupIds =
    role === "employee"
      ? visibleGroups.map((group) => group._id ?? group.id)
      : undefined;
  const [depositOperations, payouts] = await Promise.all([
    listDepositOperations({ companyId: companyObjectId, groupIds }),
    listPayouts({ companyId: companyObjectId, groupIds }),
  ]);
  const operations = [
    ...depositOperations.map((operation) =>
      toDepositOperationRow(operation, groupMap),
    ),
    ...payouts.flatMap((payout) => toPayoutOperationRows(payout, groupMap)),
  ]
    .filter((operation) => matchesFilters(operation, normalized))
    .sort(compareOperations);
  const total = operations.length;
  const start = (normalized.page - 1) * normalized.limit;

  return {
    operations: operations.slice(start, start + normalized.limit),
    pagination: {
      page: normalized.page,
      limit: normalized.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / normalized.limit),
    },
  };
}

async function listVisibleGroups({ companyId, membershipId, role }) {
  if (role === "manager") {
    return RemoteAgentGroup.find({ company: companyId })
      .select("_id name status")
      .lean();
  }

  const membershipObjectId = normalizeObjectId(
    membershipId,
    "Membership ID",
    "INVALID_MEMBERSHIP_ID",
  );

  return RemoteAgentGroup.find({
    company: companyId,
    status: "active",
    members: {
      $elemMatch: {
        membership: membershipObjectId,
        status: "active",
        permissions: VIEW_PERMISSION,
      },
    },
  })
    .select("_id name status")
    .lean();
}

function listDepositOperations({ companyId, groupIds }) {
  const filter = {
    company: companyId,
    workflow: REMOTE_AGENT_WORKFLOW,
    type: "deposit",
  };

  if (groupIds) {
    filter.linkedRemoteAgentGroup = { $in: groupIds };
  }

  return AccountOperation.find(filter)
    .sort({ createdAt: -1 })
    .populate(ACTOR_MEMBERSHIP_POPULATE("depositedByMembership"))
    .populate(ACTOR_MEMBERSHIP_POPULATE("performedByMembership"))
    .lean();
}

function listPayouts({ companyId, groupIds }) {
  const filter = {
    company: companyId,
  };

  if (groupIds) {
    filter.assignedAgentGroup = { $in: groupIds };
  }

  return RemoteAgentPayout.find(filter)
    .sort({ createdAt: -1 })
    .populate(ACTOR_MEMBERSHIP_POPULATE("createdByMembership"))
    .populate(ACTOR_MEMBERSHIP_POPULATE("paidByMembership"))
    .populate(ACTOR_MEMBERSHIP_POPULATE("canceledByMembership"))
    .populate(ACTOR_USER_POPULATE("createdBy"))
    .populate(ACTOR_USER_POPULATE("canceledBy"))
    .lean();
}

function toDepositOperationRow(operation, groupMap) {
  const group = getGroup(operation.linkedRemoteAgentGroup, groupMap);
  const actor = buildActor(
    operation.depositedByMembership ?? operation.performedByMembership,
  );

  return {
    id: `remote_agent_deposit:${serializeId(operation._id ?? operation.id)}`,
    date: serializeDate(operation.createdAt),
    type: "remote_agent_deposit",
    reference: operation.reference || operation.operationCode,
    group,
    groupName: group.name,
    actor,
    actorName: actor.name,
    actorEmail: actor.email,
    beneficiaryName: null,
    amount: toNumber(operation.amount),
    currency: operation.currency,
    status: operation.status,
  };
}

function toPayoutOperationRows(payout, groupMap) {
  const group = getGroup(payout.assignedAgentGroup, groupMap);
  const rows = [
    {
      id: `remote_payout_created:${serializeId(payout._id ?? payout.id)}`,
      date: serializeDate(payout.createdAt),
      type: "remote_payout_created",
      reference: payout.payoutCode,
      group,
      groupName: group.name,
      actor: buildActor(payout.createdByMembership, payout.createdBy),
      beneficiaryName: payout.beneficiaryName,
      amount: toNumber(payout.amount),
      currency: payout.currency,
      status: payout.status,
    },
  ];

  if (payout.paidAt) {
    rows.push({
      id: `remote_payout_paid:${serializeId(payout._id ?? payout.id)}`,
      date: serializeDate(payout.paidAt),
      type: "remote_payout_paid",
      reference: payout.payoutCode,
      group,
      groupName: group.name,
      actor: buildActor(payout.paidByMembership),
      beneficiaryName: payout.beneficiaryName,
      amount: toNumber(payout.amount),
      currency: payout.currency,
      status: "paid",
    });
  }

  if (payout.canceledAt) {
    rows.push({
      id: `remote_payout_canceled:${serializeId(payout._id ?? payout.id)}`,
      date: serializeDate(payout.canceledAt),
      type: "remote_payout_canceled",
      reference: payout.payoutCode,
      group,
      groupName: group.name,
      actor: buildActor(payout.canceledByMembership, payout.canceledBy),
      beneficiaryName: payout.beneficiaryName,
      amount: toNumber(payout.amount),
      currency: payout.currency,
      status: "canceled",
    });
  }

  return rows.map((row) => ({
    ...row,
    actorName: row.actor.name,
    actorEmail: row.actor.email,
  }));
}

function buildActor(membership, fallbackUser) {
  const membershipId = isObject(membership)
    ? membership._id ?? membership.id
    : membership;
  const user = isObject(membership?.user) ? membership.user : fallbackUser;

  return {
    membershipId: serializeId(membershipId) ?? null,
    name: resolveUserName(user),
    email: isObject(user) ? user.email ?? null : null,
    role: isObject(membership) ? membership.role ?? null : null,
  };
}

function getGroup(groupId, groupMap) {
  const id = serializeId(groupId);
  const group = groupMap.get(id);

  return {
    id,
    name: group?.name ?? "Groupe inconnu",
  };
}

function matchesFilters(operation, { search, status, type }) {
  if (type && operation.type !== type) {
    return false;
  }

  if (status && operation.status !== status) {
    return false;
  }

  if (!search) {
    return true;
  }

  const haystack = [
    operation.reference,
    operation.groupName,
    operation.actorName,
    operation.actorEmail,
    operation.beneficiaryName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function compareOperations(left, right) {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

function normalizeQuery(query) {
  const type = normalizeOptionalString(query.type);

  if (type && !OPERATION_TYPES.has(type)) {
    throw new ApiError(
      400,
      "Invalid remote agent operation type",
      "INVALID_REMOTE_AGENT_OPERATION_TYPE",
    );
  }

  return {
    page: normalizePositiveInteger(query.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER),
    limit: normalizePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT),
    search: normalizeOptionalString(query.search)?.toLowerCase(),
    status: normalizeOptionalString(query.status),
    type,
  };
}

function normalizePositiveInteger(value, fallback, max) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const trimmed = String(value).trim();

  return trimmed || undefined;
}

function emptyResult({ limit, page }) {
  return {
    operations: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
}

function normalizeObjectId(value, label, errorCode) {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${label} is invalid`, errorCode);
  }

  return new Types.ObjectId(value);
}

function resolveUserName(user) {
  if (!isObject(user)) {
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

  return typeof user.email === "string" && user.email.trim()
    ? user.email.trim()
    : null;
}

function serializeDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return null;
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

function isObject(value) {
  return typeof value === "object" && value !== null;
}
