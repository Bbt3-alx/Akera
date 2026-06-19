import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import AccountOperation from "../../models/AccountOperation.js";
import Company from "../../models/Company.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  confirmWithdrawalRequest,
  createWithdrawalRequest,
  listAccountOperations,
  rejectWithdrawalRequest,
} from "../../services/accountOperation.service.js";

describe("account operation service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a pending withdrawal request without debiting membership or company balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const targetMembership = createMembership(ids);
    const operation = createOperation(ids, {
      status: "pending_confirmation",
      type: "withdrawal",
    });
    jest
      .spyOn(AccountOperation, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(targetMembership));
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([operation]);
    const membershipUpdate = jest.spyOn(CompanyMembership, "updateOne");
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await createWithdrawalRequest({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: withdrawalPayload(ids),
    });

    expect(result).toBe(operation);
    expect(operationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          targetMembership: ids.targetMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          type: "withdrawal",
          status: "pending_confirmation",
          amount: 2000000,
          currency: "GNF",
          previousBalance: 5000000,
          currentBalance: 5000000,
          collectorName: "Kallo",
          collectorPhone: "+224000000",
          note: "Settlement pickup",
          idempotencyKey: "withdrawal-1",
          idempotencyPayload: {
            amount: 2000000,
            collectorName: "Kallo",
            collectorPhone: "+224000000",
            currency: "GNF",
            note: "Settlement pickup",
            targetMembershipId: ids.targetMembershipId.toString(),
          },
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("rejects withdrawal idempotency retries with changed normalized payload", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(AccountOperation, "findOne").mockReturnValue(
      createSessionLeanQuery(
        createOperation(ids, {
          idempotencyPayload: {
            amount: 1000,
            collectorName: "Different",
            collectorPhone: undefined,
            currency: "GNF",
            note: undefined,
            targetMembershipId: ids.targetMembershipId.toString(),
          },
        }),
      ),
    );

    await expect(
      createWithdrawalRequest({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: withdrawalPayload(ids),
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });

  it("confirms a pending withdrawal once with guarded debit and account-operation ledger refs", async () => {
    mockMongooseSession();
    const ids = createIds();
    const operation = createOperation(ids, {
      save: jest.fn().mockResolvedValue(undefined),
      status: "pending_confirmation",
      type: "withdrawal",
    });
    const completedOperation = {
      ...operation,
      save: jest.fn().mockResolvedValue(undefined),
      status: "completed",
    };
    jest
      .spyOn(AccountOperation, "findOne")
      .mockReturnValue(createSessionQuery(operation));
    jest
      .spyOn(AccountOperation, "findOneAndUpdate")
      .mockResolvedValue(completedOperation);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue(
      {
        _id: ids.targetMembershipId,
        balance: 3000000,
      },
    );
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await confirmWithdrawalRequest({
      companyId: ids.companyId,
      membershipId: ids.targetMembershipId,
      userId: ids.partnerId,
      operationCode: "AOP-260619-ABCD",
    });

    expect(result).toBe(completedOperation);
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.targetMembershipId,
        company: ids.companyId,
        balance: { $gte: 2000000 },
      },
      { $inc: { balance: -2000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          accountOperation: ids.operationId,
          credit: 0,
          debit: 2000000,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          accountOperation: ids.operationId,
          credit: 2000000,
          debit: 0,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(completedOperation.currentBalance).toBe(3000000);
    expect(completedOperation.ledgerEntries).toEqual([
      ids.ledgerDebitId,
      ids.ledgerCreditId,
    ]);
    expect(completedOperation.save).toHaveBeenCalledWith({
      session: expect.any(Object),
    });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("returns completed withdrawal confirmations without double-debiting", async () => {
    mockMongooseSession();
    const ids = createIds();
    const operation = createOperation(ids, {
      status: "completed",
      type: "withdrawal",
    });
    jest
      .spyOn(AccountOperation, "findOne")
      .mockReturnValue(createSessionQuery(operation));
    const membershipDebit = jest.spyOn(CompanyMembership, "findOneAndUpdate");
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");

    const result = await confirmWithdrawalRequest({
      companyId: ids.companyId,
      membershipId: ids.targetMembershipId,
      userId: ids.partnerId,
      operationCode: "AOP-260619-ABCD",
    });

    expect(result).toBe(operation);
    expect(membershipDebit).not.toHaveBeenCalled();
    expect(ledgerInsert).not.toHaveBeenCalled();
  });

  it.each(["rejected", "reversed"])(
    "rejects confirmation when withdrawal is %s",
    async (status) => {
      mockMongooseSession();
      const ids = createIds();
      jest.spyOn(AccountOperation, "findOne").mockReturnValue(
        createSessionQuery(
          createOperation(ids, {
            status,
            type: "withdrawal",
          }),
        ),
      );

      await expect(
        confirmWithdrawalRequest({
          companyId: ids.companyId,
          membershipId: ids.targetMembershipId,
          userId: ids.partnerId,
          operationCode: "AOP-260619-ABCD",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "WITHDRAWAL_CONFIRMATION_NOT_ALLOWED",
      });
    },
  );

  it("prevents managers from confirming a partner withdrawal", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(AccountOperation, "findOne").mockReturnValue(
      createSessionQuery(
        createOperation(ids, {
          status: "pending_confirmation",
          type: "withdrawal",
        }),
      ),
    );

    await expect(
      confirmWithdrawalRequest({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        operationCode: "AOP-260619-ABCD",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "WITHDRAWAL_CONFIRM_TARGET_REQUIRED",
    });
  });

  it("rejects withdrawal confirmation when balance is insufficient", async () => {
    mockMongooseSession();
    const ids = createIds();
    const operation = createOperation(ids, {
      status: "pending_confirmation",
      type: "withdrawal",
    });
    jest
      .spyOn(AccountOperation, "findOne")
      .mockReturnValue(createSessionQuery(operation));
    jest
      .spyOn(AccountOperation, "findOneAndUpdate")
      .mockResolvedValue(operation);
    jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue(null);

    await expect(
      confirmWithdrawalRequest({
        companyId: ids.companyId,
        membershipId: ids.targetMembershipId,
        userId: ids.partnerId,
        operationCode: "AOP-260619-ABCD",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INSUFFICIENT_BALANCE",
    });
  });

  it("rejects a pending withdrawal without balance impact", async () => {
    mockMongooseSession();
    const ids = createIds();
    const operation = createOperation(ids, {
      save: jest.fn().mockResolvedValue(undefined),
      status: "pending_confirmation",
      type: "withdrawal",
    });
    jest
      .spyOn(AccountOperation, "findOne")
      .mockReturnValue(createSessionQuery(operation));
    const membershipDebit = jest.spyOn(CompanyMembership, "findOneAndUpdate");

    const result = await rejectWithdrawalRequest({
      companyId: ids.companyId,
      membershipId: ids.targetMembershipId,
      operationCode: "AOP-260619-ABCD",
    });

    expect(result.status).toBe("rejected");
    expect(result.rejectedAt).toBeInstanceOf(Date);
    expect(operation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(membershipDebit).not.toHaveBeenCalled();
  });

  it("scopes account operation lists for partners and managers", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(AccountOperation, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest.spyOn(AccountOperation, "countDocuments").mockResolvedValue(0);

    await listAccountOperations({
      companyId: ids.companyId,
      membershipId: ids.targetMembershipId,
      role: "partner",
      query: { status: "completed", type: "deposit" },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      targetMembership: ids.targetMembershipId,
      status: "completed",
      type: "deposit",
    });

    await listAccountOperations({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { targetMembershipId: ids.targetMembershipId.toString() },
    });

    expect(find).toHaveBeenLastCalledWith({
      company: ids.companyId,
      targetMembership: ids.targetMembershipId,
    });
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

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createSessionLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockReturnThis(),
  };
}

function createFindManyQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    ledgerCreditId: new mongoose.Types.ObjectId(),
    ledgerDebitId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    partnerId: new mongoose.Types.ObjectId(),
    targetMembershipId: new mongoose.Types.ObjectId(),
  };
}

function createMembership({ companyId, targetMembershipId, partnerId }) {
  return {
    _id: targetMembershipId,
    user: partnerId,
    company: companyId,
    role: "partner",
    status: "active",
    balance: 5000000,
    currency: "GNF",
  };
}

function createOperation(
  { companyId, managerId, managerMembershipId, operationId, targetMembershipId },
  override = {},
) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: targetMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    type: "withdrawal",
    status: "pending_confirmation",
    amount: 2000000,
    currency: "GNF",
    previousBalance: 5000000,
    currentBalance: 5000000,
    operationCode: "AOP-260619-ABCD",
    idempotencyKey: "withdrawal-1",
    idempotencyPayload: {
      amount: 2000000,
      collectorName: "Kallo",
      collectorPhone: "+224000000",
      currency: "GNF",
      note: "Settlement pickup",
      targetMembershipId: targetMembershipId.toString(),
    },
    collectorName: "Kallo",
    collectorPhone: "+224000000",
    note: "Settlement pickup",
    ledgerEntries: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function withdrawalPayload({ targetMembershipId }, override = {}) {
  return {
    targetMembershipId: targetMembershipId.toString(),
    amount: "2000000",
    currency: "gnf",
    collectorName: " Kallo ",
    collectorPhone: " +224000000 ",
    note: " Settlement pickup ",
    transactionPin: "123456",
    idempotencyKey: "withdrawal-1",
    ...override,
  };
}
