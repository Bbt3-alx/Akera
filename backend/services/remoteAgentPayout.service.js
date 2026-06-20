import crypto from "node:crypto";
import { Types } from "mongoose";

import { ACCOUNTS } from "../constants/accounts.js";
import AccountOperation from "../models/AccountOperation.js";
import RemoteAgentGroup from "../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../models/RemoteAgentPayout.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_DEPOSIT_METHODS = new Set(["cash", "bank", "mobile_money", "other"]);
const INVALID_OR_EXPIRED_PAYOUT_CODE_MESSAGE = "Invalid or expired payout code";
const GROUP_PERMISSIONS = {
  VIEW: "remote_payout:view",
  DEPOSIT: "remote_payout:deposit",
  PAY: "remote_payout:pay",
};

export async function createRemoteAgentDeposit({
  companyId,
  groupId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertEmployee(role);
  const targetGroupId = normalizeObjectId(
    groupId,
    "Agent group ID",
    "INVALID_AGENT_GROUP",
  );
  const normalized = normalizeDepositPayload(payload);

  return runTransaction(async (session) => {
    const existing = await AccountOperation.findOne({
      company: companyId,
      createdBy: userId,
      idempotencyKey: normalized.idempotencyKey,
    })
      .session(session)
      .lean();

    if (existing) {
      assertSameIdempotencyPayload(existing, normalized.idempotencyPayload);
      return existing;
    }

    await findActiveGroupWithPermission({
      companyId,
      groupId: targetGroupId,
      membershipId,
      permission: GROUP_PERMISSIONS.DEPOSIT,
      session,
      errorCode: "REMOTE_PAYOUT_DEPOSIT_PERMISSION_REQUIRED",
      message: "Deposit permission is required for this remote agent group",
    });

    const updatedGroup = await RemoteAgentGroup.findOneAndUpdate(
      {
        _id: targetGroupId,
        company: companyId,
        status: "active",
        currency: "FCFA",
      },
      { $inc: { balance: normalized.amount } },
      { new: true, session },
    );

    if (!updatedGroup) {
      throw new ApiError(
        404,
        "Remote agent group not found",
        "REMOTE_AGENT_GROUP_NOT_FOUND",
      );
    }

    const currentBalance = updatedGroup.balance ?? 0;
    const previousBalance = currentBalance - normalized.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: membershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedRemoteAgentGroup: targetGroupId,
          performedByMembership: membershipId,
          depositedByMembership: membershipId,
          workflow: "remote_agent_payout",
          type: "deposit",
          status: "completed",
          amount: normalized.amount,
          currency: normalized.currency,
          previousBalance,
          currentBalance,
          operationCode: generateAccountOperationCode(),
          idempotencyKey: normalized.idempotencyKey,
          idempotencyPayload: normalized.idempotencyPayload,
          reference: normalized.reference,
          note: normalized.note,
        },
      ],
      { session },
    );

    const ledgerEntries = await writeJournalEntries({
      accountOperationId: operation._id,
      companyId,
      userId,
      session,
      entries: [
        {
          accountCode: ACCOUNTS.CASH_HELD_BY_AGENT,
          currency: normalized.currency,
          debit: normalized.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.AGENT_BALANCE,
          currency: normalized.currency,
          debit: 0,
          credit: normalized.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    return operation;
  });
}

export async function createRemoteAgentPayout({
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertManager(role, "Only managers can create remote agent payouts");
  const normalized = normalizePayoutPayload(payload);

  return runTransaction(async (session) => {
    const existing = await RemoteAgentPayout.findOne({
      company: companyId,
      createdBy: userId,
      idempotencyKey: normalized.idempotencyKey,
    })
      .session(session)
      .lean();

    if (existing) {
      assertSameIdempotencyPayload(existing, normalized.idempotencyPayload);
      return { payout: existing, beneficiaryCode: undefined };
    }

    const reservedGroup = await RemoteAgentGroup.findOneAndUpdate(
      {
        _id: normalized.assignedAgentGroupId,
        company: companyId,
        status: "active",
        currency: "FCFA",
        $expr: {
          $gte: [
            {
              $subtract: [
                "$balance",
                { $ifNull: ["$reservedBalance", 0] },
              ],
            },
            normalized.amount,
          ],
        },
      },
      { $inc: { reservedBalance: normalized.amount } },
      { new: true, session },
    );

    if (!reservedGroup) {
      throw new ApiError(
        400,
        "Insufficient remote agent group available balance",
        "INSUFFICIENT_AGENT_GROUP_AVAILABLE_BALANCE",
      );
    }

    const beneficiaryCode = generateBeneficiaryCode();
    const [payout] = await RemoteAgentPayout.create(
      [
        {
          company: companyId,
          payoutCode: generatePayoutCode(),
          assignedAgentGroup: normalized.assignedAgentGroupId,
          createdByMembership: membershipId,
          createdBy: userId,
          amount: normalized.amount,
          currency: normalized.currency,
          beneficiaryName: normalized.beneficiaryName,
          beneficiaryPhone: normalized.beneficiaryPhone,
          note: normalized.note,
          status: "pending",
          beneficiaryCodeHash: hashBeneficiaryCode(beneficiaryCode),
          beneficiaryCodeLast4: beneficiaryCode.slice(-4),
          idempotencyKey: normalized.idempotencyKey,
          idempotencyPayload: normalized.idempotencyPayload,
        },
      ],
      { session },
    );

    return { payout, beneficiaryCode };
  });
}

export async function lookupRemoteAgentPayoutByBeneficiaryCode({
  companyId,
  membershipId,
  payload = {},
  role,
}) {
  assertEmployee(role);
  const beneficiaryCode = normalizeRequiredString(
    payload.beneficiaryCode,
    INVALID_OR_EXPIRED_PAYOUT_CODE_MESSAGE,
    "INVALID_OR_EXPIRED_PAYOUT_CODE",
  );

  const payout = await RemoteAgentPayout.findOne({
    company: companyId,
    beneficiaryCodeHash: hashBeneficiaryCode(beneficiaryCode),
    status: "pending",
  }).lean();

  if (!payout) {
    throwInvalidOrExpiredPayoutCode();
  }

  await findActiveGroupWithPermission({
    companyId,
    groupId: payout.assignedAgentGroup,
    membershipId,
    permission: GROUP_PERMISSIONS.PAY,
    genericOnDenied: true,
  });

  return payout;
}

export async function payRemoteAgentPayout({
  companyId,
  membershipId,
  payoutCode,
  payload = {},
  role,
  userId,
}) {
  assertEmployee(role);
  const normalized = normalizePayPayload(payload);

  return runTransaction(async (session) => {
    const payout = await RemoteAgentPayout.findOne({
      company: companyId,
      payoutCode,
    }).session(session);

    if (!payout) {
      throwInvalidOrExpiredPayoutCode();
    }

    await findActiveGroupWithPermission({
      companyId,
      groupId: payout.assignedAgentGroup,
      membershipId,
      permission: GROUP_PERMISSIONS.PAY,
      session,
      genericOnDenied: true,
    });

    if (payout.status === "paid") {
      if (payout.paymentIdempotencyKey === normalized.paymentIdempotencyKey) {
        return payout;
      }

      throw new ApiError(
        409,
        "Payout already paid with a different payment key",
        "REMOTE_PAYOUT_ALREADY_PAID",
      );
    }

    if (payout.status !== "pending") {
      throwInvalidOrExpiredPayoutCode();
    }

    if (
      payout.beneficiaryCodeHash !==
      hashBeneficiaryCode(normalized.beneficiaryCode)
    ) {
      throwInvalidOrExpiredPayoutCode();
    }

    const paidAt = new Date();
    const paidPayout = await RemoteAgentPayout.findOneAndUpdate(
      {
        _id: payout._id,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "paid",
          paidBy: userId,
          paidByMembership: membershipId,
          paidAt,
          paymentIdempotencyKey: normalized.paymentIdempotencyKey,
        },
      },
      { new: true, session },
    );

    if (!paidPayout) {
      const current = await RemoteAgentPayout.findOne({
        _id: payout._id,
        company: companyId,
      }).session(session);

      if (
        current?.status === "paid" &&
        current.paymentIdempotencyKey === normalized.paymentIdempotencyKey
      ) {
        return current;
      }

      throw new ApiError(
        409,
        "Payout payment is already in progress",
        "REMOTE_PAYOUT_PAYMENT_IN_PROGRESS",
      );
    }

    const updatedGroup = await RemoteAgentGroup.findOneAndUpdate(
      {
        _id: paidPayout.assignedAgentGroup,
        company: companyId,
        balance: { $gte: paidPayout.amount },
        reservedBalance: { $gte: paidPayout.amount },
      },
      {
        $inc: {
          balance: -paidPayout.amount,
          reservedBalance: -paidPayout.amount,
        },
      },
      { new: true, session },
    );

    if (!updatedGroup) {
      throw new ApiError(
        400,
        "Insufficient remote agent group reserved balance",
        "INSUFFICIENT_AGENT_GROUP_RESERVED_BALANCE",
      );
    }

    const currentBalance = updatedGroup.balance ?? 0;
    const previousBalance = currentBalance + paidPayout.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: membershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedRemoteAgentGroup: paidPayout.assignedAgentGroup,
          linkedRemoteAgentPayout: paidPayout._id,
          performedByMembership: membershipId,
          workflow: "remote_agent_payout",
          type: "withdrawal",
          status: "completed",
          amount: paidPayout.amount,
          currency: paidPayout.currency,
          previousBalance,
          currentBalance,
          operationCode: generateAccountOperationCode(),
        },
      ],
      { session },
    );

    const ledgerEntries = await writeJournalEntries({
      accountOperationId: operation._id,
      companyId,
      userId,
      session,
      entries: [
        {
          accountCode: ACCOUNTS.AGENT_BALANCE,
          currency: paidPayout.currency,
          debit: paidPayout.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CASH_HELD_BY_AGENT,
          currency: paidPayout.currency,
          debit: 0,
          credit: paidPayout.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    paidPayout.accountOperation = operation._id;
    await paidPayout.save({ session });

    return paidPayout;
  });
}

export async function cancelRemoteAgentPayout({
  companyId,
  membershipId,
  payload = {},
  payoutCode,
  role,
  userId,
}) {
  assertManager(role, "Only managers can cancel remote agent payouts");
  const reason = normalizeOptionalString({
    errorCode: "INVALID_CANCEL_REASON",
    label: "Cancel reason",
    maxLength: 300,
    value: payload.reason,
  });

  return runTransaction(async (session) => {
    const payout = await RemoteAgentPayout.findOne({
      company: companyId,
      payoutCode,
    }).session(session);

    if (!payout) {
      throw new ApiError(
        404,
        "Remote agent payout not found",
        "REMOTE_AGENT_PAYOUT_NOT_FOUND",
      );
    }

    if (payout.status === "canceled") {
      return payout;
    }

    if (payout.status === "paid") {
      throw new ApiError(
        400,
        "Paid payouts cannot be canceled",
        "REMOTE_PAYOUT_CANCEL_NOT_ALLOWED",
      );
    }

    const canceledAt = new Date();
    const canceledPayout = await RemoteAgentPayout.findOneAndUpdate(
      {
        _id: payout._id,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceled",
          canceledBy: userId,
          canceledByMembership: membershipId,
          canceledAt,
          cancelReason: reason,
        },
      },
      { new: true, session },
    );

    if (!canceledPayout) {
      const current = await RemoteAgentPayout.findOne({
        _id: payout._id,
        company: companyId,
      }).session(session);

      if (current?.status === "canceled") {
        return current;
      }

      throw new ApiError(
        409,
        "Payout cancellation is already in progress",
        "REMOTE_PAYOUT_CANCEL_IN_PROGRESS",
      );
    }

    const updatedGroup = await RemoteAgentGroup.findOneAndUpdate(
      {
        _id: canceledPayout.assignedAgentGroup,
        company: companyId,
        reservedBalance: { $gte: canceledPayout.amount },
      },
      { $inc: { reservedBalance: -canceledPayout.amount } },
      { new: true, session },
    );

    if (!updatedGroup) {
      throw new ApiError(
        409,
        "Unable to release reserved balance",
        "REMOTE_PAYOUT_RESERVATION_RELEASE_FAILED",
      );
    }

    return canceledPayout;
  });
}

export async function listRemoteAgentGroups({ companyId, role }) {
  assertManager(role, "Only managers can list remote agent groups");

  return RemoteAgentGroup.find({
    company: companyId,
    status: "active",
    currency: "FCFA",
  })
    .sort({ name: 1 })
    .populate("members.membership", "user role status currency")
    .lean();
}

export async function listRemoteAgentPayouts({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  if (role !== "manager" && role !== "employee") {
    throw new ApiError(
      403,
      "Access denied",
      "REMOTE_AGENT_PAYOUT_ACCESS_DENIED",
    );
  }

  const filter = {
    company: companyId,
  };

  if (role === "employee") {
    const groups = await RemoteAgentGroup.find({
      company: companyId,
      status: "active",
      currency: "FCFA",
      members: {
        $elemMatch: {
          membership: membershipId,
          permissions: GROUP_PERMISSIONS.VIEW,
          status: "active",
        },
      },
    })
      .select("_id")
      .lean();

    filter.assignedAgentGroup = { $in: groups.map((group) => group._id) };
  }

  if (query.status) {
    if (!["pending", "paid", "canceled"].includes(query.status)) {
      throw new ApiError(
        400,
        "Invalid payout status",
        "INVALID_REMOTE_PAYOUT_STATUS",
      );
    }

    filter.status = query.status;
  }

  const { page, limit } = normalizePagination(query);
  const [payouts, total] = await Promise.all([
    RemoteAgentPayout.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RemoteAgentPayout.countDocuments(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    payouts,
  };
}

export async function getRemoteAgentPayoutByCode({
  companyId,
  membershipId,
  payoutCode,
  role,
}) {
  if (role !== "manager" && role !== "employee") {
    throw new ApiError(
      403,
      "Access denied",
      "REMOTE_AGENT_PAYOUT_ACCESS_DENIED",
    );
  }

  const payout = await RemoteAgentPayout.findOne({
    company: companyId,
    payoutCode,
  }).lean();

  if (!payout) {
    throw new ApiError(
      404,
      "Remote agent payout not found",
      "REMOTE_AGENT_PAYOUT_NOT_FOUND",
    );
  }

  if (role === "employee") {
    await findActiveGroupWithPermission({
      companyId,
      groupId: payout.assignedAgentGroup,
      membershipId,
      permission: GROUP_PERMISSIONS.VIEW,
      errorCode: "REMOTE_AGENT_PAYOUT_ACCESS_DENIED",
      message: "Access denied",
    });
  }

  return payout;
}

export function hashBeneficiaryCode(value) {
  return crypto
    .createHash("sha256")
    .update(String(value).trim())
    .digest("hex");
}

export function generatePayoutCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `RAP-${date}-${random}`;
}

export function generateBeneficiaryCode() {
  return String(crypto.randomInt(10000000, 100000000));
}

function generateAccountOperationCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `AOP-${date}-${random}`;
}

function normalizeDepositPayload(payload) {
  const amount = normalizeAmount(
    payload.amount,
    "Deposit amount must be greater than 0",
    "INVALID_AGENT_DEPOSIT_AMOUNT",
  );
  const currency = normalizeFcfaCurrency(
    payload.currency,
    "Deposit currency is required",
    "INVALID_AGENT_DEPOSIT_CURRENCY",
  );
  const method = normalizeRequiredString(
    payload.method,
    "Deposit method is required",
    "INVALID_AGENT_DEPOSIT_METHOD",
  );

  if (!VALID_DEPOSIT_METHODS.has(method)) {
    throw new ApiError(
      400,
      "Deposit method must be cash, bank, mobile_money, or other",
      "INVALID_AGENT_DEPOSIT_METHOD",
    );
  }

  const reference = normalizeOptionalString({
    errorCode: "INVALID_AGENT_DEPOSIT_REFERENCE",
    label: "Reference",
    maxLength: 100,
    value: payload.reference,
  });
  const note = normalizeOptionalString({
    errorCode: "INVALID_AGENT_DEPOSIT_NOTE",
    label: "Note",
    maxLength: 300,
    value: payload.note,
  });
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "Idempotency key is required",
    "IDEMPOTENCY_KEY_REQUIRED",
  );

  return {
    amount,
    currency,
    method,
    reference,
    note,
    idempotencyKey,
    idempotencyPayload: {
      amount,
      currency,
      method,
      note,
      reference,
    },
  };
}

function normalizePayoutPayload(payload) {
  const assignedAgentGroupId = normalizeObjectId(
    payload.assignedAgentGroupId,
    "Assigned agent group ID",
    "INVALID_AGENT_GROUP",
  );
  const amount = normalizeAmount(
    payload.amount,
    "Payout amount must be greater than 0",
    "INVALID_REMOTE_PAYOUT_AMOUNT",
  );
  const currency = normalizeFcfaCurrency(
    payload.currency,
    "Payout currency is required",
    "INVALID_REMOTE_PAYOUT_CURRENCY",
  );
  const beneficiaryName = normalizeRequiredString(
    payload.beneficiaryName,
    "Beneficiary name is required",
    "INVALID_BENEFICIARY_NAME",
  );
  const beneficiaryPhone = normalizeOptionalString({
    errorCode: "INVALID_BENEFICIARY_PHONE",
    label: "Beneficiary phone",
    maxLength: 40,
    value: payload.beneficiaryPhone,
  });
  const note = normalizeOptionalString({
    errorCode: "INVALID_REMOTE_PAYOUT_NOTE",
    label: "Note",
    maxLength: 300,
    value: payload.note,
  });
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "Idempotency key is required",
    "IDEMPOTENCY_KEY_REQUIRED",
  );

  return {
    amount,
    assignedAgentGroupId,
    beneficiaryName,
    beneficiaryPhone,
    currency,
    idempotencyKey,
    note,
    idempotencyPayload: {
      assignedAgentGroupId: assignedAgentGroupId.toString(),
      amount,
      beneficiaryName,
      beneficiaryPhone,
      currency,
      note,
    },
  };
}

function normalizePayPayload(payload) {
  const beneficiaryCode = normalizeRequiredString(
    payload.beneficiaryCode,
    INVALID_OR_EXPIRED_PAYOUT_CODE_MESSAGE,
    "INVALID_OR_EXPIRED_PAYOUT_CODE",
  );
  const paymentIdempotencyKey = normalizeRequiredString(
    payload.paymentIdempotencyKey,
    "Payment idempotency key is required",
    "PAYMENT_IDEMPOTENCY_KEY_REQUIRED",
  );

  return {
    beneficiaryCode,
    paymentIdempotencyKey,
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

function normalizeAmount(value, message, errorCode) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, message, errorCode);
  }

  return amount;
}

function normalizeFcfaCurrency(value, message, errorCode) {
  const currency = normalizeRequiredString(value, message, errorCode)
    .toUpperCase();

  if (currency !== "FCFA") {
    throw new ApiError(
      400,
      "Remote agent payout MVP only supports FCFA",
      errorCode,
    );
  }

  return currency;
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

async function findActiveGroupWithPermission({
  companyId,
  errorCode,
  genericOnDenied = false,
  groupId,
  membershipId,
  message,
  permission,
  session,
}) {
  const filter = {
    _id: groupId,
    company: companyId,
    status: "active",
    currency: "FCFA",
    members: {
      $elemMatch: {
        membership: membershipId,
        permissions: permission,
        status: "active",
      },
    },
  };
  const query = RemoteAgentGroup.findOne(filter);
  const group = session ? await query.session(session) : await query.lean();

  if (!group) {
    if (genericOnDenied) {
      throwInvalidOrExpiredPayoutCode();
    }

    throw new ApiError(
      403,
      message ?? "Remote agent group permission is required",
      errorCode ?? "REMOTE_AGENT_GROUP_PERMISSION_REQUIRED",
    );
  }

  return group;
}

function assertSameIdempotencyPayload(existing, expectedPayload) {
  if (
    JSON.stringify(existing.idempotencyPayload ?? null) !==
    JSON.stringify(expectedPayload)
  ) {
    throw new ApiError(
      409,
      "Idempotency key already used with different payload",
      "IDEMPOTENCY_KEY_CONFLICT",
    );
  }
}

function assertManager(role, message) {
  if (role !== "manager") {
    throw new ApiError(403, message, "REMOTE_PAYOUT_MANAGER_REQUIRED");
  }
}

function assertEmployee(role) {
  if (role !== "employee") {
    throw new ApiError(
      403,
      "Only employee agents can access remote payout group actions",
      "REMOTE_PAYOUT_EMPLOYEE_REQUIRED",
    );
  }
}

function throwInvalidOrExpiredPayoutCode() {
  throw new ApiError(
    404,
    INVALID_OR_EXPIRED_PAYOUT_CODE_MESSAGE,
    "INVALID_OR_EXPIRED_PAYOUT_CODE",
  );
}

function normalizePagination(query) {
  return {
    page: normalizePositiveInteger(query.page, 1),
    limit: normalizePositiveInteger(query.limit, 20),
  };
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
