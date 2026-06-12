import { describe, expect, it } from "@jest/globals";

import {
  formatActivityLog,
  sanitizeLogBody,
} from "../../middlewares/activityLogger.js";

describe("activity logger", () => {
  it("redacts sensitive request body fields recursively while preserving safe fields", () => {
    const body = {
      amount: 12500,
      transactionPin: "123456",
      password: "password-1",
      confirmPassword: "password-1",
      currentPassword: "old-password",
      newPassword: "new-password",
      verificationCode: "654321",
      resetToken: "reset-token",
      profile: {
        name: "Awa Diallo",
        token: "session-token",
        settings: {
          idempotencyKey: "idem-123",
          note: "manual reversal",
        },
      },
      attempts: [
        {
          pin: "111111",
          status: "failed",
        },
        {
          refreshToken: "refresh-token",
          status: "pending",
        },
      ],
    };

    expect(sanitizeLogBody(body)).toEqual({
      amount: 12500,
      transactionPin: "[REDACTED]",
      password: "[REDACTED]",
      confirmPassword: "[REDACTED]",
      currentPassword: "[REDACTED]",
      newPassword: "[REDACTED]",
      verificationCode: "[REDACTED]",
      resetToken: "[REDACTED]",
      profile: {
        name: "Awa Diallo",
        token: "[REDACTED]",
        settings: {
          idempotencyKey: "[REDACTED]",
          note: "manual reversal",
        },
      },
      attempts: [
        {
          pin: "[REDACTED]",
          status: "failed",
        },
        {
          refreshToken: "[REDACTED]",
          status: "pending",
        },
      ],
    });
  });

  it("formats activity logs with a redacted body", () => {
    const tokens = createTokens();
    const req = {
      body: {
        reason: "Manager correction",
        transactionPin: "123456",
        nested: {
          accessToken: "access-token",
        },
      },
      user: { id: "user-1" },
    };
    const res = {};

    const logLine = formatActivityLog(tokens, req, res);

    expect(logLine).toContain('"reason":"Manager correction"');
    expect(logLine).toContain('"transactionPin":"[REDACTED]"');
    expect(logLine).toContain('"accessToken":"[REDACTED]"');
    expect(logLine).not.toContain("123456");
    expect(logLine).not.toContain("access-token");
  });
});

function createTokens() {
  return {
    method: () => "POST",
    url: () => "/api/v1/transactions/AKR-000001/reverse",
    status: () => "200",
    "response-time": () => "12.345",
  };
}
