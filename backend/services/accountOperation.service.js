import crypto from "crypto";
import { Types } from "mongoose";

import { ACCOUNTS } from "../constants/accounts.js";
import AccountOperation from "../models/AccountOperation.js";
import CompanyMembership from "../models/CompanyMembership.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_CURRENCIES = new Set(["FCFA", "GNF"]);
const VALID_LIST_TYPES = new Set(["deposit", "withdrawal"]);
const VALID_LIST_STATUSES = new Set([
  "completed",
  "pending_confirmation",
  "rejected",
  "reversed",
]);

export async function createWithdrawalRequest({
  companyId,
  membershipId,
  userId,
  role,
  payload = {},
}) {
  if (role !== "manager") {
    throw new ApiError(
      403,
      "Only managers can create withdrawal requests",
      "WITHDRAWAL_REQUEST_MANAGER_REQUIRED",
    );
  }

  const normalized = normalizeWithdrawalRequestPayload(payload);

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

    const targetMembership = await CompanyMembership.findOne({
      _id: normalized.targetMembershipId,
      company: companyId,
      status: "active",
      role: "partner",
    }).session(session);

    if (!targetMembership) {
      throw new ApiError(
        404,
        "Target membership not found",
        "TARGET_MEMBERSHIP_NOT_FOUND",
      );
    }

    if (targetMembership.currency !== normalized.currency) {
      throw new ApiError(
        400,
        "Withdrawal currency must match target membership currency",
        "WITHDRAWAL_CURRENCY_MISMATCH",
      );
    }

    const previousBalance = targetMembership.balance ?? 0;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: normalized.targetMembershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          type: "withdrawal",
          status: "pending_confirmation",
          amount: normalized.amount,
          currency: normalized.currency,
          previousBalance,
          currentBalance: previousBalance,
          operationCode: generateAccountOperationCode(),
          idempotencyKey: normalized.idempotencyKey,
          idempotencyPayload: normalized.idempotencyPayload,
          collectorName: normalized.collectorName,
          collectorPhone: normalized.collectorPhone,
          note: normalized.note,
        },
      ],
      { session },
    );

    return operation;
  });
}

export async function confirmWithdrawalRequest({
  companyId,
  membershipId,
  userId,
  operationCode,
}) {
  return runTransaction(async (session) => {
    const operation = await findOperationByCode({
      companyId,
      operationCode,
      session,
    });

    assertWithdrawalOperation(operation);

    if (!idsEqual(operation.targetMembership, membershipId)) {
      throw new ApiError(
        403,
        "Only the target partner can confirm this withdrawal",
        "WITHDRAWAL_CONFIRM_TARGET_REQUIRED",
      );
    }

    if (operation.status === "completed") {
      return operation;
    }

    if (operation.status === "rejected" || operation.status === "reversed") {
      throw new ApiError(
        400,
        "Withdrawal confirmation is not allowed for this status",
        "WITHDRAWAL_CONFIRMATION_NOT_ALLOWED",
      );
    }

    if (operation.status !== "pending_confirmation") {
      throw new ApiError(
        400,
        "Withdrawal is not pending confirmation",
        "WITHDRAWAL_CONFIRMATION_NOT_ALLOWED",
      );
    }

    const completedOperation = await AccountOperation.findOneAndUpdate(
      {
        _id: operation._id,
        company: companyId,
        status: "pending_confirmation",
      },
      {
        $set: {
          status: "completed",
          confirmedByMembership: membershipId,
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
      },
      { new: true, session },
    );

    if (!completedOperation) {
      const current = await AccountOperation.findOne({
        _id: operation._id,
        company: companyId,
      }).session(session);

      if (current?.status === "completed") {
        return current;
      }

      throw new ApiError(
        409,
        "Withdrawal confirmation is already in progress",
        "WITHDRAWAL_CONFIRM_IN_PROGRESS",
      );
    }

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: completedOperation.targetMembership,
        company: companyId,
        balance: { $gte: completedOperation.amount },
      },
      { $inc: { balance: -completedOperation.amount } },
      { new: true, session },
    );

    if (!updatedMembership) {
      throw new ApiError(400, "Insufficient balance", "INSUFFICIENT_BALANCE");
    }

    completedOperation.currentBalance = updatedMembership.balance;

    const ledgerEntries = await writeJournalEntries({
      accountOperationId: completedOperation._id,
      companyId,
      userId,
      session,
      entries: [
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: completedOperation.currency,
          debit: completedOperation.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          currency: completedOperation.currency,
          debit: 0,
          credit: completedOperation.amount,
        },
      ],
    });

    completedOperation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await completedOperation.save({ session });

    return completedOperation;
  });
}

export async function rejectWithdrawalRequest({
  companyId,
  membershipId,
  operationCode,
}) {
  return runTransaction(async (session) => {
    const operation = await findOperationByCode({
      companyId,
      operationCode,
      session,
    });

    assertWithdrawalOperation(operation);

    if (!idsEqual(operation.targetMembership, membershipId)) {
      throw new ApiError(
        403,
        "Only the target partner can reject this withdrawal",
        "WITHDRAWAL_REJECT_TARGET_REQUIRED",
      );
    }

    if (operation.status !== "pending_confirmation") {
      throw new ApiError(
        400,
        "Only pending withdrawals can be rejected",
        "WITHDRAWAL_REJECT_NOT_ALLOWED",
      );
    }

    operation.status = "rejected";
    operation.rejectedAt = new Date();
    await operation.save({ session });

    return operation;
  });
}

export async function listAccountOperations({
  companyId,
  membershipId,
  role,
  query = {},
}) {
  const filter = buildAccountOperationListFilter({
    companyId,
    membershipId,
    role,
    query,
  });
  const { page, limit } = normalizePagination(query);

  const [operations, total] = await Promise.all([
    AccountOperation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("targetMembership", "user currency")
      .populate("createdBy", "firstName lastName name email")
      .lean(),
    AccountOperation.countDocuments(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    operations,
  };
}

export function normalizeCollectionIdempotencyPayload(payload = {}) {
  return {
    beneficiaryName: normalizeRequiredString(
      payload.beneficiaryName,
      "Beneficiary name is required",
      "INVALID_BENEFICIARY_NAME",
    ),
    collectedAmount: normalizeAmount(
      payload.collectedAmount,
      "Collected amount must be greater than 0",
      "INVALID_COLLECTED_AMOUNT",
    ),
    collectedCurrency: normalizeCurrency(
      payload.collectedCurrency,
      "Collected currency is required",
      "INVALID_COLLECTED_CURRENCY",
    ),
    description: normalizeOptionalString({
      errorCode: "INVALID_COLLECTION_DESCRIPTION",
      label: "Description",
      maxLength: 255,
      value: payload.description,
    }),
  };
}

export function assertSameIdempotencyPayload(existing, expectedPayload) {
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

export function generateAccountOperationCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `AOP-${date}-${random}`;
}

function normalizeWithdrawalRequestPayload(payload) {
  const targetMembershipId = normalizeObjectId(
    payload.targetMembershipId,
    "Target membership ID",
    "INVALID_TARGET_MEMBERSHIP",
  );
  const amount = normalizeAmount(
    payload.amount,
    "Withdrawal amount must be greater than 0",
    "INVALID_WITHDRAWAL_AMOUNT",
  );
  const currency = normalizeCurrency(
    payload.currency,
    "Withdrawal currency is required",
    "INVALID_WITHDRAWAL_CURRENCY",
  );
  const collectorName = normalizeRequiredString(
    payload.collectorName,
    "Collector name is required",
    "INVALID_COLLECTOR_NAME",
  );
  const collectorPhone = normalizeOptionalString({
    errorCode: "INVALID_COLLECTOR_PHONE",
    label: "Collector phone",
    maxLength: 40,
    value: payload.collectorPhone,
  });
  const note = normalizeOptionalString({
    errorCode: "INVALID_WITHDRAWAL_NOTE",
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
    collectorName,
    collectorPhone,
    currency,
    idempotencyKey,
    note,
    targetMembershipId,
    idempotencyPayload: {
      amount,
      collectorName,
      collectorPhone,
      currency,
      note,
      targetMembershipId: targetMembershipId.toString(),
    },
  };
}

async function findOperationByCode({ companyId, operationCode, session }) {
  const operation = await AccountOperation.findOne({
    company: companyId,
    operationCode,
  }).session(session);

  if (!operation) {
    throw new ApiError(
      404,
      "Account operation not found",
      "ACCOUNT_OPERATION_NOT_FOUND",
    );
  }

  return operation;
}

function assertWithdrawalOperation(operation) {
  if (operation.type !== "withdrawal") {
    throw new ApiError(
      400,
      "Only withdrawal operations can be confirmed",
      "WITHDRAWAL_OPERATION_REQUIRED",
    );
  }
}

function buildAccountOperationListFilter({
  companyId,
  membershipId,
  role,
  query,
}) {
  if (role !== "manager" && role !== "partner") {
    throw new ApiError(
      403,
      "Access denied",
      "ACCOUNT_OPERATION_ACCESS_DENIED",
    );
  }

  const filter = {
    company: companyId,
    ...(role === "partner" && { targetMembership: membershipId }),
  };

  if (query.type) {
    if (!VALID_LIST_TYPES.has(query.type)) {
      throw new ApiError(
        400,
        "Invalid account operation type",
        "INVALID_ACCOUNT_OPERATION_TYPE",
      );
    }

    filter.type = query.type;
  }

  if (query.status) {
    if (!VALID_LIST_STATUSES.has(query.status)) {
      throw new ApiError(
        400,
        "Invalid account operation status",
        "INVALID_ACCOUNT_OPERATION_STATUS",
      );
    }

    filter.status = query.status;
  }

  if (role === "manager" && query.targetMembershipId) {
    filter.targetMembership = normalizeObjectId(
      query.targetMembershipId,
      "Target membership ID",
      "INVALID_TARGET_MEMBERSHIP",
    );
  }

  const createdAt = {};
  if (query.dateFrom) {
    createdAt.$gte = normalizeDate(query.dateFrom, "INVALID_DATE_FROM");
  }
  if (query.dateTo) {
    createdAt.$lte = normalizeDate(query.dateTo, "INVALID_DATE_TO");
  }
  if (Object.keys(createdAt).length > 0) {
    filter.createdAt = createdAt;
  }

  return filter;
}

function normalizeObjectId(value, label, errorCode) {
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

function normalizeCurrency(value, message, errorCode) {
  const normalized = normalizeRequiredString(value, message, errorCode)
    .toUpperCase();

  if (!VALID_CURRENCIES.has(normalized)) {
    throw new ApiError(400, "Currency must be FCFA or GNF", errorCode);
  }

  return normalized;
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

function normalizeDate(value, errorCode) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date filter", errorCode);
  }

  return date;
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

function idsEqual(left, right) {
  return left?.toString?.() === right?.toString?.();
}
