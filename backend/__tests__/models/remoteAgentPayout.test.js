import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import AccountOperation from "../../models/AccountOperation.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import RemoteAgentGroup from "../../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../../models/RemoteAgentPayout.js";

describe("RemoteAgentGroup model", () => {
  it("validates an active FCFA agent group with members and permissions", async () => {
    const group = new RemoteAgentGroup({
      company: new mongoose.Types.ObjectId(),
      name: "Bamako Team Safe",
      currency: "FCFA",
      balance: 100000,
      reservedBalance: 25000,
      status: "active",
      members: [
        {
          membership: new mongoose.Types.ObjectId(),
          role: "agent",
          permissions: [
            "remote_payout:view",
            "remote_payout:deposit",
            "remote_payout:pay",
          ],
          status: "active",
        },
        {
          membership: new mongoose.Types.ObjectId(),
          role: "supervisor",
          permissions: ["remote_payout:manage_group"],
          status: "inactive",
        },
      ],
    });

    await expect(group.validate()).resolves.toBeUndefined();
  });

  it("rejects non-FCFA groups", async () => {
    const group = new RemoteAgentGroup({
      company: new mongoose.Types.ObjectId(),
      name: "Bamako Team Safe",
      currency: "GNF",
      members: [
        {
          membership: new mongoose.Types.ObjectId(),
          permissions: ["remote_payout:view"],
        },
      ],
    });

    await expect(group.validate()).rejects.toThrow();
  });
});

describe("RemoteAgentPayout model", () => {
  it("validates a pending FCFA payout for an agent group", async () => {
    const payout = new RemoteAgentPayout({
      company: new mongoose.Types.ObjectId(),
      payoutCode: "RAP-260620-ABCD",
      assignedAgentGroup: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      amount: 25000,
      currency: "FCFA",
      beneficiaryName: "Awa Traore",
      beneficiaryPhone: "+22370000000",
      note: "Bamako payout",
      status: "pending",
      beneficiaryCodeHash: "hashed-beneficiary-code",
      beneficiaryCodeLast4: "1234",
      idempotencyKey: "payout-create-1",
      idempotencyPayload: {
        assignedAgentGroupId: new mongoose.Types.ObjectId().toString(),
        amount: 25000,
        currency: "FCFA",
        beneficiaryName: "Awa Traore",
      },
    });

    await expect(payout.validate()).resolves.toBeUndefined();
  });

  it("rejects non-FCFA payouts", async () => {
    const payout = new RemoteAgentPayout({
      company: new mongoose.Types.ObjectId(),
      payoutCode: "RAP-260620-ABCD",
      assignedAgentGroup: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      amount: 25000,
      currency: "GNF",
      beneficiaryName: "Awa Traore",
      status: "pending",
      beneficiaryCodeHash: "hashed-beneficiary-code",
      beneficiaryCodeLast4: "1234",
      idempotencyKey: "payout-create-1",
      idempotencyPayload: {},
    });

    await expect(payout.validate()).rejects.toThrow();
  });

  it("only allows pending, paid, and canceled statuses", () => {
    expect(RemoteAgentPayout.schema.path("status").enumValues).toEqual([
      "pending",
      "paid",
      "canceled",
    ]);
  });

  it("has lookup and idempotency indexes", () => {
    expect(RemoteAgentPayout.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            assignedAgentGroup: 1,
            status: 1,
            createdAt: -1,
          },
          {},
        ],
        [
          {
            company: 1,
            createdBy: 1,
            idempotencyKey: 1,
          },
          {
            unique: true,
            partialFilterExpression: {
              idempotencyKey: { $type: "string" },
            },
          },
        ],
      ]),
    );
  });
});

describe("remote payout schema integrations", () => {
  it("adds reservedBalance to company memberships", () => {
    const path = CompanyMembership.schema.path("reservedBalance");

    expect(path).toBeDefined();
    expect(path.defaultValue).toBe(0);
    expect(path.options.min).toBe(0);
  });

  it("adds remote payout links to account operations", () => {
    expect(AccountOperation.schema.path("workflow").enumValues).toEqual([
      "account_operation",
      "correspondent_collection",
      "remote_agent_payout",
    ]);
    expect(AccountOperation.schema.path("linkedRemoteAgentPayout").options.ref)
      .toBe("RemoteAgentPayout");
    expect(AccountOperation.schema.path("linkedRemoteAgentGroup").options.ref)
      .toBe("RemoteAgentGroup");
    expect(AccountOperation.schema.path("performedByMembership").options.ref)
      .toBe("CompanyMembership");
    expect(AccountOperation.schema.path("depositedByMembership").options.ref)
      .toBe("CompanyMembership");
  });
});
