import crypto from "node:crypto";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import AccountOperation from "../../models/AccountOperation.js";
import Company from "../../models/Company.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import RemoteAgentGroup from "../../models/RemoteAgentGroup.js";
import RemoteAgentPayout from "../../models/RemoteAgentPayout.js";
import {
  cancelRemoteAgentPayout,
  createRemoteAgentDeposit,
  createRemoteAgentPayout,
  lookupRemoteAgentPayoutByBeneficiaryCode,
  payRemoteAgentPayout,
} from "../../services/remoteAgentPayout.service.js";

describe("remote agent payout service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets an authorized group agent record a completed FCFA deposit without mutating company balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const group = createAgentGroup(ids);
    const updatedGroup = createAgentGroup(ids, {
      balance: 125000,
      reservedBalance: 0,
    });
    const operation = createAccountOperation(ids, {
      amount: 25000,
      currentBalance: 125000,
      previousBalance: 100000,
      type: "deposit",
    });
    jest.spyOn(AccountOperation, "findOne").mockReturnValue(
      createSessionLeanQuery(null),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(group),
    );
    jest
      .spyOn(RemoteAgentGroup, "findOneAndUpdate")
      .mockResolvedValue(updatedGroup);
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([operation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([
        { _id: ids.debitLedgerId },
        { _id: ids.creditLedgerId },
      ]);
    const companyUpdate = jest.spyOn(Company, "updateOne");
    const companyFindOneAndUpdate = jest.spyOn(Company, "findOneAndUpdate");

    const result = await createRemoteAgentDeposit({
      companyId: ids.companyId,
      membershipId: ids.depositorMembershipId,
      userId: ids.depositorUserId,
      role: "employee",
      groupId: ids.groupId.toString(),
      payload: depositPayload(),
    });

    expect(result).toBe(operation);
    expect(RemoteAgentGroup.findOne).toHaveBeenCalledWith({
      _id: ids.groupId,
      company: ids.companyId,
      status: "active",
      currency: "FCFA",
      members: {
        $elemMatch: {
          membership: ids.depositorMembershipId,
          permissions: "remote_payout:deposit",
          status: "active",
        },
      },
    });
    expect(RemoteAgentGroup.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.groupId,
        company: ids.companyId,
        status: "active",
        currency: "FCFA",
      },
      { $inc: { balance: 25000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(operationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          targetMembership: ids.depositorMembershipId,
          createdByMembership: ids.depositorMembershipId,
          createdBy: ids.depositorUserId,
          linkedRemoteAgentGroup: ids.groupId,
          performedByMembership: ids.depositorMembershipId,
          depositedByMembership: ids.depositorMembershipId,
          workflow: "remote_agent_payout",
          type: "deposit",
          status: "completed",
          amount: 25000,
          currency: "FCFA",
          previousBalance: 100000,
          currentBalance: 125000,
          idempotencyPayload: {
            amount: 25000,
            currency: "FCFA",
            method: "cash",
            note: "Bamako group funding",
            reference: "DEP-1",
          },
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(operationCreate.mock.calls[0][0][0].idempotencyPayload)
      .not.toHaveProperty("transactionPin");
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_AGENT,
          accountOperation: ids.operationId,
          currency: "FCFA",
          debit: 25000,
          credit: 0,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.AGENT_BALANCE,
          accountOperation: ids.operationId,
          currency: "FCFA",
          debit: 0,
          credit: 25000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(companyUpdate).not.toHaveBeenCalled();
    expect(companyFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects deposits from group members without deposit permission", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(AccountOperation, "findOne").mockReturnValue(
      createSessionLeanQuery(null),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(null),
    );
    const groupUpdate = jest.spyOn(RemoteAgentGroup, "findOneAndUpdate");

    await expect(
      createRemoteAgentDeposit({
        companyId: ids.companyId,
        membershipId: ids.noDepositMembershipId,
        userId: ids.noDepositUserId,
        role: "employee",
        groupId: ids.groupId.toString(),
        payload: depositPayload(),
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "REMOTE_PAYOUT_DEPOSIT_PERMISSION_REQUIRED",
    });
    expect(groupUpdate).not.toHaveBeenCalled();
  });

  it("creates a pending payout and atomically reserves only available group balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const reservedGroup = createAgentGroup(ids, {
      balance: 100000,
      reservedBalance: 25000,
    });
    const payout = createPayout(ids, { amount: 25000 });
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createSessionLeanQuery(null),
    );
    jest
      .spyOn(RemoteAgentGroup, "findOneAndUpdate")
      .mockResolvedValue(reservedGroup);
    const payoutCreate = jest
      .spyOn(RemoteAgentPayout, "create")
      .mockResolvedValue([payout]);

    const result = await createRemoteAgentPayout({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: payoutPayload(ids),
    });

    expect(result.payout).toBe(payout);
    expect(result.beneficiaryCode).toMatch(/^[0-9]{8}$/);
    expect(RemoteAgentGroup.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.groupId,
        company: ids.companyId,
        status: "active",
        currency: "FCFA",
        $expr: {
          $gte: [
            {
              $subtract: [
                "$balance",
                { $ifNull: ["$reservedBalance", 0] },
              ],
            },
            25000,
          ],
        },
      },
      { $inc: { reservedBalance: 25000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(payoutCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          assignedAgentGroup: ids.groupId,
          amount: 25000,
          currency: "FCFA",
          status: "pending",
          beneficiaryCodeHash: expect.any(String),
          beneficiaryCodeLast4: expect.stringMatching(/^[0-9]{4}$/),
          idempotencyPayload: {
            assignedAgentGroupId: ids.groupId.toString(),
            amount: 25000,
            beneficiaryName: "Awa Traore",
            beneficiaryPhone: "+22370000000",
            currency: "FCFA",
            note: "Remote payout",
          },
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(payoutCreate.mock.calls[0][0][0]).not.toHaveProperty(
      "beneficiaryCode",
    );
    expect(JSON.stringify(payoutCreate.mock.calls[0][0][0])).not.toContain(
      "123456",
    );
  });

  it("prevents two payout creations from reserving more than available group balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createSessionLeanQuery(null),
    );
    jest
      .spyOn(RemoteAgentGroup, "findOneAndUpdate")
      .mockResolvedValueOnce(createAgentGroup(ids, {
        balance: 100000,
        reservedBalance: 80000,
      }))
      .mockResolvedValueOnce(null);
    jest
      .spyOn(RemoteAgentPayout, "create")
      .mockResolvedValue([createPayout(ids, { amount: 80000 })]);

    await createRemoteAgentPayout({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: payoutPayload(ids, { amount: 80000 }),
    });

    await expect(
      createRemoteAgentPayout({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: payoutPayload(ids, {
          amount: 80000,
          idempotencyKey: "payout-2",
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INSUFFICIENT_AGENT_GROUP_AVAILABLE_BALANCE",
    });
    expect(RemoteAgentPayout.create).toHaveBeenCalledTimes(1);
  });

  it("requires a payment idempotency key before paying", async () => {
    mockMongooseSession();
    const ids = createIds();

    await expect(
      payRemoteAgentPayout({
        companyId: ids.companyId,
        membershipId: ids.payAgentMembershipId,
        role: "employee",
        userId: ids.payAgentUserId,
        payoutCode: "RAP-260620-ABCD",
        payload: { beneficiaryCode: "12345678" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "PAYMENT_IDEMPOTENCY_KEY_REQUIRED",
    });
  });

  it("lets any authorized group pay agent pay and records the actual paying membership", async () => {
    mockMongooseSession();
    const ids = createIds();
    const beneficiaryCode = "12345678";
    const payout = createPayout(ids, {
      beneficiaryCodeHash: hashBeneficiaryCodeForTest(beneficiaryCode),
    });
    const paidPayout = {
      ...payout,
      save: jest.fn().mockResolvedValue(undefined),
      status: "paid",
    };
    const updatedGroup = createAgentGroup(ids, {
      balance: 75000,
      reservedBalance: 0,
    });
    const operation = createAccountOperation(ids, {
      amount: 25000,
      currentBalance: 75000,
      previousBalance: 100000,
      type: "withdrawal",
    });
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createSessionQuery(payout),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(createAgentGroup(ids)),
    );
    jest
      .spyOn(RemoteAgentPayout, "findOneAndUpdate")
      .mockResolvedValue(paidPayout);
    jest
      .spyOn(RemoteAgentGroup, "findOneAndUpdate")
      .mockResolvedValue(updatedGroup);
    jest.spyOn(AccountOperation, "create").mockResolvedValue([operation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([
        { _id: ids.debitLedgerId },
        { _id: ids.creditLedgerId },
      ]);

    const result = await payRemoteAgentPayout({
      companyId: ids.companyId,
      membershipId: ids.payAgentMembershipId,
      role: "employee",
      userId: ids.payAgentUserId,
      payoutCode: payout.payoutCode,
      payload: {
        beneficiaryCode,
        paymentIdempotencyKey: "pay-1",
      },
    });

    expect(result).toBe(paidPayout);
    expect(RemoteAgentGroup.findOne).toHaveBeenCalledWith({
      _id: ids.groupId,
      company: ids.companyId,
      status: "active",
      currency: "FCFA",
      members: {
        $elemMatch: {
          membership: ids.payAgentMembershipId,
          permissions: "remote_payout:pay",
          status: "active",
        },
      },
    });
    expect(RemoteAgentPayout.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.payoutId,
        company: ids.companyId,
        status: "pending",
      },
      {
        $set: {
          status: "paid",
          paidBy: ids.payAgentUserId,
          paidByMembership: ids.payAgentMembershipId,
          paidAt: expect.any(Date),
          paymentIdempotencyKey: "pay-1",
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(RemoteAgentGroup.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.groupId,
        company: ids.companyId,
        balance: { $gte: 25000 },
        reservedBalance: { $gte: 25000 },
      },
      { $inc: { balance: -25000, reservedBalance: -25000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(AccountOperation.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          targetMembership: ids.payAgentMembershipId,
          createdByMembership: ids.payAgentMembershipId,
          createdBy: ids.payAgentUserId,
          linkedRemoteAgentGroup: ids.groupId,
          linkedRemoteAgentPayout: ids.payoutId,
          performedByMembership: ids.payAgentMembershipId,
          workflow: "remote_agent_payout",
          type: "withdrawal",
          status: "completed",
          previousBalance: 100000,
          currentBalance: 75000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.AGENT_BALANCE,
          debit: 25000,
          credit: 0,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_AGENT,
          debit: 0,
          credit: 25000,
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("returns a generic lookup error for non-members", async () => {
    const ids = createIds();
    const beneficiaryCode = "12345678";
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createLeanQuery(createPayout(ids, {
        beneficiaryCodeHash: hashBeneficiaryCodeForTest(beneficiaryCode),
      })),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createLeanQuery(null),
    );

    await expect(
      lookupRemoteAgentPayoutByBeneficiaryCode({
        companyId: ids.companyId,
        membershipId: ids.outsiderMembershipId,
        role: "employee",
        payload: { beneficiaryCode },
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "INVALID_OR_EXPIRED_PAYOUT_CODE",
      message: "Invalid or expired payout code",
    });
  });

  it("returns a generic payment error for members without pay permission", async () => {
    mockMongooseSession();
    const ids = createIds();
    const beneficiaryCode = "12345678";
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createSessionQuery(createPayout(ids, {
        beneficiaryCodeHash: hashBeneficiaryCodeForTest(beneficiaryCode),
      })),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(null),
    );
    const groupUpdate = jest.spyOn(RemoteAgentGroup, "findOneAndUpdate");
    const operationCreate = jest.spyOn(AccountOperation, "create");

    await expect(
      payRemoteAgentPayout({
        companyId: ids.companyId,
        membershipId: ids.noPayMembershipId,
        role: "employee",
        userId: ids.noPayUserId,
        payoutCode: "RAP-260620-ABCD",
        payload: {
          beneficiaryCode,
          paymentIdempotencyKey: "pay-1",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "INVALID_OR_EXPIRED_PAYOUT_CODE",
      message: "Invalid or expired payout code",
    });
    expect(groupUpdate).not.toHaveBeenCalled();
    expect(operationCreate).not.toHaveBeenCalled();
  });

  it("repeated pay with the same key does not double-debit balances", async () => {
    mockMongooseSession();
    const ids = createIds();
    const paidPayout = createPayout(ids, {
      paymentIdempotencyKey: "pay-1",
      status: "paid",
    });
    jest.spyOn(RemoteAgentPayout, "findOne").mockReturnValue(
      createSessionQuery(paidPayout),
    );
    jest.spyOn(RemoteAgentGroup, "findOne").mockReturnValue(
      createSessionQuery(createAgentGroup(ids)),
    );
    const groupUpdate = jest.spyOn(RemoteAgentGroup, "findOneAndUpdate");
    const operationCreate = jest.spyOn(AccountOperation, "create");

    const result = await payRemoteAgentPayout({
      companyId: ids.companyId,
      membershipId: ids.payAgentMembershipId,
      role: "employee",
      userId: ids.payAgentUserId,
      payoutCode: paidPayout.payoutCode,
      payload: {
        beneficiaryCode: "12345678",
        paymentIdempotencyKey: "pay-1",
      },
    });

    expect(result).toBe(paidPayout);
    expect(groupUpdate).not.toHaveBeenCalled();
    expect(operationCreate).not.toHaveBeenCalled();
  });

  it("cancel cannot release reserved group balance twice", async () => {
    mockMongooseSession();
    const ids = createIds();
    const payout = createPayout(ids);
    const canceledPayout = { ...payout, status: "canceled" };
    jest
      .spyOn(RemoteAgentPayout, "findOne")
      .mockReturnValueOnce(createSessionQuery(payout))
      .mockReturnValueOnce(createSessionQuery(canceledPayout));
    jest
      .spyOn(RemoteAgentPayout, "findOneAndUpdate")
      .mockResolvedValueOnce(canceledPayout);
    const groupUpdate = jest
      .spyOn(RemoteAgentGroup, "findOneAndUpdate")
      .mockResolvedValueOnce(createAgentGroup(ids, {
        balance: 100000,
        reservedBalance: 0,
      }));

    await cancelRemoteAgentPayout({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payoutCode: payout.payoutCode,
      payload: { reason: "Customer unavailable" },
    });

    await expect(
      cancelRemoteAgentPayout({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payoutCode: payout.payoutCode,
        payload: { reason: "Customer unavailable" },
      }),
    ).resolves.toBe(canceledPayout);
    expect(groupUpdate).toHaveBeenCalledTimes(1);
    expect(groupUpdate).toHaveBeenCalledWith(
      {
        _id: ids.groupId,
        company: ids.companyId,
        reservedBalance: { $gte: 25000 },
      },
      { $inc: { reservedBalance: -25000 } },
      { new: true, session: expect.any(Object) },
    );
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
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockResolvedValue(result),
  };
}

function createSessionLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockReturnThis(),
  };
}

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    creditLedgerId: new mongoose.Types.ObjectId(),
    debitLedgerId: new mongoose.Types.ObjectId(),
    depositorMembershipId: new mongoose.Types.ObjectId(),
    depositorUserId: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    noDepositMembershipId: new mongoose.Types.ObjectId(),
    noDepositUserId: new mongoose.Types.ObjectId(),
    noPayMembershipId: new mongoose.Types.ObjectId(),
    noPayUserId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    outsiderMembershipId: new mongoose.Types.ObjectId(),
    payAgentMembershipId: new mongoose.Types.ObjectId(),
    payAgentUserId: new mongoose.Types.ObjectId(),
    payoutId: new mongoose.Types.ObjectId(),
  };
}

function createAgentGroup(
  {
    companyId,
    depositorMembershipId,
    groupId,
    noPayMembershipId,
    payAgentMembershipId,
  },
  override = {},
) {
  return {
    _id: groupId,
    company: companyId,
    name: "Bamako Team Safe",
    currency: "FCFA",
    balance: 100000,
    reservedBalance: 0,
    status: "active",
    members: [
      {
        membership: depositorMembershipId,
        role: "agent",
        permissions: ["remote_payout:view", "remote_payout:deposit"],
        status: "active",
      },
      {
        membership: payAgentMembershipId,
        role: "agent",
        permissions: ["remote_payout:view", "remote_payout:pay"],
        status: "active",
      },
      {
        membership: noPayMembershipId,
        role: "agent",
        permissions: ["remote_payout:view"],
        status: "active",
      },
    ],
    ...override,
  };
}

function createPayout(
  { companyId, groupId, managerId, managerMembershipId, payoutId },
  override = {},
) {
  return {
    _id: payoutId,
    company: companyId,
    payoutCode: "RAP-260620-ABCD",
    assignedAgentGroup: groupId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    amount: 25000,
    currency: "FCFA",
    beneficiaryName: "Awa Traore",
    beneficiaryPhone: "+22370000000",
    note: "Remote payout",
    status: "pending",
    beneficiaryCodeHash: "hashed-code",
    beneficiaryCodeLast4: "5678",
    idempotencyKey: "payout-1",
    idempotencyPayload: {
      assignedAgentGroupId: groupId.toString(),
      amount: 25000,
      beneficiaryName: "Awa Traore",
      beneficiaryPhone: "+22370000000",
      currency: "FCFA",
      note: "Remote payout",
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createAccountOperation(
  {
    companyId,
    depositorMembershipId,
    depositorUserId,
    groupId,
    operationId,
    payAgentMembershipId,
    payAgentUserId,
  },
  override = {},
) {
  const isWithdrawal = override.type === "withdrawal";
  const actorMembershipId = isWithdrawal
    ? payAgentMembershipId
    : depositorMembershipId;
  const actorUserId = isWithdrawal ? payAgentUserId : depositorUserId;

  return {
    _id: operationId,
    company: companyId,
    targetMembership: actorMembershipId,
    createdByMembership: actorMembershipId,
    createdBy: actorUserId,
    linkedRemoteAgentGroup: groupId,
    performedByMembership: actorMembershipId,
    workflow: "remote_agent_payout",
    type: "deposit",
    status: "completed",
    amount: 25000,
    currency: "FCFA",
    previousBalance: 100000,
    currentBalance: 125000,
    operationCode: "AOP-260620-ABCD",
    ledgerEntries: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function depositPayload(override = {}) {
  return {
    amount: "25000",
    currency: "fcfa",
    method: "cash",
    reference: " DEP-1 ",
    note: " Bamako group funding ",
    idempotencyKey: "deposit-1",
    transactionPin: "123456",
    ...override,
  };
}

function payoutPayload({ groupId }, override = {}) {
  return {
    assignedAgentGroupId: groupId.toString(),
    amount: "25000",
    currency: "fcfa",
    beneficiaryName: " Awa Traore ",
    beneficiaryPhone: " +22370000000 ",
    note: " Remote payout ",
    idempotencyKey: "payout-1",
    transactionPin: "123456",
    ...override,
  };
}

function hashBeneficiaryCodeForTest(value) {
  return crypto
    .createHash("sha256")
    .update(String(value).trim())
    .digest("hex");
}
