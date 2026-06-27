import crypto from "node:crypto";
import { Types } from "mongoose";

import { ACCOUNTS } from "../constants/accounts.js";
import AccountOperation from "../models/AccountOperation.js";
import CompanyMembership from "../models/CompanyMembership.js";
import CorrespondentCollection from "../models/CorrespondentCollection.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { generateAccountOperationCode } from "./accountOperation.service.js";
import { writeJournalEntries } from "./ledger.service.js";

const VALID_LIST_STATUSES = new Set(["pending", "confirmed", "canceled"]);

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
  assertManager(role, "Only managers can create correspondent collections");
  const normalized = normalizeCreatePayload(payload);

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
      currency: "FCFA",
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
          currency: normalized.currency,
          status: "pending",
          customerName: normalized.customerName,
          customerPhone: normalized.customerPhone,
          note: normalized.note,
          idempotencyKey: normalized.idempotencyKey,
          idempotencyPayload: normalized.idempotencyPayload,
        },
      ],
      { session },
    );

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
  assertManager(role, "Only managers can confirm correspondent collections");

  return runTransaction(async (session) => {
    const collection = await findCollectionByCode({
      collectionCode,
      companyId,
      session,
    });

    if (collection.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending correspondent collections can be confirmed",
        "CORRESPONDENT_COLLECTION_CONFIRM_NOT_ALLOWED",
      );
    }

    const confirmedAt = new Date();
    const confirmedCollection = await CorrespondentCollection.findOneAndUpdate(
      {
        _id: collection._id,
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

    if (!confirmedCollection) {
      await throwConcurrentTransitionError({
        collectionId: collection._id,
        companyId,
        session,
        transition: "confirm",
      });
    }

    const updatedMembership = await CompanyMembership.findOneAndUpdate(
      {
        _id: collection.correspondentMembership,
        company: companyId,
        role: "partner",
        status: "active",
        currency: "FCFA",
      },
      { $inc: { balance: collection.amount } },
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
    const previousBalance = currentBalance - collection.amount;
    const [operation] = await AccountOperation.create(
      [
        {
          company: companyId,
          targetMembership: collection.correspondentMembership,
          createdByMembership: membershipId,
          createdBy: userId,
          linkedCorrespondentCollection: collection._id,
          workflow: "correspondent_collection",
          type: "deposit",
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
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          currency: collection.currency,
          debit: collection.amount,
          credit: 0,
        },
        {
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          currency: collection.currency,
          debit: 0,
          credit: collection.amount,
        },
      ],
    });

    operation.ledgerEntries = ledgerEntries.map((entry) => entry._id);
    await operation.save({ session });

    confirmedCollection.accountOperation = operation._id;
    await confirmedCollection.save({ session });

    return confirmedCollection;
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
  assertManager(role, "Only managers can cancel correspondent collections");
  const normalized = normalizeCancelPayload(payload);

  return runTransaction(async (session) => {
    const collection = await findCollectionByCode({
      collectionCode,
      companyId,
      session,
    });

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
    throw new ApiError(
      400,
      `Correspondent collection cannot ${transition} from this status`,
      transition === "confirm"
        ? "CORRESPONDENT_COLLECTION_CONFIRM_NOT_ALLOWED"
        : "CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED",
    );
  }

  throw new ApiError(
    409,
    `Correspondent collection ${transition} is already in progress`,
    transition === "confirm"
      ? "CORRESPONDENT_COLLECTION_CONFIRM_IN_PROGRESS"
      : "CORRESPONDENT_COLLECTION_CANCEL_IN_PROGRESS",
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

function normalizeCreatePayload(payload) {
  const correspondentMembershipId = normalizeObjectId(
    payload.correspondentMembershipId ?? payload.correspondentMembership,
    "Correspondent membership ID",
    "INVALID_CORRESPONDENT_MEMBERSHIP",
  );
  const amount = normalizeAmount(payload.amount);
  const currency = normalizeFcfaCurrency(payload.currency);
  const customerName = normalizeRequiredString(
    payload.customerName,
    "Customer name is required",
    "INVALID_CUSTOMER_NAME",
  );
  const customerPhone = normalizeOptionalString({
    errorCode: "INVALID_CUSTOMER_PHONE",
    label: "Customer phone",
    maxLength: 40,
    value: payload.customerPhone,
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

  return {
    amount,
    correspondentMembershipId,
    currency,
    customerName,
    customerPhone,
    idempotencyKey,
    note,
    idempotencyPayload: {
      amount,
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency,
      customerName,
      customerPhone,
      note,
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
      "FCFA amount must be an integer",
      "INVALID_COLLECTION_AMOUNT",
    );
  }

  return amount;
}

function normalizeFcfaCurrency(value) {
  const currency = normalizeRequiredString(
    value,
    "Collection currency is required",
    "INVALID_COLLECTION_CURRENCY",
  ).toUpperCase();

  if (currency !== "FCFA") {
    throw new ApiError(
      400,
      "Correspondent collection MVP only supports FCFA",
      "INVALID_COLLECTION_CURRENCY",
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
