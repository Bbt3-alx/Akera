import { Types } from "mongoose";

import AuditLog from "../models/AuditLog.js";
import CorrespondentCollection from "../models/CorrespondentCollection.js";
import CorrespondentDelivery from "../models/CorrespondentDelivery.js";
import CorrespondentModificationRequest from "../models/CorrespondentModificationRequest.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { runTransaction } from "../utils/dbTransaction.js";

const VALID_STATUSES = new Set(["pending", "approved", "rejected"]);
const COLLECTION_EDITABLE_FIELDS = new Set([
  "amount",
  "currency",
  "payoutAmount",
  "payoutCurrency",
  "beneficiaryName",
  "beneficiaryPhone",
  "note",
]);
const DELIVERY_EDITABLE_FIELDS = new Set([
  "amount",
  "currency",
  "beneficiaryName",
  "beneficiaryPhone",
  "note",
]);

export async function createCorrespondentCollectionModificationRequest({
  collectionId,
  companyId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertPartnerOrManager(role);
  const targetId = normalizeObjectId(
    collectionId,
    "Correspondent collection ID",
    "INVALID_CORRESPONDENT_COLLECTION",
  );
  const collection = await CorrespondentCollection.findOne({
    _id: targetId,
    company: companyId,
    ...(role === "partner" && { correspondentMembership: membershipId }),
  }).lean();

  if (!collection) {
    throw new ApiError(
      404,
      "Correspondent collection not found",
      "CORRESPONDENT_COLLECTION_NOT_FOUND",
    );
  }

  return createModificationRequest({
    companyId,
    membershipId,
    payload,
    target: collection,
    targetId,
    targetType: "collection",
    userId,
  });
}

export async function createCorrespondentDeliveryModificationRequest({
  companyId,
  deliveryId,
  membershipId,
  payload = {},
  role,
  userId,
}) {
  assertPartnerOrManager(role);
  const targetId = normalizeObjectId(
    deliveryId,
    "Correspondent delivery ID",
    "INVALID_CORRESPONDENT_DELIVERY",
  );
  const delivery = await CorrespondentDelivery.findOne({
    _id: targetId,
    company: companyId,
    ...(role === "partner" && { correspondentMembership: membershipId }),
  }).lean();

  if (!delivery) {
    throw new ApiError(
      404,
      "Correspondent delivery not found",
      "CORRESPONDENT_DELIVERY_NOT_FOUND",
    );
  }

  return createModificationRequest({
    companyId,
    membershipId,
    payload,
    target: delivery,
    targetId,
    targetType: "delivery",
    userId,
  });
}

export async function listCorrespondentModificationRequests({
  companyId,
  membershipId,
  query = {},
  role,
}) {
  assertPartnerOrManager(role);
  const { page, limit } = normalizePagination(query);
  const filter = {
    company: companyId,
    ...(role === "partner" && { initiatedByMembership: membershipId }),
  };

  if (query.status) {
    if (!VALID_STATUSES.has(query.status)) {
      throw new ApiError(
        400,
        "Invalid correspondent modification request status",
        "INVALID_CORRESPONDENT_MODIFICATION_STATUS",
      );
    }

    filter.status = query.status;
  }

  const [requests, total] = await Promise.all([
    CorrespondentModificationRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "initiatedBy", select: "firstName lastName name email" })
      .populate({ path: "approvedBy", select: "firstName lastName name email" })
      .lean(),
    CorrespondentModificationRequest.countDocuments(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    requests,
  };
}

export async function approveCorrespondentModificationRequest({
  companyId,
  membershipId,
  requestId,
  role,
  userId,
}) {
  assertManager(role);
  const normalizedRequestId = normalizeObjectId(
    requestId,
    "Correspondent modification request ID",
    "INVALID_CORRESPONDENT_MODIFICATION_REQUEST",
  );

  return runTransaction(async (session) => {
    const request = await findPendingRequest({
      companyId,
      requestId: normalizedRequestId,
      session,
    });
    const model =
      request.targetType === "delivery"
        ? CorrespondentDelivery
        : CorrespondentCollection;

    const updatedTarget = await model.findOneAndUpdate(
      { _id: request.targetId, company: companyId },
      { $set: request.requestedValues },
      { new: true, session },
    );

    if (!updatedTarget) {
      throw new ApiError(
        404,
        "Correspondent modification target not found",
        "CORRESPONDENT_MODIFICATION_TARGET_NOT_FOUND",
      );
    }

    const decidedAt = new Date();
    const approved = await CorrespondentModificationRequest.findOneAndUpdate(
      { _id: normalizedRequestId, company: companyId, status: "pending" },
      {
        $set: {
          approvedBy: userId,
          approvedByMembership: membershipId,
          decidedAt,
          status: "approved",
        },
      },
      { new: true, session },
    );

    await writeModificationAudit({
      action: "CORRESPONDENT_MODIFICATION_REQUEST_APPROVE",
      companyId,
      request,
      userId,
      details: { status: "approved" },
      changes: {
        oldValues: request.oldValues,
        requestedValues: request.requestedValues,
      },
    });

    return approved;
  });
}

export async function rejectCorrespondentModificationRequest({
  companyId,
  membershipId,
  payload = {},
  requestId,
  role,
  userId,
}) {
  assertManager(role);
  const normalizedRequestId = normalizeObjectId(
    requestId,
    "Correspondent modification request ID",
    "INVALID_CORRESPONDENT_MODIFICATION_REQUEST",
  );
  const decisionReason = normalizeOptionalString({
    label: "Decision reason",
    maxLength: 300,
    value: payload.reason ?? payload.decisionReason,
  });

  return runTransaction(async (session) => {
    const request = await findPendingRequest({
      companyId,
      requestId: normalizedRequestId,
      session,
    });
    const decidedAt = new Date();
    const rejected = await CorrespondentModificationRequest.findOneAndUpdate(
      { _id: normalizedRequestId, company: companyId, status: "pending" },
      {
        $set: {
          approvedBy: userId,
          approvedByMembership: membershipId,
          decidedAt,
          decisionReason,
          status: "rejected",
        },
      },
      { new: true, session },
    );

    await writeModificationAudit({
      action: "CORRESPONDENT_MODIFICATION_REQUEST_REJECT",
      companyId,
      request,
      userId,
      details: { decisionReason, status: "rejected" },
      changes: {
        oldValues: request.oldValues,
        requestedValues: request.requestedValues,
      },
    });

    return rejected;
  });
}

async function createModificationRequest({
  companyId,
  membershipId,
  payload,
  target,
  targetId,
  targetType,
  userId,
}) {
  const requestedValues = normalizeRequestedValues(
    payload.requestedValues ?? payload.changes,
    targetType,
  );
  const reason = normalizeOptionalString({
    label: "Reason",
    maxLength: 300,
    value: payload.reason,
  });
  const oldValues = snapshotTargetValues(target, targetType);
  const request = await CorrespondentModificationRequest.create({
    company: companyId,
    targetType,
    targetId,
    oldValues,
    requestedValues,
    reason,
    initiatedBy: userId,
    initiatedByMembership: membershipId,
    status: "pending",
  });

  await writeModificationAudit({
    action: "CORRESPONDENT_MODIFICATION_REQUEST_CREATE",
    companyId,
    request,
    userId,
    details: {
      reason,
      requestedValues,
      targetId,
      targetType,
    },
  });

  return request;
}

async function findPendingRequest({ companyId, requestId, session }) {
  const request = await CorrespondentModificationRequest.findOne({
    _id: requestId,
    company: companyId,
    status: "pending",
  }).session(session);

  if (!request) {
    throw new ApiError(
      404,
      "Correspondent modification request not found",
      "CORRESPONDENT_MODIFICATION_REQUEST_NOT_FOUND",
    );
  }

  return request;
}

function normalizeRequestedValues(value, targetType) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(
      400,
      "Requested values are required",
      "INVALID_CORRESPONDENT_MODIFICATION_VALUES",
    );
  }

  const allowed =
    targetType === "delivery" ? DELIVERY_EDITABLE_FIELDS : COLLECTION_EDITABLE_FIELDS;
  const normalized = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowed.has(key)) {
      throw new ApiError(
        400,
        `Field ${key} cannot be modified`,
        "INVALID_CORRESPONDENT_MODIFICATION_FIELD",
      );
    }

    normalized[key] = normalizeRequestedValue(key, rawValue);
  }

  if (Object.keys(normalized).length === 0) {
    throw new ApiError(
      400,
      "Requested values are required",
      "INVALID_CORRESPONDENT_MODIFICATION_VALUES",
    );
  }

  return normalized;
}

function normalizeRequestedValue(key, value) {
  if (["amount", "payoutAmount"].includes(key)) {
    const amount = Number(value);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ApiError(
        400,
        "Modification amount must be a positive integer",
        "INVALID_CORRESPONDENT_MODIFICATION_AMOUNT",
      );
    }

    return amount;
  }

  if (["currency", "payoutCurrency"].includes(key)) {
    const currency = String(value ?? "").trim().toUpperCase();

    if (currency !== "FCFA" && currency !== "GNF") {
      throw new ApiError(
        400,
        "Modification currency must be FCFA or GNF",
        "INVALID_CORRESPONDENT_MODIFICATION_CURRENCY",
      );
    }

    return currency;
  }

  if (["beneficiaryName", "beneficiaryPhone", "note"].includes(key)) {
    return String(value ?? "").trim();
  }

  return value;
}

function snapshotTargetValues(target, targetType) {
  const fields =
    targetType === "delivery" ? DELIVERY_EDITABLE_FIELDS : COLLECTION_EDITABLE_FIELDS;
  const snapshot = {};

  for (const field of fields) {
    if (target[field] !== undefined) {
      snapshot[field] = target[field];
    }
  }

  snapshot.status = target.status;

  return snapshot;
}

async function writeModificationAudit({
  action,
  changes,
  companyId,
  details,
  request,
  userId,
}) {
  await AuditLog.create({
    action,
    collectionName: "CorrespondentModificationRequest",
    targetId: request._id,
    targetCode: request.targetId?.toString(),
    userId,
    companyId,
    details,
    changes,
  });
}

function normalizePagination(query) {
  const page = normalizePositiveInteger(query.page, 1, 100000);
  const limit = normalizePositiveInteger(query.limit, 25, 100);

  return { page, limit };
}

function normalizePositiveInteger(value, fallback, max) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeOptionalString({ label, maxLength, value }) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${label} is too long`,
      "INVALID_CORRESPONDENT_MODIFICATION_TEXT",
    );
  }

  return trimmed;
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

function assertPartnerOrManager(role) {
  if (role !== "partner" && role !== "manager") {
    throw new ApiError(
      403,
      "Only managers and correspondent partners can use modification requests",
      "CORRESPONDENT_MODIFICATION_ACCESS_DENIED",
    );
  }
}

function assertManager(role) {
  if (role !== "manager") {
    throw new ApiError(
      403,
      "Only managers can decide correspondent modification requests",
      "CORRESPONDENT_MODIFICATION_MANAGER_REQUIRED",
    );
  }
}
