import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import { serializeCompanyCashDeposit } from "../../serializers/companyCash.serializer.js";

describe("company cash serializer", () => {
  it("returns safe deposit fields without idempotency or PIN data", () => {
    const ids = {
      companyId: new mongoose.Types.ObjectId(),
      depositId: new mongoose.Types.ObjectId(),
      managerId: new mongoose.Types.ObjectId(),
    };

    const result = serializeCompanyCashDeposit({
      _id: ids.depositId,
      company: ids.companyId,
      type: "deposit",
      amount: 50000,
      currency: "FCFA",
      method: "cash",
      reference: "DEP-001",
      note: "Initial cash drawer",
      idempotencyKey: "cash-deposit-1",
      transactionPin: "123456",
      previousBalance: 10000,
      currentBalance: 60000,
      createdBy: ids.managerId,
      createdAt: new Date("2026-06-13T10:00:00.000Z"),
      updatedAt: new Date("2026-06-13T10:01:00.000Z"),
    });

    expect(result).toEqual({
      id: ids.depositId.toHexString(),
      company: ids.companyId.toHexString(),
      type: "deposit",
      amount: 50000,
      currency: "FCFA",
      method: "cash",
      reference: "DEP-001",
      note: "Initial cash drawer",
      previousBalance: 10000,
      currentBalance: 60000,
      createdBy: ids.managerId.toHexString(),
      createdAt: new Date("2026-06-13T10:00:00.000Z"),
      updatedAt: new Date("2026-06-13T10:01:00.000Z"),
    });
    expect(JSON.stringify(result)).not.toContain("cash-deposit-1");
    expect(JSON.stringify(result)).not.toContain("123456");
  });
});
