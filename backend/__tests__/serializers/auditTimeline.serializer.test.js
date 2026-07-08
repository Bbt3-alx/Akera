import mongoose from "mongoose";
import { describe, expect, it } from "@jest/globals";

import {
  getAuditActionCategory,
  getAuditActionLabel,
  redactSensitiveValue,
  serializeAuditTimelineLog,
} from "../../serializers/auditTimeline.serializer.js";

describe("audit timeline serializer", () => {
  it("serializes audit logs with labels, actor info, occurredAt, and redacted metadata", () => {
    const ids = {
      companyId: new mongoose.Types.ObjectId(),
      logId: new mongoose.Types.ObjectId(),
      targetId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
    };
    const occurredAt = new Date("2026-07-07T10:30:00.000Z");

    const result = serializeAuditTimelineLog({
      _id: ids.logId,
      action: "REMOTE_AGENT_PAYOUT_PAY",
      collectionName: "RemoteAgentPayout",
      targetId: ids.targetId,
      targetCode: "RAP-001",
      userId: {
        _id: ids.userId,
        email: "manager@akera.test",
        firstName: "Mariam",
        lastName: "Manager",
      },
      details: {
        amount: 25000,
        beneficiaryCode: "SECRET-CODE",
        nested: {
          transactionPin: "123456",
          status: "paid",
        },
      },
      changes: {
        paymentIdempotencyKey: "pay-1",
        status: { from: "pending", to: "paid" },
      },
      companyId: ids.companyId,
      Timestamp: occurredAt,
    });

    expect(result).toEqual({
      id: ids.logId.toHexString(),
      action: "REMOTE_AGENT_PAYOUT_PAY",
      actionLabel: "Remote agent payout paid",
      category: "remote_agent_payouts",
      collectionName: "RemoteAgentPayout",
      targetId: ids.targetId.toHexString(),
      targetCode: "RAP-001",
      actor: {
        id: ids.userId.toHexString(),
        name: "Mariam Manager",
        email: "manager@akera.test",
      },
      details: {
        amount: 25000,
        beneficiaryCode: "[REDACTED]",
        nested: {
          transactionPin: "[REDACTED]",
          status: "paid",
        },
      },
      changes: {
        paymentIdempotencyKey: "[REDACTED]",
        status: { from: "pending", to: "paid" },
      },
      occurredAt,
    });
    expect(JSON.stringify(result)).not.toContain("SECRET-CODE");
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("pay-1");
  });

  it("falls back for unknown actions and redacts arrays recursively", () => {
    expect(getAuditActionLabel("CUSTOM_EVENT")).toBe("Custom event");
    expect(getAuditActionCategory("CUSTOM_EVENT")).toBe("general");

    expect(
      redactSensitiveValue([{ token: "abc", note: "safe" }, { amount: 1 }]),
    ).toEqual([{ token: "[REDACTED]", note: "safe" }, { amount: 1 }]);
  });

  it("normalizes object ids, serialized object ids, dates, and empty metadata objects", () => {
    const objectId = new mongoose.Types.ObjectId();
    const serializedObjectId = {
      buffer: Object.fromEntries(objectId.id.entries()),
    };
    const paidAt = new Date("2026-07-07T11:00:00.000Z");

    expect(
      redactSensitiveValue({
        accountOperation: objectId,
        correspondentMembership: serializedObjectId,
        paidAt,
        emptyMetadata: {},
      }),
    ).toEqual({
      accountOperation: objectId.toHexString(),
      correspondentMembership: objectId.toHexString(),
      paidAt: paidAt.toISOString(),
      emptyMetadata: null,
    });
  });
});
