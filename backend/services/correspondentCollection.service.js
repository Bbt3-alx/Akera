import crypto from "node:crypto";
import { Types } from "mongoose";

import { ACCOUNTS } from "../constants/accounts.js";
import AccountOperation from "../models/AccountOperation.js";
import CompanyMembership from "../models/CompanyMembership.js";
import CorrespondentCollection from "../models/CorrespondentCollection.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { generateAccountOperationCode } from "./accountOperation.service.js";
import { getCurrentCompanyExchangeRate } from "./companyExchangeRate.service.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_LIST_STATUSES = new Set(["pending", "paid", "confirmed", "canceled"]);
const VALID_CURRENCIES = new Set(["FCFA", "GNF"]);
const CORRESPONDENT_RATE_BASE_AMOUNT = 5000;
const CORRESPONDENT_RATE_BASE_CURRENCY = "FCFA";
const CORRESPONDENT_RATE_QUOTE_CURRENCY = "GNF";
const PARTNER_FORBIDDEN_RATE_FIELDS = [
  "payoutAmount",
  "payoutCurrency",
  "rateValue",
  "rateBaseAmount",
  "rateQuoteCurrency",
  "rateBaseCurrency",
  "counterAmount",
  "counterCurrency",
  "rateNote",
];

const collectionPopulate = [
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
    path: "paidBy",
    select: "firstName lastName name email",
  },
  {
    path: "canceledBy",
    select: "firstName lastName name email",
  },
];

export async function createCorrespondentCollection({
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertCreateAccess(role);
  const normalized = await normalizeCreatePayload(payload, {
    companyId,
    membershipId,
    role,
  });

  return runTransaction(async (session) => {
    const existing = await CorrespondentCollection.findOne({
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

    const correspondentMembership = await CompanyMembership.findOne({
      _id: normalized.correspondentMembershipId,
      company: companyId,
      status: "active",
      role: "partner",
      currency: normalized.currency,
    }).session(session);

    if (!correspondentMembership) {
      throw new ApiError(
        404,
        "Correspondent membership not found",
        "CORRESPONDENT_MEMBERSHIP_NOT_FOUND",
      );
    }

    const [collection] = await CorrespondentCollection.create(
      [
        {
          company: companyId,
          correspondentMembership: normalized.correspondentMembershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          collectionCode: generateCollectionCode(),
          amount: normalized.amount,
          beneficiaryName: normalized.beneficiaryName,
          beneficiaryPhone: normalized.beneficiaryPhone,
          currency: normalized.currency,
          payoutAmount: normalized.payoutAmount,
          payoutCurrency: normalized.payoutCurrency,
          status: "pending",
          customerName: normalized.beneficiaryName,
          customerPhone: normalized.beneficiaryPhone,
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

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: normalized.correspondentMembershipId,
        company: companyId,
        role: "partner",
        status: "active",
        currency: normalized.currency,
      },
      { $inc: { balance: normalized.amount } },
      { new: true, session },
    );

    if (!updatedMembership) {
      throw new ApiError(
        409,
        "Unable to update correspondent balance",
        "CORRESPONDENT_BALANCE_UPDATE_FAILED",
      );
    }

    const currentBalance = updatedMembership.balance ?? 0;
    const previousBalance = currentBalance - normalized.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: normalized.correspondentMembershipId,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedCorrespondentCollection: collection._id,
          workflow: "correspondent_collection",
          type: "deposit",
          status: "completed",
          amount: normalized.amount,
          currency: normalized.currency,
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
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          currency: normalized.currency,
          debit: normalized.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: normalized.currency,
          debit: 0,
          credit: normalized.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    collection.accountOperation = operation._id;
    await collection.save({ session });

    return collection;
  });
}

export async function listCorrespondentCollections({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  const filter = buildListFilter({ companyId, membershipId, query, role });
  const { page, limit } = normalizePagination(query);

  const [collections, total] = await Promise.all([
    applyCollectionPopulate(CorrespondentCollection.find(filter))
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CorrespondentCollection.countDocuments(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    collections,
  };
}

export async function listActiveCorrespondents({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  assertReadAccess(role);

  const normalizedSearch = normalizeOptionalString({
    errorCode: "INVALID_CORRESPONDENT_SEARCH",
    label: "Search",
    maxLength: 100,
    value: query.search,
  });
  const filter = {
    company: companyId,
    role: "partner",
    status: "active",
    ...(role === "partner" && { _id: membershipId }),
  };

  const memberships = await CompanyMembership.find(filter)
    .populate({
      path: "user",
      select: "firstName lastName name email",
    })
    .lean();

  return memberships
    .filter((membership) =>
      matchesCorrespondentSearch(membership, normalizedSearch),
    )
    .sort(compareCorrespondents);
}

export async function getCorrespondentCollectionByCode({
  collectionCode,
  companyId,
  membershipId,
  role,
}) {
  assertReadAccess(role);

  const filter = {
    company: companyId,
    collectionCode,
    ...(role === "partner" && { correspondentMembership: membershipId }),
  };

  const collection = await applyCollectionPopulate(
    CorrespondentCollection.findOne(filter),
  ).lean();

  if (!collection) {
    throw new ApiError(
      404,
      "Correspondent collection not found",
      "CORRESPONDENT_COLLECTION_NOT_FOUND",
    );
  }

  return collection;
}

export async function confirmCorrespondentCollection({
  collectionCode,
  companyId,
  membershipId,
  role,
  userId,
}) {
  assertManager(role, "Only managers can pay correspondent collections");

  return runTransaction(async (session) => {
    const collection = await findCollectionByCode({
      collectionCode,
      companyId,
      session,
    });

    if (collection.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending correspondent collections can be paid",
        "CORRESPONDENT_COLLECTION_PAY_NOT_ALLOWED",
      );
    }

    const paidAt = new Date();
    const paidCollection = await CorrespondentCollection.findOneAndUpdate(
      {
        _id: collection._id,
        company: companyId,
        status: "pending",
      },
      {
        $set: {
          status: "paid",
          paidBy: userId,
          paidByMembership: membershipId,
          paidAt,
        },
      },
      { new: true, session },
    );

    if (!paidCollection) {
      await throwConcurrentTransitionError({
        collectionId: collection._id,
        companyId,
        session,
        transition: "pay",
      });
    }

    return paidCollection;
  });
}

export async function cancelCorrespondentCollection({
  collectionCode,
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertCancelAccess(role);
  const normalized = normalizeCancelPayload(payload);

  return runTransaction(async (session) => {
    const collection = await findCollectionByCode({
      collectionCode,
      companyId,
      session,
    });

    if (
      role === "partner" &&
      !idsEqual(collection.correspondentMembership, membershipId)
    ) {
      throw new ApiError(
        403,
        "Only the assigned correspondent can cancel this collection",
        "CORRESPONDENT_COLLECTION_ASSIGNED_PARTNER_REQUIRED",
      );
    }

    if (collection.status === "canceled") {
      return collection;
    }

    if (collection.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending correspondent collections can be canceled",
        "CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED",
      );
    }

    const canceledAt = new Date();
    const canceledCollection = await CorrespondentCollection.findOneAndUpdate(
      {
        _id: collection._id,
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

    if (!canceledCollection) {
      await throwConcurrentTransitionError({
        collectionId: collection._id,
        companyId,
        session,
        transition: "cancel",
      });
    }

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: collection.correspondentMembership,
        company: companyId,
        role: "partner",
        status: "active",
        currency: collection.currency,
        balance: { $gte: collection.amount },
        $expr: {
          $gte: [
            {
              $subtract: [
                "$balance",
                { $ifNull: ["$reservedBalance", 0] },
              ],
            },
            collection.amount,
          ],
        },
      },
      { $inc: { balance: -collection.amount } },
      { new: true, session },
    );

    if (!updatedMembership) {
      throw new ApiError(
        409,
        "Unable to reverse correspondent collection balance",
        "CORRESPONDENT_COLLECTION_REVERSAL_BALANCE_UNAVAILABLE",
      );
    }

    const currentBalance = updatedMembership.balance ?? 0;
    const previousBalance = currentBalance + collection.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: collection.correspondentMembership,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedCorrespondentCollection: collection._id,
          workflow: "correspondent_collection",
          type: "withdrawal",
          status: "completed",
          amount: collection.amount,
          currency: collection.currency,
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
          currency: collection.currency,
          debit: collection.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          currency: collection.currency,
          debit: 0,
          credit: collection.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    canceledCollection.cancellationAccountOperation = operation._id;
    await canceledCollection.save({ session });

    return canceledCollection;
  });
}

export function generateCollectionCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `CCL-${date}-${random}`;
}

function applyCollectionPopulate(query) {
  return collectionPopulate.reduce(
    (current, populateConfig) => current.populate(populateConfig),
    query,
  );
}

async function findCollectionByCode({ collectionCode, companyId, session }) {
  const collection = await CorrespondentCollection.findOne({
    company: companyId,
    collectionCode,
  }).session(session);

  if (!collection) {
    throw new ApiError(
      404,
      "Correspondent collection not found",
      "CORRESPONDENT_COLLECTION_NOT_FOUND",
    );
  }

  return collection;
}

async function throwConcurrentTransitionError({
  collectionId,
  companyId,
  session,
  transition,
}) {
  const current = await CorrespondentCollection.findOne({
    _id: collectionId,
    company: companyId,
  }).session(session);

  if (current?.status && current.status !== "pending") {
    const notAllowedCode =
      transition === "pay"
        ? "CORRESPONDENT_COLLECTION_PAY_NOT_ALLOWED"
        : transition === "confirm"
          ? "CORRESPONDENT_COLLECTION_CONFIRM_NOT_ALLOWED"
          : "CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED";

    throw new ApiError(
      400,
      `Correspondent collection cannot ${transition} from this status`,
      notAllowedCode,
    );
  }

  const inProgressCode =
    transition === "pay"
      ? "CORRESPONDENT_COLLECTION_PAY_IN_PROGRESS"
      : transition === "confirm"
        ? "CORRESPONDENT_COLLECTION_CONFIRM_IN_PROGRESS"
        : "CORRESPONDENT_COLLECTION_CANCEL_IN_PROGRESS";

  throw new ApiError(
    409,
    `Correspondent collection ${transition} is already in progress`,
    inProgressCode,
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
        "Invalid correspondent collection status",
        "INVALID_CORRESPONDENT_COLLECTION_STATUS",
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

async function normalizeCreatePayload(payload, { companyId, membershipId, role }) {
  const correspondentMembershipId = normalizeCorrespondentMembershipId(
    payload,
    { membershipId, role },
  );
  const amount = normalizeAmount(payload.amount);
  const currency = normalizeCurrency(payload.currency);
  const beneficiaryName = normalizeRequiredString(
    payload.beneficiaryName ?? payload.customerName,
    "Beneficiary name is required",
    "INVALID_BENEFICIARY_NAME",
  );
  const beneficiaryPhone = normalizeOptionalString({
    errorCode: "INVALID_BENEFICIARY_PHONE",
    label: "Beneficiary phone",
    maxLength: 40,
    value: payload.beneficiaryPhone ?? payload.customerPhone,
  });
  const note = normalizeOptionalString({
    errorCode: "INVALID_COLLECTION_NOTE",
    label: "Note",
    maxLength: 300,
    value: payload.note ?? payload.description,
  });
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "Idempotency key is required",
    "IDEMPOTENCY_KEY_REQUIRED",
  );
  const payoutAndRate =
    role === "partner"
      ? await buildPartnerPayoutAndRateSnapshot({
          amount,
          companyId,
          currency,
          payload,
        })
      : {
          payoutAmount: normalizePayoutAmount(payload.payoutAmount),
          payoutCurrency: normalizePayoutCurrency(payload.payoutCurrency),
          ...normalizeRateSnapshot(payload, "COLLECTION"),
        };

  return {
    amount,
    beneficiaryName,
    beneficiaryPhone,
    correspondentMembershipId,
    currency,
    idempotencyKey,
    note,
    ...payoutAndRate,
    idempotencyPayload: {
      amount,
      beneficiaryName,
      beneficiaryPhone,
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency,
      note,
      ...payoutAndRate,
    },
  };
}

async function buildPartnerPayoutAndRateSnapshot({
  amount,
  companyId,
  currency,
  payload,
}) {
  if (currency !== "GNF") {
    throw new ApiError(
      400,
      "Correspondent transaction creation is only available for GNF correspondents",
      "CORRESPONDENT_TRANSACTION_GNF_ONLY",
    );
  }

  assertPartnerDoesNotSupplyRateFields(payload);

  const exchangeRate = await getCurrentCompanyExchangeRate({ companyId });
  const rateValue = Number(exchangeRate?.rate);

  if (!Number.isFinite(rateValue) || rateValue <= 0) {
    throw new ApiError(
      400,
      "No correspondent transaction rate is configured",
      "CORRESPONDENT_TRANSACTION_RATE_NOT_CONFIGURED",
    );
  }

  const payoutAmount = Math.floor(
    (amount * CORRESPONDENT_RATE_BASE_AMOUNT) / rateValue,
  );

  if (!Number.isSafeInteger(payoutAmount) || payoutAmount <= 0) {
    throw new ApiError(
      400,
      "Computed payout amount must be greater than 0",
      "INVALID_COLLECTION_PAYOUT_AMOUNT",
    );
  }

  return {
    payoutAmount,
    payoutCurrency: CORRESPONDENT_RATE_BASE_CURRENCY,
    rateValue,
    rateBaseAmount: CORRESPONDENT_RATE_BASE_AMOUNT,
    rateQuoteCurrency: CORRESPONDENT_RATE_QUOTE_CURRENCY,
    rateBaseCurrency: CORRESPONDENT_RATE_BASE_CURRENCY,
  };
}

function assertPartnerDoesNotSupplyRateFields(payload) {
  const hasForbiddenField = PARTNER_FORBIDDEN_RATE_FIELDS.some((field) => {
    const value = payload[field];

    return value !== undefined && value !== null && value !== "";
  });

  if (hasForbiddenField) {
    throw new ApiError(
      400,
      "Partner-created correspondent transactions cannot include payout or rate fields",
      "CORRESPONDENT_TRANSACTION_RATE_FIELDS_NOT_ALLOWED",
    );
  }
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

function normalizeCorrespondentMembershipId(payload, { membershipId, role }) {
  const requestedMembership =
    payload.correspondentMembershipId ?? payload.correspondentMembership;

  if (role === "partner") {
    const ownMembershipId = normalizeObjectId(
      membershipId,
      "Active membership ID",
      "INVALID_COMPANY_MEMBERSHIP",
    );

    if (
      requestedMembership !== undefined &&
      requestedMembership !== null &&
      requestedMembership !== "" &&
      !idsEqual(requestedMembership, ownMembershipId)
    ) {
      throw new ApiError(
        403,
        "Partners can only create collections for their own membership",
        "CORRESPONDENT_COLLECTION_OWN_MEMBERSHIP_REQUIRED",
      );
    }

    return ownMembershipId;
  }

  return normalizeObjectId(
    requestedMembership,
    "Correspondent membership ID",
    "INVALID_CORRESPONDENT_MEMBERSHIP",
  );
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

function normalizeAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      "Collection amount must be greater than 0",
      "INVALID_COLLECTION_AMOUNT",
    );
  }

  if (!Number.isInteger(amount)) {
    throw new ApiError(
      400,
      "FCFA/GNF amount must be an integer",
      "INVALID_COLLECTION_AMOUNT",
    );
  }

  return amount;
}

function normalizePayoutAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      "Collection payout amount must be greater than 0",
      "INVALID_COLLECTION_PAYOUT_AMOUNT",
    );
  }

  if (!Number.isInteger(amount)) {
    throw new ApiError(
      400,
      "FCFA/GNF payout amount must be an integer",
      "INVALID_COLLECTION_PAYOUT_AMOUNT",
    );
  }

  return amount;
}

function normalizeCurrency(value) {
  const currency = normalizeRequiredString(
    value,
    "Collection currency is required",
    "INVALID_COLLECTION_CURRENCY",
  ).toUpperCase();

  if (!VALID_CURRENCIES.has(currency)) {
    throw new ApiError(
      400,
      "Correspondent collection supports FCFA and GNF",
      "INVALID_COLLECTION_CURRENCY",
    );
  }

  return currency;
}

function normalizePayoutCurrency(value) {
  const currency = normalizeRequiredString(
    value,
    "Collection payout currency is required",
    "INVALID_COLLECTION_PAYOUT_CURRENCY",
  ).toUpperCase();

  if (!VALID_CURRENCIES.has(currency)) {
    throw new ApiError(
      400,
      "Collection payout currency must be FCFA or GNF",
      "INVALID_COLLECTION_PAYOUT_CURRENCY",
    );
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

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
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

function matchesCorrespondentSearch(membership, search) {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.toLowerCase();
  const user = membership.user;
  const searchable = [
    resolveUserName(user),
    user?.email,
    membership.currency,
    membership.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedSearch);
}

function compareCorrespondents(left, right) {
  const leftName = resolveUserName(left.user) ?? left.user?.email ?? "";
  const rightName = resolveUserName(right.user) ?? right.user?.email ?? "";

  return leftName.localeCompare(rightName);
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

  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  return null;
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
      "CORRESPONDENT_COLLECTION_MANAGER_REQUIRED",
    );
  }
}

function assertCreateAccess(role) {
  if (role !== "manager" && role !== "partner") {
    throw new ApiError(
      403,
      "Only managers and correspondent partners can create collections",
      "CORRESPONDENT_COLLECTION_PARTNER_OR_MANAGER_REQUIRED",
    );
  }
}

function assertCancelAccess(role) {
  if (role !== "manager" && role !== "partner") {
    throw new ApiError(
      403,
      "Only managers and correspondent partners can cancel collections",
      "CORRESPONDENT_COLLECTION_PARTNER_OR_MANAGER_REQUIRED",
    );
  }
}

function assertReadAccess(role) {
  if (role !== "manager" && role !== "partner") {
    throw new ApiError(
      403,
      "Access denied",
      "CORRESPONDENT_COLLECTION_ACCESS_DENIED",
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
