import { describe, expect, it } from "@jest/globals";

import { serializeRemoteAgentPayout } from "../../serializers/remoteAgentPayout.serializer.js";

describe("remote agent payout serializer", () => {
  it("returns safe payout fields without codes, idempotency, PIN, or audit metadata", () => {
    const result = serializeRemoteAgentPayout({
      _id: "payout-1",
      company: "company-1",
      payoutCode: "RAP-260620-ABCD",
      assignedAgentGroup: { _id: "group-1", balance: 100000 },
      createdByMembership: "manager-membership-1",
      createdBy: "manager-user-1",
      amount: 25000,
      currency: "FCFA",
      beneficiaryName: "Awa Traore",
      beneficiaryPhone: "+22370000000",
      note: "Bamako payout",
      status: "pending",
      beneficiaryCode: "SECRET-123456",
      beneficiaryCodeHash: "hashed-secret",
      beneficiaryCodeLast4: "3456",
      idempotencyKey: "payout-create-1",
      idempotencyPayload: { amount: 25000 },
      paymentIdempotencyKey: "pay-1",
      transactionPin: "123456",
      auditMetadata: { ipAddress: "127.0.0.1" },
      accountOperation: { _id: "operation-1", internal: true },
      paidBy: "agent-user-1",
      paidByMembership: "agent-membership-1",
      paidAt: "2026-06-20T10:00:00.000Z",
      canceledBy: undefined,
      canceledByMembership: undefined,
      canceledAt: undefined,
      cancelReason: undefined,
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:00:00.000Z",
    });

    expect(result).toEqual({
      id: "payout-1",
      company: "company-1",
      payoutCode: "RAP-260620-ABCD",
      assignedAgentGroup: "group-1",
      createdByMembership: "manager-membership-1",
      createdBy: "manager-user-1",
      amount: 25000,
      currency: "FCFA",
      beneficiaryName: "Awa Traore",
      beneficiaryPhone: "+22370000000",
      note: "Bamako payout",
      status: "pending",
      beneficiaryCodeLast4: "3456",
      accountOperation: "operation-1",
      paidBy: "agent-user-1",
      paidByMembership: "agent-membership-1",
      paidAt: "2026-06-20T10:00:00.000Z",
      canceledBy: undefined,
      canceledByMembership: undefined,
      canceledAt: undefined,
      cancelReason: undefined,
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET-123456");
    expect(JSON.stringify(result)).not.toContain("hashed-secret");
    expect(JSON.stringify(result)).not.toContain("payout-create-1");
    expect(JSON.stringify(result)).not.toContain("pay-1");
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("ipAddress");
    expect(JSON.stringify(result)).not.toContain("internal");
  });
});
