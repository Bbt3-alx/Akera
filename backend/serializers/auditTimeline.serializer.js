const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEYS = new Set(
  [
    "accessToken",
    "authToken",
    "beneficiaryCode",
    "beneficiaryCodeHash",
    "beneficiaryHash",
    "codeHash",
    "confirmPassword",
    "currentPassword",
    "currentTransactionPin",
    "idempotencyKey",
    "newPassword",
    "newTransactionPin",
    "password",
    "pin",
    "refreshToken",
    "resetToken",
    "secret",
    "token",
    "transactionPin",
    "verificationCode",
  ].map((key) => key.toLowerCase()),
);

const ACTION_LABELS = {
  ACCOUNT_OPERATION_COLLECTION_DEPOSIT: "Collection deposit recorded",
  ACCOUNT_OPERATION_CONFIRM: "Account operation confirmed",
  ACCOUNT_OPERATION_REJECT: "Account operation rejected",
  ACCOUNT_OPERATION_WITHDRAWAL_REQUEST: "Withdrawal requested",
  CANCEL: "Canceled",
  COMPANY_CASH_DEPOSIT: "Company cash deposit recorded",
  CORRESPONDENT_COLLECTION_CANCEL: "Correspondent collection canceled",
  CORRESPONDENT_COLLECTION_CONFIRM: "Correspondent collection confirmed",
  CORRESPONDENT_COLLECTION_CREATE: "Correspondent collection created",
  CORRESPONDENT_COLLECTION_PAY: "Correspondent collection paid",
  CORRESPONDENT_DELIVERY_CANCEL: "Correspondent delivery canceled",
  CORRESPONDENT_DELIVERY_CONFIRM: "Correspondent delivery confirmed",
  CORRESPONDENT_DELIVERY_CREATE: "Correspondent delivery created",
  CREATE: "Created",
  RECONCILIATION_ISSUE_RESOLVE: "Reconciliation issue resolved",
  RECONCILIATION_SCAN: "Reconciliation scan run",
  REMOTE_AGENT_AGENT_DEPOSIT: "Remote agent deposit recorded",
  REMOTE_AGENT_GROUP_CREATE: "Remote agent group created",
  REMOTE_AGENT_GROUP_MEMBER_ADD: "Remote agent member added",
  REMOTE_AGENT_GROUP_MEMBER_UPDATE: "Remote agent member updated",
  REMOTE_AGENT_GROUP_UPDATE: "Remote agent group updated",
  REMOTE_AGENT_PAYOUT_CANCEL: "Remote agent payout canceled",
  REMOTE_AGENT_PAYOUT_CREATE: "Remote agent payout created",
  REMOTE_AGENT_PAYOUT_PAY: "Remote agent payout paid",
  RESTORE: "Restored",
  SECURITY_TRANSACTION_PIN_CHANGE: "Transaction PIN changed",
  SECURITY_TRANSACTION_PIN_SETUP: "Transaction PIN configured",
  STATUS_CHANGE: "Status changed",
  TRANSACTION_CANCEL: "Transaction canceled",
  TRANSACTION_CREATE: "Transaction created",
  TRANSACTION_PAY: "Transaction paid",
  TRANSACTION_REVERSE: "Transaction reversed",
  UPDATE: "Updated",
};

const CATEGORY_BY_PREFIX = [
  ["SECURITY_", "security"],
  ["TRANSACTION_", "transactions"],
  ["COMPANY_CASH_", "company_cash"],
  ["ACCOUNT_OPERATION_", "account_operations"],
  ["CORRESPONDENT_COLLECTION_", "correspondent_collections"],
  ["CORRESPONDENT_DELIVERY_", "correspondent_deliveries"],
  ["REMOTE_AGENT_", "remote_agent_payouts"],
  ["RECONCILIATION_", "reconciliation"],
];

export function serializeAuditTimelineLog(log) {
  if (!log) {
    return null;
  }

  return {
    id: serializeId(log._id ?? log.id),
    action: log.action,
    actionLabel: getAuditActionLabel(log.action),
    category: getAuditActionCategory(log.action),
    collectionName: log.collectionName,
    targetId: serializeId(log.targetId),
    targetCode: log.targetCode,
    actor: serializeActor(log.userId),
    details: redactSensitiveValue(log.details),
    changes: redactSensitiveValue(log.changes),
    occurredAt: log.Timestamp,
  };
}

export function serializeAuditTimelineList(result) {
  return {
    logs: result.logs.map(serializeAuditTimelineLog),
    pagination: result.pagination,
    summary: result.summary,
  };
}

export function getAuditActionLabel(action) {
  return ACTION_LABELS[action] ?? sentenceCase(action);
}

export function getAuditActionCategory(action) {
  const category = CATEGORY_BY_PREFIX.find(([prefix]) => action?.startsWith(prefix));

  return category?.[1] ?? "general";
}

export function redactSensitiveValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isObjectIdLike(value)) {
    return value.toHexString();
  }

  if (isNodeBuffer(value)) {
    return value.toString("hex");
  }

  const serializedObjectId = getSerializedObjectIdHex(value);
  if (serializedObjectId) {
    return serializedObjectId;
  }

  if (value && typeof value === "object") {
    if (Object.keys(value).length === 0) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key)
          ? REDACTED_VALUE
          : redactSensitiveValue(nestedValue),
      ]),
    );
  }

  return value;
}

function isObjectIdLike(value) {
  return value && typeof value.toHexString === "function";
}

function isNodeBuffer(value) {
  return typeof Buffer !== "undefined" && Buffer.isBuffer(value);
}

function getSerializedObjectIdHex(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const bufferValue = value.buffer ?? (
    value.type === "Buffer" ? value.data : null
  );
  const bytes = getIndexedBytes(bufferValue);

  if (!bytes || bytes.length !== 12) {
    return null;
  }

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getIndexedBytes(value) {
  if (Array.isArray(value)) {
    return value.every(isByte) ? value : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const entries = Object.entries(value).sort(
    ([left], [right]) => Number(left) - Number(right),
  );

  if (
    entries.length === 0 ||
    !entries.every(([key, byte], index) => Number(key) === index && isByte(byte))
  ) {
    return null;
  }

  return entries.map(([, byte]) => byte);
}

function isByte(value) {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function isSensitiveKey(key) {
  const normalized = key.toLowerCase();

  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes("idempotencykey") ||
    normalized.includes("beneficiarycode") ||
    normalized.includes("codehash") ||
    normalized.includes("token") ||
    normalized.includes("password") ||
    normalized.includes("transactionpin")
  );
}

function serializeActor(user) {
  return {
    id: serializeId(user),
    name: getActorName(user),
    email: typeof user?.email === "string" ? user.email : null,
  };
}

function getActorName(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return fullName || user.name || user.email || null;
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

function sentenceCase(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "Audit event";
  }

  const spaced = value.toLowerCase().replace(/_/g, " ");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
