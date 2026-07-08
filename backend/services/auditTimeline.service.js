import AuditLog from "../models/AuditLog.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SECURITY_ACTION_PREFIX = "SECURITY_";

export async function listAuditTimelineLogs({
  companyId,
  filters = {},
  pagination = {},
}) {
  const page = normalizePositiveInteger(pagination.page, DEFAULT_PAGE);
  const limit = Math.min(
    normalizePositiveInteger(pagination.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const query = buildAuditLogQuery(companyId, filters);

  const securityQuery = buildSecuritySummaryQuery(query);
  const [logs, total, today, security] = await Promise.all([
    AuditLog.find(query)
      .populate("userId", "firstName lastName name email")
      .sort({ Timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
    AuditLog.countDocuments({
      ...query,
      Timestamp: {
        ...(query.Timestamp ?? {}),
        $gte: startOfUtcDay(new Date()),
      },
    }),
    securityQuery ? AuditLog.countDocuments(securityQuery) : 0,
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    summary: {
      total,
      today,
      security,
    },
  };
}

function buildSecuritySummaryQuery(query) {
  if (typeof query.action === "string") {
    return query.action.startsWith(SECURITY_ACTION_PREFIX) ? query : null;
  }

  return {
    ...query,
    action: new RegExp(`^${escapeRegExp(SECURITY_ACTION_PREFIX)}`),
  };
}

export function buildAuditLogQuery(companyId, filters) {
  const query = { companyId };

  for (const key of ["action", "collectionName"]) {
    if (typeof filters[key] === "string" && filters[key].trim()) {
      query[key] = filters[key].trim();
    }
  }

  if (typeof filters.search === "string" && filters.search.trim()) {
    query.targetCode = new RegExp(escapeRegExp(filters.search.trim()), "i");
  }

  const timestampFilter = buildDateFilter(filters.from, filters.to);
  if (Object.keys(timestampFilter).length > 0) {
    query.Timestamp = timestampFilter;
  }

  return query;
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

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
