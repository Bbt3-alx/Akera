import { Types } from "mongoose";

import CompanyMembership from "../models/CompanyMembership.js";
import RemoteAgentGroup, {
  REMOTE_AGENT_GROUP_PERMISSIONS,
} from "../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../models/RemoteAgentPayout.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";

const DEFAULT_MEMBER_PERMISSIONS = ["remote_payout:view"];
const VALID_GROUP_STATUSES = new Set(["active", "inactive"]);
const VALID_MEMBER_ROLES = new Set(["agent", "supervisor"]);
const VALID_MEMBER_STATUSES = new Set(["active", "inactive"]);
const REMOTE_AGENT_GROUP_MEMBER_POPULATE = {
  path: "members.membership",
  select: "user role status currency",
  populate: {
    path: "user",
    select: "name email",
  },
};

export async function listRemoteAgentGroups({
  companyId,
  filters = {},
  pagination = {},
  role,
}) {
  assertManager(role);

  const filter = {
    company: companyId,
  };
  const status = normalizeOptionalEnumFilter(filters.status, {
    allowed: VALID_GROUP_STATUSES,
    errorCode: "INVALID_REMOTE_AGENT_GROUP_STATUS",
    label: "Group status",
  });
  const search = normalizeOptionalString({
    errorCode: "INVALID_REMOTE_AGENT_GROUP_SEARCH",
    label: "Search",
    maxLength: 100,
    value: filters.search ?? filters.name,
  });

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.name = new RegExp(escapeRegExp(search), "i");
  }

  const { page, limit } = normalizePagination(pagination);
  const [groups, total] = await Promise.all([
    RemoteAgentGroup.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(REMOTE_AGENT_GROUP_MEMBER_POPULATE)
      .lean(),
    RemoteAgentGroup.countDocuments(filter),
  ]);

  return {
    groups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRemoteAgentGroup({ companyId, groupId, role }) {
  assertManager(role);
  const normalizedGroupId = normalizeObjectId(
    groupId,
    "Group ID",
    "INVALID_REMOTE_AGENT_GROUP",
  );
  const group = await RemoteAgentGroup.findOne({
    _id: normalizedGroupId,
    company: companyId,
  })
    .populate(REMOTE_AGENT_GROUP_MEMBER_POPULATE)
    .lean();

  if (!group) {
    throw new ApiError(
      404,
      "Remote agent group not found",
      "REMOTE_AGENT_GROUP_NOT_FOUND",
    );
  }

  return group;
}

export async function createRemoteAgentGroup({
  companyId,
  managerId,
  managerMembershipId,
  payload = {},
  role,
}) {
  assertManager(role);
  const normalized = normalizeCreatePayload(payload);

  return runTransaction(async (session) => {
    const members = await normalizeAndValidateMembers({
      companyId,
      members: normalized.members,
      session,
    });

    const [group] = await RemoteAgentGroup.create(
      [
        {
          company: companyId,
          name: normalized.name,
          currency: "FCFA",
          balance: 0,
          reservedBalance: 0,
          status: "active",
          members,
        },
      ],
      { session },
    );

    return findRemoteAgentGroupForResponse({
      companyId,
      groupId: group._id,
      session,
    });
  });
}

export async function updateRemoteAgentGroup({
  companyId,
  groupId,
  managerId,
  managerMembershipId,
  payload = {},
  role,
}) {
  assertManager(role);
  const normalizedGroupId = normalizeObjectId(
    groupId,
    "Group ID",
    "INVALID_REMOTE_AGENT_GROUP",
  );
  const normalized = normalizeUpdatePayload(payload);

  return runTransaction(async (session) => {
    const group = await RemoteAgentGroup.findOne({
      _id: normalizedGroupId,
      company: companyId,
    }).session(session);

    if (!group) {
      throw new ApiError(
        404,
        "Remote agent group not found",
        "REMOTE_AGENT_GROUP_NOT_FOUND",
      );
    }

    if (normalized.name !== undefined) {
      group.name = normalized.name;
    }

    if (normalized.status !== undefined) {
      if (normalized.status === "inactive" && group.status !== "inactive") {
        if ((group.reservedBalance ?? 0) > 0) {
          throw new ApiError(
            400,
            "Cannot deactivate a group with reserved balance",
            "GROUP_HAS_RESERVED_BALANCE",
          );
        }

        await assertNoPendingPayouts({
          companyId,
          groupId: group._id,
          session,
          errorCode: "GROUP_HAS_PENDING_PAYOUTS",
          message: "Cannot deactivate a group with pending payouts",
        });
      }

      group.status = normalized.status;
    }

    await group.save({ session });

    return findRemoteAgentGroupForResponse({
      companyId,
      groupId: group._id,
      session,
    });
  });
}

export async function addRemoteAgentGroupMember({
  companyId,
  groupId,
  managerId,
  managerMembershipId,
  membershipId,
  payload = {},
  role,
}) {
  assertManager(role);
  const normalizedGroupId = normalizeObjectId(
    groupId,
    "Group ID",
    "INVALID_REMOTE_AGENT_GROUP",
  );
  const normalizedMembershipId = normalizeObjectId(
    membershipId ?? payload.membershipId,
    "Membership ID",
    "INVALID_REMOTE_AGENT_GROUP_MEMBER",
  );
  const normalized = normalizeMemberPayload(payload, { partial: false });

  return runTransaction(async (session) => {
    const group = await RemoteAgentGroup.findOne({
      _id: normalizedGroupId,
      company: companyId,
      status: "active",
    }).session(session);

    if (!group) {
      throw new ApiError(
        404,
        "Active remote agent group not found",
        "REMOTE_AGENT_GROUP_NOT_FOUND",
      );
    }

    await findValidEmployeeMembership({
      companyId,
      membershipId: normalizedMembershipId,
      session,
    });

    const existingMember = findGroupMember(group, normalizedMembershipId);
    const now = new Date();

    if (existingMember?.status === "active") {
      throw new ApiError(
        409,
        "Member already belongs to this group",
        "MEMBER_ALREADY_IN_GROUP",
      );
    }

    if (existingMember) {
      existingMember.role = normalized.role;
      existingMember.permissions = normalized.permissions;
      existingMember.status = "active";
      existingMember.updatedAt = now;
    } else {
      group.members.push({
        membership: normalizedMembershipId,
        role: normalized.role,
        permissions: normalized.permissions,
        status: "active",
        joinedAt: now,
        updatedAt: now,
      });
    }

    await group.save({ session });

    return findRemoteAgentGroupForResponse({
      companyId,
      groupId: group._id,
      session,
    });
  });
}

export async function updateRemoteAgentGroupMember({
  companyId,
  groupId,
  managerId,
  managerMembershipId,
  membershipId,
  payload = {},
  role,
}) {
  assertManager(role);
  const normalizedGroupId = normalizeObjectId(
    groupId,
    "Group ID",
    "INVALID_REMOTE_AGENT_GROUP",
  );
  const normalizedMembershipId = normalizeObjectId(
    membershipId,
    "Membership ID",
    "INVALID_REMOTE_AGENT_GROUP_MEMBER",
  );
  const normalized = normalizeMemberPayload(payload, { partial: true });

  return runTransaction(async (session) => {
    const group = await RemoteAgentGroup.findOne({
      _id: normalizedGroupId,
      company: companyId,
    }).session(session);

    if (!group) {
      throw new ApiError(
        404,
        "Remote agent group not found",
        "REMOTE_AGENT_GROUP_NOT_FOUND",
      );
    }

    const member = findGroupMember(group, normalizedMembershipId);

    if (!member) {
      throw new ApiError(
        404,
        "Remote agent group member not found",
        "REMOTE_AGENT_GROUP_MEMBER_NOT_FOUND",
      );
    }

    if (
      wouldLeaveNoActivePayMember(group, normalizedMembershipId, normalized)
    ) {
      await assertNoPendingPayouts({
        companyId,
        groupId: group._id,
        session,
        errorCode: "GROUP_PENDING_PAYOUTS_REQUIRE_PAY_AGENT",
        message: "Pending payouts require at least one active pay-enabled member",
      });
    }

    if (normalized.role !== undefined) {
      member.role = normalized.role;
    }

    if (normalized.permissions !== undefined) {
      member.permissions = normalized.permissions;
    }

    if (normalized.status !== undefined) {
      member.status = normalized.status;
    }

    member.updatedAt = new Date();
    await group.save({ session });

    return findRemoteAgentGroupForResponse({
      companyId,
      groupId: group._id,
      session,
    });
  });
}

async function findRemoteAgentGroupForResponse({ companyId, groupId, session }) {
  return RemoteAgentGroup.findOne({
    _id: groupId,
    company: companyId,
  })
    .populate(REMOTE_AGENT_GROUP_MEMBER_POPULATE)
    .session(session)
    .lean();
}

function normalizeCreatePayload(payload) {
  return {
    name: normalizeGroupName(payload.name),
    members: normalizeInitialMembers(payload.members),
  };
}

function normalizeUpdatePayload(payload) {
  const normalized = {};

  if (payload.name !== undefined) {
    normalized.name = normalizeGroupName(payload.name);
  }

  if (payload.status !== undefined) {
    normalized.status = normalizeOptionalStatus(payload.status, {
      allowed: VALID_GROUP_STATUSES,
      errorCode: "INVALID_REMOTE_AGENT_GROUP_STATUS",
      label: "Group status",
    });
  }

  return normalized;
}

function normalizeInitialMembers(members) {
  if (members === undefined || members === null) {
    return [];
  }

  if (!Array.isArray(members)) {
    throw new ApiError(
      400,
      "Members must be an array",
      "INVALID_REMOTE_AGENT_GROUP_MEMBERS",
    );
  }

  const unique = new Map();

  for (const member of members) {
    const membershipId = normalizeObjectId(
      member?.membershipId,
      "Membership ID",
      "INVALID_REMOTE_AGENT_GROUP_MEMBER",
    );

    if (!unique.has(membershipId.toString())) {
      unique.set(membershipId.toString(), {
        membershipId,
        ...normalizeMemberPayload(member, { partial: false }),
      });
    }
  }

  return [...unique.values()];
}

function normalizeMemberPayload(payload = {}, { partial }) {
  const normalized = {};

  if (!partial || payload.role !== undefined) {
    normalized.role = normalizeOptionalStatus(payload.role ?? "agent", {
      allowed: VALID_MEMBER_ROLES,
      errorCode: "INVALID_REMOTE_AGENT_GROUP_MEMBER_ROLE",
      label: "Member role",
    });
  }

  if (!partial || payload.permissions !== undefined) {
    normalized.permissions = normalizePermissions(payload.permissions);
  }

  if (partial && payload.status !== undefined) {
    normalized.status = normalizeOptionalStatus(payload.status, {
      allowed: VALID_MEMBER_STATUSES,
      errorCode: "INVALID_REMOTE_AGENT_GROUP_MEMBER_STATUS",
      label: "Member status",
    });
  }

  return normalized;
}

function normalizePermissions(value) {
  const permissions = value === undefined || value === null
    ? DEFAULT_MEMBER_PERMISSIONS
    : value;

  if (!Array.isArray(permissions)) {
    throw new ApiError(
      400,
      "Permissions must be an array",
      "INVALID_REMOTE_AGENT_GROUP_PERMISSION",
    );
  }

  const unique = [];

  for (const permission of permissions) {
    if (!REMOTE_AGENT_GROUP_PERMISSIONS.includes(permission)) {
      throw new ApiError(
        400,
        "Invalid remote agent group permission",
        "INVALID_REMOTE_AGENT_GROUP_PERMISSION",
      );
    }

    if (!unique.includes(permission)) {
      unique.push(permission);
    }
  }

  return unique;
}

async function normalizeAndValidateMembers({ companyId, members, session }) {
  if (members.length === 0) {
    return [];
  }

  const membershipIds = members.map((member) => member.membershipId);
  const memberships = await CompanyMembership.find({
    _id: { $in: membershipIds },
    company: companyId,
  })
    .session(session)
    .lean();
  const membershipById = new Map(
    memberships.map((membership) => [
      membership._id.toString(),
      membership,
    ]),
  );
  const now = new Date();

  return members.map((member) => {
    const membership = membershipById.get(member.membershipId.toString());

    validateEmployeeMembership({
      companyId,
      membership,
    });

    return {
      membership: member.membershipId,
      role: member.role,
      permissions: member.permissions,
      status: "active",
      joinedAt: now,
      updatedAt: now,
    };
  });
}

async function findValidEmployeeMembership({ companyId, membershipId, session }) {
  const membership = await CompanyMembership.findOne({
    _id: membershipId,
    company: companyId,
  })
    .session(session)
    .lean();

  validateEmployeeMembership({ companyId, membership });

  return membership;
}

function validateEmployeeMembership({ companyId, membership }) {
  if (!membership || !idsEqual(membership.company, companyId)) {
    throw new ApiError(
      404,
      "Employee membership not found",
      "REMOTE_AGENT_GROUP_MEMBER_NOT_FOUND",
    );
  }

  if (membership.role !== "employee") {
    throw new ApiError(
      400,
      "Remote agent group members must be employees",
      "REMOTE_AGENT_GROUP_EMPLOYEE_REQUIRED",
    );
  }

  if (membership.status !== "active") {
    throw new ApiError(
      400,
      "Remote agent group members must be active",
      "REMOTE_AGENT_GROUP_MEMBER_ACTIVE_REQUIRED",
    );
  }

  if (membership.currency !== "FCFA") {
    throw new ApiError(
      400,
      "Remote agent group members must use FCFA",
      "REMOTE_AGENT_GROUP_MEMBER_FCFA_REQUIRED",
    );
  }
}

async function assertNoPendingPayouts({
  companyId,
  errorCode,
  groupId,
  message,
  session,
}) {
  const pendingCount = await RemoteAgentPayout.countDocuments({
    company: companyId,
    assignedAgentGroup: groupId,
    status: "pending",
  }).session(session);

  if (pendingCount > 0) {
    throw new ApiError(400, message, errorCode);
  }
}

function wouldLeaveNoActivePayMember(group, targetMembershipId, updates) {
  return group.members.filter((member) => {
    const isTarget = idsEqual(member.membership, targetMembershipId);
    const status = isTarget && updates.status !== undefined
      ? updates.status
      : member.status;
    const permissions = isTarget && updates.permissions !== undefined
      ? updates.permissions
      : member.permissions;

    return status === "active" &&
      Array.isArray(permissions) &&
      permissions.includes("remote_payout:pay");
  }).length === 0;
}

function findGroupMember(group, membershipId) {
  return group.members?.find((member) => idsEqual(member.membership, membershipId));
}

function normalizeGroupName(value) {
  const name = normalizeRequiredString(
    value,
    "Group name is required",
    "INVALID_REMOTE_AGENT_GROUP_NAME",
  );

  if (name.length < 2) {
    throw new ApiError(
      400,
      "Group name must be at least 2 characters",
      "INVALID_REMOTE_AGENT_GROUP_NAME",
    );
  }

  if (name.length > 100) {
    throw new ApiError(
      400,
      "Group name must be 100 characters or fewer",
      "INVALID_REMOTE_AGENT_GROUP_NAME",
    );
  }

  return name;
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

function normalizeRequiredString(value, message, errorCode) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(400, message, errorCode);
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    throw new ApiError(400, message, errorCode);
  }

  return trimmed;
}

function normalizeOptionalString({ errorCode, label, maxLength, value }) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(400, `${label} must be a string`, errorCode);
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${label} must be ${maxLength} characters or fewer`,
      errorCode,
    );
  }

  return trimmed;
}

function normalizeOptionalStatus(value, { allowed, errorCode, label }) {
  const normalized = normalizeRequiredString(
    value,
    `${label} is required`,
    errorCode,
  );

  if (!allowed.has(normalized)) {
    throw new ApiError(400, `${label} is invalid`, errorCode);
  }

  return normalized;
}

function normalizeOptionalEnumFilter(value, { allowed, errorCode, label }) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(400, `${label} must be a string`, errorCode);
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return undefined;
  }

  if (!allowed.has(normalized)) {
    throw new ApiError(400, `${label} is invalid`, errorCode);
  }

  return normalized;
}

function normalizePagination(pagination) {
  return {
    page: normalizePositiveInteger(pagination.page, 1),
    limit: normalizePositiveInteger(pagination.limit, 20),
  };
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertManager(role) {
  if (role !== "manager") {
    throw new ApiError(
      403,
      "Only managers can manage remote agent groups",
      "REMOTE_AGENT_GROUP_MANAGER_REQUIRED",
    );
  }
}

function idsEqual(left, right) {
  return left?.toString?.() === right?.toString?.();
}
