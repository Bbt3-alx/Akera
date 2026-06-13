import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import Company from "../../models/Company.js";
import CompanyCashMovement from "../../models/CompanyCashMovement.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  createCompanyCashDeposit,
  getCompanyCash,
} from "../../services/companyCash.service.js";

describe("company cash service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns current company cash for an active company member", async () => {
    const ids = createIds();
    const companyQuery = createCompanyQuery({
      _id: ids.companyId,
      balance: 75000,
      baseCurrency: "FCFA",
    });
    const findById = jest.spyOn(Company, "findById").mockReturnValue(companyQuery);

    await expect(getCompanyCash({ companyId: ids.companyId })).resolves.toEqual({
      balance: 75000,
      currency: "FCFA",
    });

    expect(findById).toHaveBeenCalledWith(ids.companyId);
    expect(companyQuery.select).toHaveBeenCalledWith("balance baseCurrency");
  });

  it("rejects cash reads when the company is missing", async () => {
    jest.spyOn(Company, "findById").mockReturnValue(createCompanyQuery(null));

    await expect(
      getCompanyCash({ companyId: new mongoose.Types.ObjectId() }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "COMPANY_NOT_FOUND",
    });
  });

  it("creates a manager deposit with balanced ledger entries and increments company balance", async () => {
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
    const movementCreate = jest
      .spyOn(CompanyCashMovement, "create")
      .mockResolvedValue([movement]);
    const ledgerEntries = [
      { _id: ids.cashLedgerId },
      { _id: ids.fundingLedgerId },
    ];
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue(ledgerEntries);
    const companyUpdate = jest
      .spyOn(Company, "updateOne")
      .mockResolvedValue({ modifiedCount: 1 });

    const result = await createCompanyCashDeposit({
      companyId: ids.companyId,
      userId: ids.managerId,
      payload: createPayload(),
    });

    expect(result).toBe(movement);
    expect(movement.previousBalance).toBe(10000);
    expect(movement.currentBalance).toBe(60000);
    expect(movement.ledgerEntries).toEqual([
      ids.cashLedgerId,
      ids.fundingLedgerId,
    ]);
    expect(movement.save).toHaveBeenCalledWith({ session });
    expect(movementCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          type: "deposit",
          amount: 50000,
          currency: "FCFA",
          method: "cash",
          reference: "DEP-001",
          note: "Initial cash drawer",
          idempotencyKey: "cash-deposit-1",
          createdBy: ids.managerId,
          previousBalance: 10000,
          currentBalance: 60000,
        }),
      ],
      { session },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          accountCode: ACCOUNTS.COMPANY_CASH,
          currency: "FCFA",
          debit: 50000,
          credit: 0,
          createdBy: ids.managerId,
        }),
        expect.objectContaining({
          company: ids.companyId,
          accountCode: ACCOUNTS.CASH_FUNDING_SOURCE,
          currency: "FCFA",
          debit: 0,
          credit: 50000,
          createdBy: ids.managerId,
        }),
      ],
      { session },
    );
    expect(companyUpdate).toHaveBeenCalledWith(
      { _id: ids.companyId },
      { $inc: { balance: 50000 } },
      { session },
    );
  });

  it("returns an existing deposit for a company-scoped idempotent retry", async () => {
    mockMongooseSession();
    const ids = createIds();
    const existingMovement = createMovement(ids);
    const findOne = jest
      .spyOn(CompanyCashMovement, "findOne")
      .mockReturnValue(createSessionLeanQuery(existingMovement));
    const companyFindById = jest.spyOn(Company, "findById");
    const movementCreate = jest.spyOn(CompanyCashMovement, "create");
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await createCompanyCashDeposit({
      companyId: ids.companyId,
      userId: ids.managerId,
      payload: createPayload(),
    });

    expect(result).toBe(existingMovement);
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      idempotencyKey: "cash-deposit-1",
    });
    expect(companyFindById).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
    expect(ledgerInsert).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("does not increment company balance if ledger creation fails", async () => {
    mockMongooseSession();
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
      .mockRejectedValue(new Error("ledger failed"));
    const companyUpdate = jest.spyOn(Company, "updateOne");

    await expect(
      createCompanyCashDeposit({
        companyId: ids.companyId,
        userId: ids.managerId,
        payload: createPayload(),
      }),
    ).rejects.toThrow("ledger failed");

    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["missing amount", { amount: undefined }, "INVALID_DEPOSIT_AMOUNT"],
    ["zero amount", { amount: 0 }, "INVALID_DEPOSIT_AMOUNT"],
    ["negative amount", { amount: -1 }, "INVALID_DEPOSIT_AMOUNT"],
    ["infinite amount", { amount: Number.POSITIVE_INFINITY }, "INVALID_DEPOSIT_AMOUNT"],
    ["invalid method", { method: "wire" }, "INVALID_DEPOSIT_METHOD"],
    ["missing idempotency key", { idempotencyKey: "" }, "IDEMPOTENCY_KEY_REQUIRED"],
  ])("rejects %s before opening a transaction", async (_label, override, errorCode) => {
    const startSession = jest.spyOn(mongoose, "startSession");

    await expect(
      createCompanyCashDeposit({
        companyId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        payload: createPayload(override),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode,
    });
    expect(startSession).not.toHaveBeenCalled();
  });

  it("rejects deposits whose currency differs from company baseCurrency", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CompanyCashMovement, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest.spyOn(Company, "findById").mockReturnValue(
      createCompanyQuery({
        _id: ids.companyId,
        balance: 10000,
        baseCurrency: "GNF",
      }),
    );
    const movementCreate = jest.spyOn(CompanyCashMovement, "create");

    await expect(
      createCompanyCashDeposit({
        companyId: ids.companyId,
        userId: ids.managerId,
        payload: createPayload({ currency: "FCFA" }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "DEPOSIT_CURRENCY_MISMATCH",
    });
    expect(movementCreate).not.toHaveBeenCalled();
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
  };
}

function createPayload(override = {}) {
  return {
    amount: 50000,
    currency: "FCFA",
    method: "cash",
    reference: " DEP-001 ",
    note: " Initial cash drawer ",
    transactionPin: "123456",
    idempotencyKey: "cash-deposit-1",
    ...override,
  };
}
