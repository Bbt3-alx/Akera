import Company from "../models/Company.js";
import CompanyExchangeRate from "../models/CompanyExchangeRate.js";
import CompanyInvitation from "../models/CompanyInvitation.js";
import Transaction from "../models/Transaction.js";
import { Types } from "mongoose";
import { ApiError } from "../middlewares/errorHandler.js";
import {
  CANONICAL_EXCHANGE_RATE_FROM,
  CANONICAL_EXCHANGE_RATE_TO,
} from "./companyExchangeRate.service.js";
import { getTrialBalanceForCompany } from "./transaction.service.js";
import {
  serializeDashboardTransactions,
  serializeId,
} from "../serializers/dashboard.serializer.js";

const COMPANY_TRANSACTION_ROLES = new Set(["manager", "employee"]);
const COUNTED_STATUSES = [
  "pending",
  "processing",
  "canceling",
  "completed",
  "canceled",
  "reversing",
  "reversed",
];

const transactionPartnerPopulate = {
  path: "membership",
  select: "user",
  populate: {
    path: "user",
    select: "firstName lastName name email",
  },
};

const transactionCreatedByPopulate = {
  path: "createdBy",
  select: "firstName lastName name email",
};

export async function getCompanyDashboard({
  companyId,
  membershipId,
  userId,
  role,
  now = new Date(),
}) {
  if (!companyId) {
    throw new ApiError(
      400,
      "Active company context is required",
      "COMPANY_CONTEXT_REQUIRED",
    );
  }

  const company = await Company.findById(companyId)
    .select("_id name baseCurrency balance")
    .lean();

  if (!company) {
    throw new ApiError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const companyObjectId = toObjectId(companyId, "Company ID");
  const transactionFilter = buildTransactionFilter({
    companyId: companyObjectId,
    membershipId,
    role,
    userId,
  });
  const accountingVisible = role === "manager";
  const invitationsVisible = role === "manager";

  const [
    exchangeRate,
    transactionSummary,
    recentTransactions,
    pendingInvitationCount,
    accounting,
  ] = await Promise.all([
    CompanyExchangeRate.findOne({ company: companyId }).lean(),
    getTransactionSummary({ filter: transactionFilter, now }),
    listRecentTransactions(transactionFilter),
    invitationsVisible
      ? CompanyInvitation.countDocuments({
          company: companyId,
          status: "pending",
        })
      : Promise.resolve(null),
    getAccountingSummary({
      companyId: companyObjectId,
      role,
      visible: accountingVisible,
    }),
  ]);

  return {
    company: {
      id: serializeId(company._id),
      name: company.name,
      baseCurrency: company.baseCurrency,
    },
    viewer: {
      role,
    },
    exchangeRate: serializeExchangeRate(exchangeRate),
    cash: serializeCash({ company, role }),
    transactions: {
      scope: role === "partner" ? "mine" : "company",
      counts: transactionSummary.counts,
      totals: transactionSummary.totals,
      recent: serializeDashboardTransactions(recentTransactions),
    },
    invitations: {
      visible: invitationsVisible,
      pendingCount: invitationsVisible ? pendingInvitationCount : null,
    },
    accounting,
  };
}

function buildTransactionFilter({ companyId, membershipId, role, userId }) {
  if (COMPANY_TRANSACTION_ROLES.has(role)) {
    return { company: companyId };
  }

  if (role === "partner") {
    const membershipObjectId = toObjectId(membershipId, "Membership ID");
    const userObjectId = toObjectId(userId, "User ID");

    return {
      company: companyId,
      $or: [
        { membership: membershipObjectId },
        { createdBy: userObjectId },
      ],
    };
  }

  throw new ApiError(403, "Access denied", "DASHBOARD_ACCESS_DENIED");
}

async function getTransactionSummary({ filter, now }) {
  const { start, end } = getDayBounds(now);
  const [summary = {}] = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: countStatus("pending"),
        processing: countStatus("processing"),
        canceling: countStatus("canceling"),
        completed: countStatus("completed"),
        canceled: countStatus("canceled"),
        reversing: countStatus("reversing"),
        reversed: countStatus("reversed"),
        completedCompanyAmount: sumCompanyAmountForStatus("completed"),
        pendingCompanyAmount: sumCompanyAmountForStatus("pending"),
        todayCompletedCompanyAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "completed"] },
                  { $gte: ["$processedAt", start] },
                  { $lt: ["$processedAt", end] },
                ],
              },
              "$companyAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  return normalizeTransactionSummary(summary);
}

function listRecentTransactions(filter) {
  return Transaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate(transactionPartnerPopulate)
    .populate(transactionCreatedByPopulate)
    .lean();
}

function countStatus(status) {
  return {
    $sum: {
      $cond: [{ $eq: ["$status", status] }, 1, 0],
    },
  };
}

function sumCompanyAmountForStatus(status) {
  return {
    $sum: {
      $cond: [{ $eq: ["$status", status] }, "$companyAmount", 0],
    },
  };
}

function normalizeTransactionSummary(summary) {
  return {
    counts: {
      ...Object.fromEntries(
        COUNTED_STATUSES.map((status) => [status, toNumber(summary[status])]),
      ),
      total: toNumber(summary.total),
    },
    totals: {
      completedCompanyAmount: toNumber(summary.completedCompanyAmount),
      pendingCompanyAmount: toNumber(summary.pendingCompanyAmount),
      todayCompletedCompanyAmount: toNumber(
        summary.todayCompletedCompanyAmount,
      ),
    },
  };
}

function serializeExchangeRate(exchangeRate) {
  if (!exchangeRate) {
    return {
      configured: false,
      rate: null,
      from: CANONICAL_EXCHANGE_RATE_FROM,
      to: CANONICAL_EXCHANGE_RATE_TO,
      updatedAt: null,
    };
  }

  return {
    configured: true,
    rate: exchangeRate.rate,
    from: exchangeRate.from ?? CANONICAL_EXCHANGE_RATE_FROM,
    to: exchangeRate.to ?? CANONICAL_EXCHANGE_RATE_TO,
    updatedAt: exchangeRate.updatedAt?.toISOString?.() ?? exchangeRate.updatedAt,
  };
}

function serializeCash({ company, role }) {
  if (role !== "manager") {
    return {
      visible: false,
      balance: null,
      currency: null,
    };
  }

  return {
    visible: true,
    balance: company.balance ?? 0,
    currency: company.baseCurrency ?? null,
  };
}

async function getAccountingSummary({ companyId, role, visible }) {
  if (!visible) {
    return {
      visible: false,
      trialBalance: null,
      error: null,
    };
  }

  try {
    const trialBalance = await getTrialBalanceForCompany({ companyId, role });

    return {
      visible: true,
      trialBalance,
      error: null,
    };
  } catch (error) {
    console.error("Dashboard trial balance failed", {
      companyId,
      errorCode: "TRIAL_BALANCE_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      visible: true,
      trialBalance: null,
      error: "TRIAL_BALANCE_ERROR",
    };
  }
}

function getDayBounds(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toObjectId(value, label) {
  if (typeof value?.toHexString === "function") {
    return value;
  }

  if (!Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${label} is invalid`, "INVALID_OBJECT_ID");
  }

  return new Types.ObjectId(value);
}
