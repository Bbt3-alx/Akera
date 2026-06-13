import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import CompanyCashMovement from "../../models/CompanyCashMovement.js";

describe("CompanyCashMovement model", () => {
  it("validates a positive manager deposit movement", async () => {
    const movement = new CompanyCashMovement({
      company: new mongoose.Types.ObjectId(),
      type: "deposit",
      amount: 50000,
      currency: "FCFA",
      method: "cash",
      reference: "DEP-001",
      note: "Initial cash drawer",
      idempotencyKey: "cash-deposit-1",
      createdBy: new mongoose.Types.ObjectId(),
      previousBalance: 10000,
      currentBalance: 60000,
      ledgerEntries: [new mongoose.Types.ObjectId()],
    });

    await expect(movement.validate()).resolves.toBeUndefined();
  });

  it("has a unique company-scoped idempotency index", () => {
    expect(CompanyCashMovement.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            idempotencyKey: 1,
          },
          {
            unique: true,
          },
        ],
      ]),
    );
  });
});
