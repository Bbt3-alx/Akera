import crypto from "node:crypto";
import { Types } from "mongoose";

import { ACCOUNTS } from "../constants/accounts.js";
import AccountOperation from "../models/AccountOperation.js";
import CompanyMembership from "../models/CompanyMembership.js";
import CorrespondentDelivery from "../models/CorrespondentDelivery.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { generateAccountOperationCode } from "./accountOperation.service.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_CURRENCIES = new Set(["FCFA", "GNF"]);
const VALID_LIST_STATUSES = new Set(["pending", "confirmed", "canceled"]);

const deliveryPopulate = [
  {
    path: "correspondentMembership",
    select: "user role status currency",
    populate: {
      path: "user",
      select: "firstName lastName name email",
    },
  },
  {
    path: "createdBy",
    select: "firstName lastName name email",
  },
  {
    path: "confirmedBy",
    select: "firstName lastName name email",
  },
  {
    path: "canceledBy",
    select: "firstName lastName name email",
  },
];

export async function createCorrespondentDelivery({
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertManager(role, "Only managers can create correspondent deliveries");
  const normalized = normalizeCreatePayload(payload);

  return runTransaction(async (session) => {
    const existing = await CorrespondentDelivery.findOne({
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

    const reservedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: normalized.correspondentMembershipId,
        company: companyId,
        status: "active",
        role: "partner",
        currency: normalized.currency,
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

    if (!reservedMembership) {
      throw new ApiError(
        400,
        "Insufficient correspondent available balance",
        "INSUFFICIENT_CORRESPONDENT_AVAILABLE_BALANCE",
      );
    }

    const [delivery] = await CorrespondentDelivery.create(
      [
        {
          company: companyId,
          correspondentMembership: normalized.correspondentMembershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          deliveryCode: generateDeliveryCode(),
          amount: normalized.amount,
          currency: normalized.currency,
          status: "pending",
          beneficiaryName: normalized.beneficiaryName,
          beneficiaryPhone: normalized.beneficiaryPhone,
          note: normalized.note,
          rateValue: normalized.rateValue,
          rateBaseAmount: normalized.rateBaseAmount,
          rateQuoteCurrency: normalized.rateQuoteCurrency,
          rateBaseCurrency: normalized.rateBaseCurrency,
          counterAmount: normalized.counterAmount,
          counterCurrency: normalized.counterCurrency,
          rateNote: normalized.rateNote,
          idempotencyKey: normalized.idempotencyKey,
          idempotencyPayload: normalized.idempotencyPayload,
        },
      ],
      { session },
    );

    return delivery;
  });
}

export async function listCorrespondentDeliveries({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  const filter = buildListFilter({ companyId, membershipId, query, role });
  const { page, limit } = normalizePagination(query);

  const [deliveries, total] = await Promise.all([
    applyDeliveryPopulate(CorrespondentDelivery.find(filter))
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CorrespondentDelivery.countDocuments(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    deliveries,
  };
}

export async function getCorrespondentDeliveryByCode({
  deliveryCode,
  companyId,
  membershipId,
  role,
}) {
  assertReadAccess(role);

  const filter = {
    company: companyId,
    deliveryCode,
    ...(role === "partner" && { correspondentMembership: membershipId }),
  };

  const delivery = await applyDeliveryPopulate(
    CorrespondentDelivery.findOne(filter),
  ).lean();

  if (!delivery) {
    throw new ApiError(
      404,
      "Correspondent delivery not found",
      "CORRESPONDENT_DELIVERY_NOT_FOUND",
    );
  }

  return delivery;
}

export async function confirmCorrespondentDelivery({
  deliveryCode,
  companyId,
  membershipId,
  role,
  userId,
}) {
  assertPartner(role, "Only correspondent partners can confirm deliveries");

  return runTransaction(async (session) => {
    const delivery = await findDeliveryByCode({
      companyId,
      deliveryCode,
      session,
    });

    if (!idsEqual(delivery.correspondentMembership, membershipId)) {
      throw new ApiError(
        403,
        "Only the assigned correspondent can confirm this delivery",
        "CORRESPONDENT_DELIVERY_ASSIGNED_PARTNER_REQUIRED",
      );
    }

    if (delivery.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending correspondent deliveries can be confirmed",
        "CORRESPONDENT_DELIVERY_CONFIRM_NOT_ALLOWED",
      );
    }

    const confirmedAt = new Date();
    const confirmedDelivery = await CorrespondentDelivery.findOneAndUpdate(
      {
        _id: delivery._id,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "confirmed",
          confirmedBy: userId,
          confirmedByMembership: membershipId,
          confirmedAt,
        },
      },
      { new: true, session },
    );

    if (!confirmedDelivery) {
      await throwConcurrentTransitionError({
        companyId,
        deliveryId: delivery._id,
        session,
        transition: "confirm",
      });
    }

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: delivery.correspondentMembership,
        company: companyId,
        role: "partner",
        status: "active",
        currency: delivery.currency,
        balance: { $gte: delivery.amount },
        reservedBalance: { $gte: delivery.amount },
      },
      { $inc: { balance: -delivery.amount, reservedBalance: -delivery.amount } },
      { new: true, session },
    );

    if (!updatedMembership) {
      throw new ApiError(
        409,
        "Unable to settle correspondent reserved balance",
        "CORRESPONDENT_DELIVERY_BALANCE_UPDATE_FAILED",
      );
    }

    const currentBalance = updatedMembership.balance ?? 0;
    const previousBalance = currentBalance + delivery.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: delivery.correspondentMembership,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedCorrespondentDelivery: delivery._id,
          workflow: "correspondent_collection",
          type: "withdrawal",
          status: "completed",
          amount: delivery.amount,
          currency: delivery.currency,
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
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: delivery.currency,
          debit: delivery.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          currency: delivery.currency,
          debit: 0,
          credit: delivery.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    confirmedDelivery.accountOperation = operation._id;
    await confirmedDelivery.save({ session });

    return confirmedDelivery;
  });
}

export async function cancelCorrespondentDelivery({
  deliveryCode,
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertManager(role, "Only managers can cancel correspondent deliveries");
  const normalized = normalizeCancelPayload(payload);

  return runTransaction(async (session) => {
    const delivery = await findDeliveryByCode({
      companyId,
      deliveryCode,
      session,
    });

    if (delivery.status === "canceled") {
      return delivery;
    }

    if (delivery.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending correspondent deliveries can be canceled",
        "CORRESPONDENT_DELIVERY_CANCEL_NOT_ALLOWED",
      );
    }

    const canceledAt = new Date();
    const canceledDelivery = await CorrespondentDelivery.findOneAndUpdate(
      {
        _id: delivery._id,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceled",
          canceledBy: userId,
          canceledByMembership: membershipId,
          canceledAt,
          cancelReason: normalized.reason,
        },
      },
      { new: true, session },
    );

    if (!canceledDelivery) {
      await throwConcurrentTransitionError({
        companyId,
        deliveryId: delivery._id,
        session,
        transition: "cancel",
      });
    }

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: delivery.correspondentMembership,
        company: companyId,
        reservedBalance: { $gte: delivery.amount },
      },
      { $inc: { reservedBalance: -delivery.amount } },
      { new: true, session },
    );

    if (!updatedMembership) {
      throw new ApiError(
        409,
        "Unable to release correspondent delivery reservation",
        "CORRESPONDENT_DELIVERY_RESERVATION_RELEASE_FAILED",
      );
    }

    return canceledDelivery;
  });
}

export function generateDeliveryCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `CDL-${date}-${random}`;
}

function applyDeliveryPopulate(query) {
  return deliveryPopulate.reduce(
    (current, populateConfig) => current.populate(populateConfig),
    query,
  );
}

async function findDeliveryByCode({ companyId, deliveryCode, session }) {
  const delivery = await CorrespondentDelivery.findOne({
    company: companyId,
    deliveryCode,
  }).session(session);

  if (!delivery) {
    throw new ApiError(
      404,
      "Correspondent delivery not found",
      "CORRESPONDENT_DELIVERY_NOT_FOUND",
    );
  }

  return delivery;
}

async function throwConcurrentTransitionError({
  companyId,
  deliveryId,
  session,
  transition,
}) {
  const current = await CorrespondentDelivery.findOne({
    _id: deliveryId,
    company: companyId,
  }).session(session);

  if (current?.status && current.status !== "pending") {
    throw new ApiError(
      400,
      `Correspondent delivery cannot ${transition} from this status`,
      transition === "confirm"
        ? "CORRESPONDENT_DELIVERY_CONFIRM_NOT_ALLOWED"
        : "CORRESPONDENT_DELIVERY_CANCEL_NOT_ALLOWED",
    );
  }

  throw new ApiError(
    409,
    `Correspondent delivery ${transition} is already in progress`,
    transition === "confirm"
      ? "CORRESPONDENT_DELIVERY_CONFIRM_IN_PROGRESS"
      : "CORRESPONDENT_DELIVERY_CANCEL_IN_PROGRESS",
  );
}

function buildListFilter({ companyId, membershipId, query, role }) {
  assertReadAccess(role);

  const filter = {
    company: companyId,
    ...(role === "partner" && { correspondentMembership: membershipId }),
  };

  if (query.status) {
    if (!VALID_LIST_STATUSES.has(query.status)) {
      throw new ApiError(
        400,
        "Invalid correspondent delivery status",
        "INVALID_CORRESPONDENT_DELIVERY_STATUS",
      );
    }

    filter.status = query.status;
  }

  if (role === "manager" && query.correspondentMembershipId) {
    filter.correspondentMembership = normalizeObjectId(
      query.correspondentMembershipId,
      "Correspondent membership ID",
      "INVALID_CORRESPONDENT_MEMBERSHIP",
    );
  }

  return filter;
}

function normalizeCreatePayload(payload) {
  const correspondentMembershipId = normalizeObjectId(
    payload.correspondentMembershipId ?? payload.correspondentMembership,
    "Correspondent membership ID",
    "INVALID_CORRESPONDENT_MEMBERSHIP",
  );
  const amount = normalizeAmount(payload.amount, "Delivery");
  const currency = normalizeCurrency(
    payload.currency,
    "Delivery currency is required",
    "INVALID_DELIVERY_CURRENCY",
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
    errorCode: "INVALID_DELIVERY_NOTE",
    label: "Note",
    maxLength: 300,
    value: payload.note ?? payload.description,
  });
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "Idempotency key is required",
    "IDEMPOTENCY_KEY_REQUIRED",
  );
  const rateSnapshot = normalizeRateSnapshot(payload, "DELIVERY");

  return {
    amount,
    beneficiaryName,
    beneficiaryPhone,
    correspondentMembershipId,
    currency,
    idempotencyKey,
    note,
    ...rateSnapshot,
    idempotencyPayload: {
      amount,
      beneficiaryName,
      beneficiaryPhone,
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency,
      note,
      ...rateSnapshot,
    },
  };
}

function normalizeCancelPayload(payload) {
  return {
    reason: normalizeOptionalString({
      errorCode: "INVALID_CANCEL_REASON",
      label: "Cancel reason",
      maxLength: 300,
      value: payload.reason ?? payload.cancelReason,
    }),
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

function normalizeAmount(value, label) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      `${label} amount must be greater than 0`,
      `INVALID_${label.toUpperCase()}_AMOUNT`,
    );
  }

  if (!Number.isInteger(amount)) {
    throw new ApiError(
      400,
      "FCFA/GNF amount must be an integer",
      `INVALID_${label.toUpperCase()}_AMOUNT`,
    );
  }

  return amount;
}

function normalizeCurrency(value, message, errorCode) {
  const currency = normalizeRequiredString(value, message, errorCode)
    .toUpperCase();

  if (!VALID_CURRENCIES.has(currency)) {
    throw new ApiError(400, "Currency must be FCFA or GNF", errorCode);
  }

  return currency;
}

function normalizeRateSnapshot(payload, prefix) {
  return compactObject({
    rateValue: normalizeOptionalPositiveNumber({
      errorCode: `INVALID_${prefix}_RATE_VALUE`,
      label: "Rate value",
      value: payload.rateValue,
    }),
    rateBaseAmount: normalizeOptionalPositiveInteger({
      errorCode: `INVALID_${prefix}_RATE_BASE_AMOUNT`,
      label: "Rate base amount",
      value: payload.rateBaseAmount,
    }),
    rateQuoteCurrency: normalizeOptionalCurrency({
      errorCode: `INVALID_${prefix}_RATE_QUOTE_CURRENCY`,
      label: "Rate quote currency",
      value: payload.rateQuoteCurrency,
    }),
    rateBaseCurrency: normalizeOptionalCurrency({
      errorCode: `INVALID_${prefix}_RATE_BASE_CURRENCY`,
      label: "Rate base currency",
      value: payload.rateBaseCurrency,
    }),
    counterAmount: normalizeOptionalPositiveInteger({
      errorCode: `INVALID_${prefix}_COUNTER_AMOUNT`,
      label: "Counter amount",
      value: payload.counterAmount,
    }),
    counterCurrency: normalizeOptionalCurrency({
      errorCode: `INVALID_${prefix}_COUNTER_CURRENCY`,
      label: "Counter currency",
      value: payload.counterCurrency,
    }),
    rateNote: normalizeOptionalString({
      errorCode: `INVALID_${prefix}_RATE_NOTE`,
      label: "Rate note",
      maxLength: 300,
      value: payload.rateNote,
    }),
  });
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

function normalizeOptionalPositiveNumber({ errorCode, label, value }) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, `${label} must be greater than 0`, errorCode);
  }

  return parsed;
}

function normalizeOptionalPositiveInteger({ errorCode, label, value }) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new ApiError(
      400,
      `${label} must be a positive integer`,
      errorCode,
    );
  }

  return parsed;
}

function normalizeOptionalCurrency({ errorCode, label, value }) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const currency = normalizeRequiredString(
    value,
    `${label} is required`,
    errorCode,
  ).toUpperCase();

  if (!VALID_CURRENCIES.has(currency)) {
    throw new ApiError(400, `${label} must be FCFA or GNF`, errorCode);
  }

  return currency;
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
    throw new ApiError(
      403,
      message,
      "CORRESPONDENT_DELIVERY_MANAGER_REQUIRED",
    );
  }
}

function assertPartner(role, message) {
  if (role !== "partner") {
    throw new ApiError(
      403,
      message,
      "CORRESPONDENT_DELIVERY_PARTNER_CONFIRM_REQUIRED",
    );
  }
}

function assertReadAccess(role) {
  if (role !== "manager" && role !== "partner") {
    throw new ApiError(
      403,
      "Access denied",
      "CORRESPONDENT_DELIVERY_ACCESS_DENIED",
    );
  }
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
  return serializeId(left) === serializeId(right);
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

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}
