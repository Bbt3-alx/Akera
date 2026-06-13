import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyCashMovement from "../../models/CompanyCashMovement.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  createDeposit,
  getCash,
} from "../../controllers/companyCash.controller.js";

describe("company cash controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns current company cash", async () => {
    const ids = createIds();
    jest.spyOn(Company, "findById").mockReturnValue(
      createCompanyQuery({
        _id: ids.companyId,
        balance: 25000,
        baseCurrency: "GNF",
      }),
    );
    const res = createResponse();

    await getCash(
      {
        context: {
          companyId: ids.companyId,
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        balance: 25000,
        currency: "GNF",
      },
    });
  });

  it("creates a deposit response and safe audit metadata", async () => {
    const session = mockMongooseSession();
    const ids = createIds();
    const movement = createMovement(ids);
    jest
      .spyOn(CompanyCashMovement, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest.spyOn(Company, "findById").mockReturnValue(
      createCompanyQuery({
        _id: ids.companyId,
        balance: 10000,
        baseCurrency: "FCFA",
      }),
    );
    jest.spyOn(CompanyCashMovement, "create").mockResolvedValue([movement]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.cashLedgerId }, { _id: ids.fundingLedgerId }]);
    jest.spyOn(Company, "updateOne").mockResolvedValue({ modifiedCount: 1 });
    const res = createResponse();

    await createDeposit(
      {
        body: {
          amount: 50000,
          currency: "FCFA",
          method: "cash",
          reference: "DEP-001",
          note: "Initial cash drawer",
          transactionPin: "123456",
          idempotencyKey: "cash-deposit-1",
        },
        context: {
          companyId: ids.companyId,
        },
        user: {
          id: ids.managerId,
        },
      },
      res,
    );

    expect(movement.save).toHaveBeenCalledWith({ session });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: ids.movementId.toHexString(),
        amount: 50000,
        currency: "FCFA",
        method: "cash",
        previousBalance: 10000,
        currentBalance: 60000,
      }),
    });
    expect(res.locals.audit).toEqual({
      targetId: ids.movementId,
      targetCode: "DEP-001",
      metadata: {
        amount: 50000,
        currency: "FCFA",
        method: "cash",
        reference: "DEP-001",
        note: "Initial cash drawer",
        previousBalance: 10000,
        currentBalance: 60000,
      },
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("transactionPin");
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
    expect(JSON.stringify(res.locals.audit)).not.toContain("idempotencyKey");
    expect(JSON.stringify(res.locals.audit)).not.toContain("cash-deposit-1");
  });
});

function mockMongooseSession() {
  const session = {
    endSession: jest.fn().mockResolvedValue(undefined),
    withTransaction: jest.fn(async (work) => {
      await work();
    }),
  };

  jest.spyOn(mongoose, "startSession").mockResolvedValue(session);

  return session;
}

function createCompanyQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
  };
}

function createSessionLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockReturnThis(),
  };
}

function createResponse() {
  return {
    locals: {},
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
}

function createIds() {
  return {
    cashLedgerId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    fundingLedgerId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    movementId: new mongoose.Types.ObjectId(),
  };
}

function createMovement({ companyId, managerId, movementId }) {
  return {
    _id: movementId,
    company: companyId,
    type: "deposit",
    amount: 50000,
    currency: "FCFA",
    method: "cash",
    reference: "DEP-001",
    note: "Initial cash drawer",
    idempotencyKey: "cash-deposit-1",
    createdBy: managerId,
    previousBalance: 10000,
    currentBalance: 60000,
    ledgerEntries: [],
    save: jest.fn().mockResolvedValue(undefined),
    createdAt: new Date("2026-06-13T10:00:00.000Z"),
    updatedAt: new Date("2026-06-13T10:01:00.000Z"),
  };
}
