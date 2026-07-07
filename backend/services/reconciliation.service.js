import CorrespondentCollection from "../models/CorrespondentCollection.js";
import Payment from "../models/Payment.js";
import Receipt from "../models/Receipt.js";
import ReconciliationIssue from "../models/ReconciliationIssue.js";
import RemoteAgentPayout from "../models/RemoteAgentPayout.js";
import Transaction from "../models/Transaction.js";
import { ApiError } from "../middlewares/errorHandler.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function scanCompanyReconciliation({ companyId, from, to }) {
  const detectedAt = new Date();
  const dateFilter = buildDateFilter(from, to);
  const scopedDateFilter = Object.keys(dateFilter).length
    ? { createdAt: dateFilter }
    : {};
  const transactionDateFilter = Object.keys(dateFilter).length
    ? { date: dateFilter }
    : {};

  const [transactions, payments, receipts, collections, payouts] =
    await Promise.all([
      Transaction.find({
        company: companyId,
        ...transactionDateFilter,
      }).lean(),
      Payment.find({
        company: companyId,
        ...scopedDateFilter,
      }).lean(),
      Receipt.find({
        company: companyId,
        ...scopedDateFilter,
      }).lean(),
      CorrespondentCollection.find({
        company: companyId,
        ...scopedDateFilter,
      }).lean(),
      RemoteAgentPayout.find({
        company: companyId,
        ...scopedDateFilter,
      }).lean(),
    ]);

  const candidates = [
    ...detectTransactionIssues(transactions, receipts, payments, detectedAt),
    ...detectPaymentIssues(payments, receipts, detectedAt),
    ...detectCorrespondentCollectionIssues(collections, detectedAt),
    ...detectRemoteAgentPayoutIssues(payouts, detectedAt),
  ].map((issue) => ({ ...issue, company: companyId }));

  let created = 0;

  for (const candidate of candidates) {
    const existing = await ReconciliationIssue.findOne({
      company: companyId,
      issueType: candidate.issueType,
      sourceKey: candidate.sourceKey,
      status: "open",
    });

    if (existing) {
      continue;
    }

    await ReconciliationIssue.create(candidate);
    created += 1;
  }

  const open = await ReconciliationIssue.countDocuments({
    company: companyId,
    status: "open",
  });

  return {
    created,
    open,
    scanned: {
      collections: collections.length,
      payments: payments.length,
      payouts: payouts.length,
      receipts: receipts.length,
      transactions: transactions.length,
    },
    detectedAt,
  };
}

export async function listReconciliationIssues({
  companyId,
  filters = {},
  pagination = {},
}) {
  const page = normalizePositiveInteger(pagination.page, DEFAULT_PAGE);
  const limit = Math.min(
    normalizePositiveInteger(pagination.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const query = buildIssueQuery(companyId, filters);

  const [issues, total, summary] = await Promise.all([
    ReconciliationIssue.find(query)
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReconciliationIssue.countDocuments(query),
    getIssueSummary(companyId),
  ]);

  return {
    issues,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    summary,
  };
}

export async function resolveReconciliationIssue({
  companyId,
  issueId,
  userId,
  note,
}) {
  const normalizedNote = normalizeResolutionNote(note);
  const issue = await ReconciliationIssue.findOne({
    _id: issueId,
    company: companyId,
  });

  if (!issue) {
    throw new ApiError(
      404,
      "Reconciliation issue not found",
      "RECONCILIATION_ISSUE_NOT_FOUND",
    );
  }

  if (issue.status === "resolved") {
    return issue;
  }

  issue.status = "resolved";
  issue.resolvedAt = new Date();
  issue.resolvedBy = userId;
  issue.resolutionNote = normalizedNote;

  await issue.save();

  return issue;
}

function detectTransactionIssues(transactions, receipts, payments, detectedAt) {
  const receiptTransactionIds = new Set(
    receipts.map((receipt) => toId(receipt.transaction)).filter(Boolean),
  );
  const activePaymentsByReference = new Set(
    payments
      .filter((payment) => payment.status !== "cancelled")
      .map((payment) => payment.reference)
      .filter(Boolean),
  );

  return transactions.flatMap((transaction) => {
    const issues = [];
    const transactionId = toId(transaction._id);
    const referenceCode = transaction.transactionCode;
    const amount = transaction.companyAmount ?? transaction.partnerAmount;
    const currency = transaction.companyCurrency ?? transaction.partnerCurrency;

    if (
      transaction.status === "completed" &&
      !receiptTransactionIds.has(transactionId)
    ) {
      issues.push(
        buildIssue({
          workflowType: "transaction",
          issueType: "paid_transaction_missing_receipt",
          severity: "critical",
          collectionName: "Transaction",
          documentId: transaction._id,
          referenceCode,
          expectedAmount: amount,
          actualAmount: 0,
          currency,
          detectedAt,
        }),
      );
    }

    if (
      ["canceled", "reversed"].includes(transaction.status) &&
      activePaymentsByReference.has(referenceCode)
    ) {
      issues.push(
        buildIssue({
          workflowType: "transaction",
          issueType: "inactive_transaction_has_active_payment",
          severity: "warning",
          collectionName: "Transaction",
          documentId: transaction._id,
          referenceCode,
          expectedAmount: 0,
          actualAmount: amount,
          currency,
          detectedAt,
        }),
      );
    }

    return issues;
  });
}

function detectPaymentIssues(payments, receipts, detectedAt) {
  const receiptNumbers = new Set(
    receipts.map((receipt) => receipt.receiptNumber).filter(Boolean),
  );

  return payments
    .filter((payment) => payment.status === "completed")
    .filter(
      (payment) =>
        !payment.reference || !receiptNumbers.has(payment.reference),
    )
    .map((payment) =>
      buildIssue({
        workflowType: "payment",
        issueType: "payment_missing_receipt",
        severity: "warning",
        collectionName: "Payment",
        documentId: payment._id,
        referenceCode: payment.reference ?? toId(payment._id),
        expectedAmount: payment.amount,
        actualAmount: 0,
        currency: payment.currency,
        detectedAt,
      }),
    );
}

function detectCorrespondentCollectionIssues(collections, detectedAt) {
  return collections
    .filter(
      (collection) =>
        ["paid", "confirmed"].includes(collection.status) &&
        !collection.accountOperation,
    )
    .map((collection) =>
      buildIssue({
        workflowType: "correspondent_collection",
        issueType: "correspondent_collection_missing_account_operation",
        severity: "warning",
        collectionName: "CorrespondentCollection",
        documentId: collection._id,
        referenceCode: collection.collectionCode,
        expectedAmount: collection.amount,
        actualAmount: 0,
        currency: collection.currency,
        detectedAt,
      }),
    );
}

function detectRemoteAgentPayoutIssues(payouts, detectedAt) {
  return payouts
    .filter((payout) => payout.status === "paid" && !payout.accountOperation)
    .map((payout) =>
      buildIssue({
        workflowType: "remote_agent_payout",
        issueType: "remote_agent_payout_missing_account_operation",
        severity: "warning",
        collectionName: "RemoteAgentPayout",
        documentId: payout._id,
        referenceCode: payout.payoutCode,
        expectedAmount: payout.amount,
        actualAmount: 0,
        currency: payout.currency,
        detectedAt,
      }),
    );
}

function buildIssue({
  workflowType,
  issueType,
  severity,
  collectionName,
  documentId,
  referenceCode,
  expectedAmount,
  actualAmount,
  currency,
  detectedAt,
}) {
  const difference =
    typeof expectedAmount === "number" && typeof actualAmount === "number"
      ? expectedAmount - actualAmount
      : null;

  return {
    workflowType,
    issueType,
    severity,
    status: "open",
    sourceRefs: [
      {
        collectionName,
        documentId,
        code: referenceCode,
      },
    ],
    sourceKey: `${collectionName}:${toId(documentId)}`,
    expectedAmount,
    actualAmount,
    currency,
    difference,
    referenceCode,
    detectedAt,
  };
}

function buildIssueQuery(companyId, filters) {
  const query = { company: companyId };

  for (const key of ["status", "severity", "workflowType"]) {
    if (typeof filters[key] === "string" && filters[key].trim()) {
      query[key] = filters[key].trim();
    }
  }

  if (typeof filters.search === "string" && filters.search.trim()) {
    query.referenceCode = new RegExp(escapeRegExp(filters.search.trim()), "i");
  }

  const detectedAt = buildDateFilter(filters.from, filters.to);
  if (Object.keys(detectedAt).length > 0) {
    query.detectedAt = detectedAt;
  }

  return query;
}

async function getIssueSummary(companyId) {
  const [open, resolved, critical] = await Promise.all([
    ReconciliationIssue.countDocuments({ company: companyId, status: "open" }),
    ReconciliationIssue.countDocuments({
      company: companyId,
      status: "resolved",
    }),
    ReconciliationIssue.countDocuments({
      company: companyId,
      severity: "critical",
      status: "open",
    }),
  ]);

  return { critical, open, resolved };
}

function buildDateFilter(from, to) {
  const filter = {};

  if (from) {
    filter.$gte = new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    filter.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  return filter;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeResolutionNote(note) {
  const normalized = typeof note === "string" ? note.trim() : "";

  if (!normalized) {
    throw new ApiError(
      400,
      "Resolution note is required",
      "RECONCILIATION_RESOLUTION_NOTE_REQUIRED",
    );
  }

  if (normalized.length > 500) {
    throw new ApiError(
      400,
      "Resolution note must be 500 characters or fewer",
      "RECONCILIATION_RESOLUTION_NOTE_TOO_LONG",
    );
  }

  return normalized;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value === "object") {
    return toId(value._id ?? value.id);
  }

  return value.toString();
}
