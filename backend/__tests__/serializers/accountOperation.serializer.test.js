import { describe, expect, it } from "@jest/globals";

import { serializeAccountOperation } from "../../serializers/accountOperation.serializer.js";

describe("account operation serializer", () => {
  it("returns public fields without idempotency, PIN, raw ledger docs, or audit metadata", () => {
    const result = serializeAccountOperation({
      _id: "operation-1",
      company: "company-1",
      targetMembership: { _id: "target-membership-1", balance: 5000 },
      createdByMembership: "creator-membership-1",
      createdBy: "creator-user-1",
      linkedTransaction: { _id: "transaction-1", status: "pending" },
      linkedCorrespondentDelivery: { _id: "delivery-1", internal: true },
      linkedRemoteAgentPayout: { _id: "payout-1", status: "pending" },
      linkedRemoteAgentGroup: { _id: "group-1", internal: true },
      performedByMembership: { _id: "performer-membership-1" },
      depositedByMembership: { _id: "depositor-membership-1" },
      workflow: "remote_agent_payout",
      type: "withdrawal",
      status: "pending_confirmation",
      amount: 2000,
      currency: "GNF",
      previousBalance: 5000,
      currentBalance: 5000,
      operationCode: "AOP-260619-ABCD",
      idempotencyKey: "secret-idem",
      transactionPin: "123456",
      collectorName: "Kallo",
      collectorPhone: "+224000000",
      note: "Settlement",
      ledgerEntries: [
        { _id: "ledger-1", debit: 2000, credit: 0, internal: true },
      ],
      auditMetadata: { ipAddress: "127.0.0.1" },
      idempotencyPayload: { amount: 2000 },
      createdAt: "2026-06-19T10:00:00.000Z",
      updatedAt: "2026-06-19T10:00:00.000Z",
    });

    expect(result).toEqual({
      id: "operation-1",
      company: "company-1",
      targetMembership: "target-membership-1",
      createdByMembership: "creator-membership-1",
      createdBy: "creator-user-1",
      linkedTransaction: "transaction-1",
      linkedCorrespondentDelivery: "delivery-1",
      linkedRemoteAgentPayout: "payout-1",
      linkedRemoteAgentGroup: "group-1",
      performedByMembership: "performer-membership-1",
      depositedByMembership: "depositor-membership-1",
      workflow: "remote_agent_payout",
      type: "withdrawal",
      status: "pending_confirmation",
      amount: 2000,
      currency: "GNF",
      previousBalance: 5000,
      currentBalance: 5000,
      operationCode: "AOP-260619-ABCD",
      collectorName: "Kallo",
      collectorPhone: "+224000000",
      reference: undefined,
      note: "Settlement",
      confirmedByMembership: undefined,
      confirmedBy: undefined,
      confirmedAt: undefined,
      rejectedAt: undefined,
      reversedAt: undefined,
      reversedBy: undefined,
      reversedReason: undefined,
      ledgerEntries: ["ledger-1"],
      createdAt: "2026-06-19T10:00:00.000Z",
      updatedAt: "2026-06-19T10:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("secret-idem");
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("ipAddress");
    expect(JSON.stringify(result)).not.toContain("internal");
  });
});
