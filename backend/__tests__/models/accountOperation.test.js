import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import AccountOperation from "../../models/AccountOperation.js";
import LedgerEntry from "../../models/LedgerEntry.js";

describe("AccountOperation model", () => {
  it("validates a completed deposit operation", async () => {
    const operation = new AccountOperation({
      company: new mongoose.Types.ObjectId(),
      targetMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      type: "deposit",
      status: "completed",
      amount: 2000000,
      currency: "GNF",
      previousBalance: 100000,
      currentBalance: 2100000,
      operationCode: "AOP-260619-ABCD",
      idempotencyKey: "collection-1",
    });

    await expect(operation.validate()).resolves.toBeUndefined();
  });

  it("has operation lookup and idempotency indexes", () => {
    expect(AccountOperation.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            targetMembership: 1,
            createdAt: -1,
          },
          {},
        ],
        [
          {
            company: 1,
            operationCode: 1,
          },
          {},
        ],
        [
          {
            operationCode: 1,
          },
          {
            unique: true,
          },
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

  it("adds an indexed ledger reference for account operations", () => {
    expect(LedgerEntry.schema.path("accountOperation").options.ref).toBe(
      "AccountOperation",
    );
    expect(LedgerEntry.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            accountOperation: 1,
          },
          {},
        ],
      ]),
    );
  });
});
