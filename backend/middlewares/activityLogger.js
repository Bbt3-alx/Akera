import morgan from "morgan";

const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_BODY_KEYS = new Set(
  [
    "accessToken",
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
    "token",
    "transactionPin",
    "verificationCode",
  ].map((key) => key.toLowerCase()),
);

export function sanitizeLogBody(body) {
  return sanitizeValue(body);
}

export function formatActivityLog(tokens, req, res) {
  return [
    `[${new Date().toISOString()}]`,
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    `${tokens["response-time"](req, res)}ms`,
    `User: ${req.user?.id || "anonymous"}`,
    `Body: ${JSON.stringify(sanitizeLogBody(req.body))}`,
  ].join(" ");
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_BODY_KEYS.has(key.toLowerCase())
          ? REDACTED_VALUE
          : sanitizeValue(nestedValue),
      ]),
    );
  }

  return value;
}

export const activityLogger = morgan(formatActivityLog);
