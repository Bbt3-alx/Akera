import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import AccountOperation from "../../models/AccountOperation.js";
import Company from "../../models/Company.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import CorrespondentDelivery from "../../models/CorrespondentDelivery.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  cancelCorrespondentDelivery,
  confirmCorrespondentDelivery,
  createCorrespondentDelivery,
  getCorrespondentDeliveryByCode,
  listCorrespondentDeliveries,
} from "../../services/correspondentDelivery.service.js";

describe("correspondent delivery service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("manager creates a pending delivery and reserves correspondent balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const reservedMembership = createMembership(ids, {
      balance: 326000000,
      reservedBalance: 200000000,
    });
    const delivery = createDelivery(ids);
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue(reservedMembership);
    const deliveryCreate = jest
      .spyOn(CorrespondentDelivery, "create")
      .mockResolvedValue([delivery]);
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await createCorrespondentDelivery({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: deliveryPayload(ids, { amount: 200000000 }),
    });

    expect(result).toBe(delivery);
    expect(membershipUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        status: "active",
        role: "partner",
        currency: "GNF",
        $expr: {
          $gte: [
            {
              $subtract: [
                "$balance",
                { $ifNull: ["$reservedBalance", 0] },
              ],
            },
            200000000,
          ],
        },
      },
      { $inc: { reservedBalance: 200000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(deliveryCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          correspondentMembership: ids.correspondentMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          amount: 200000000,
          currency: "GNF",
          status: "pending",
          beneficiaryName: "Kallo",
          beneficiaryPhone: "+22470000000",
          note: "Kallo collects from Kalil",
          rateValue: 82000,
          rateBaseAmount: 5000,
          rateQuoteCurrency: "GNF",
          rateBaseCurrency: "FCFA",
          counterAmount: 20000000,
          counterCurrency: "FCFA",
          rateNote: "Kalil sold GNF to Abdoulaye",
          idempotencyKey: "delivery-create-1",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("allows delivery for exact available balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue(
      createMembership(ids, {
        balance: 326000000,
        reservedBalance: 326000000,
      }),
    );
    jest
      .spyOn(CorrespondentDelivery, "create")
      .mockResolvedValue([createDelivery(ids, { amount: 326000000 })]);

    await expect(
      createCorrespondentDelivery({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: deliveryPayload(ids, { amount: 326000000 }),
      }),
    ).resolves.toEqual(expect.objectContaining({ amount: 326000000 }));
  });

  it("reservation prevents over-allocation across pending deliveries", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValueOnce(
        createMembership(ids, {
          balance: 326000000,
          reservedBalance: 200000000,
        }),
      )
      .mockResolvedValueOnce(null);
    jest
      .spyOn(CorrespondentDelivery, "create")
      .mockResolvedValueOnce([createDelivery(ids, { amount: 200000000 })]);

    await createCorrespondentDelivery({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: deliveryPayload(ids, {
        amount: 200000000,
        idempotencyKey: "delivery-create-1",
      }),
    });

    await expect(
      createCorrespondentDelivery({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: deliveryPayload(ids, {
          amount: 200000000,
          idempotencyKey: "delivery-create-2",
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INSUFFICIENT_CORRESPONDENT_AVAILABLE_BALANCE",
    });
  });

  it("manager lists all deliveries and partner lists only own deliveries", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(CorrespondentDelivery, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest.spyOn(CorrespondentDelivery, "countDocuments").mockResolvedValue(0);

    await listCorrespondentDeliveries({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { status: "pending" },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "pending",
    });

    await listCorrespondentDeliveries({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      query: {},
    });

    expect(find).toHaveBeenLastCalledWith({
      company: ids.companyId,
      correspondentMembership: ids.correspondentMembershipId,
    });
  });

  it("other partners cannot get or confirm another correspondent delivery", async () => {
    const ids = createIds();
    const findOne = jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValueOnce(createFindOneLeanQuery(null))
      .mockReturnValueOnce(createSessionQuery(createDelivery(ids)));

    await expect(
      getCorrespondentDeliveryByCode({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.otherPartnerMembershipId,
        role: "partner",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_DELIVERY_NOT_FOUND",
    });
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      deliveryCode: "CDL-260627-ABCD",
      correspondentMembership: ids.otherPartnerMembershipId,
    });

    mockMongooseSession();
    await expect(
      confirmCorrespondentDelivery({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.otherPartnerMembershipId,
        role: "partner",
        userId: ids.otherPartnerUserId,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_DELIVERY_ASSIGNED_PARTNER_REQUIRED",
    });
  });

  it("manager cannot confirm delivery", async () => {
    const ids = createIds();
    const findOne = jest.spyOn(CorrespondentDelivery, "findOne");

    await expect(
      confirmCorrespondentDelivery({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
        userId: ids.managerId,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_DELIVERY_PARTNER_CONFIRM_REQUIRED",
    });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("assigned partner confirms pending delivery and reduces balance and reservation", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createDelivery(ids, { status: "pending" });
    const confirmed = createDelivery(ids, {
      save: jest.fn().mockResolvedValue(undefined),
      status: "confirmed",
    });
    const operation = createAccountOperation(ids, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentDelivery, "findOneAndUpdate")
      .mockResolvedValue(confirmed);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 126000000,
      reservedBalance: 0,
    });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([operation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await confirmCorrespondentDelivery({
      deliveryCode: "CDL-260627-ABCD",
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      userId: ids.partnerUserId,
    });

    expect(result).toBe(confirmed);
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        role: "partner",
        status: "active",
        currency: "GNF",
        balance: { $gte: 200000000 },
        reservedBalance: { $gte: 200000000 },
      },
      { $inc: { balance: -200000000, reservedBalance: -200000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(AccountOperation.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          linkedCorrespondentDelivery: ids.deliveryId,
          workflow: "correspondent_collection",
          type: "withdrawal",
          status: "completed",
          amount: 200000000,
          currency: "GNF",
          previousBalance: 326000000,
          currentBalance: 126000000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          credit: 0,
          currency: "GNF",
          debit: 200000000,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          credit: 200000000,
          currency: "GNF",
          debit: 0,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(operation.ledgerEntries).toEqual([
      ids.ledgerDebitId,
      ids.ledgerCreditId,
    ]);
    expect(confirmed.accountOperation).toBe(ids.operationId);
    expect(confirmed.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it.each(["confirmed", "canceled"])(
    "rejects confirmation when delivery is %s",
    async (status) => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CorrespondentDelivery, "findOne")
        .mockReturnValue(createSessionQuery(createDelivery(ids, { status })));
      const operationCreate = jest.spyOn(AccountOperation, "create");

      await expect(
        confirmCorrespondentDelivery({
          deliveryCode: "CDL-260627-ABCD",
          companyId: ids.companyId,
          membershipId: ids.correspondentMembershipId,
          role: "partner",
          userId: ids.partnerUserId,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "CORRESPONDENT_DELIVERY_CONFIRM_NOT_ALLOWED",
      });
      expect(operationCreate).not.toHaveBeenCalled();
    },
  );

  it("manager cancels pending delivery and releases reservation", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createDelivery(ids, { status: "pending" });
    const canceled = createDelivery(ids, {
      cancelReason: "Beneficiary unavailable",
      status: "canceled",
    });
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentDelivery, "findOneAndUpdate")
      .mockResolvedValue(canceled);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 326000000,
      reservedBalance: 0,
    });
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");

    const result = await cancelCorrespondentDelivery({
      deliveryCode: "CDL-260627-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      payload: { reason: "Beneficiary unavailable" },
      role: "manager",
      userId: ids.managerId,
    });

    expect(result).toBe(canceled);
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        reservedBalance: { $gte: 200000000 },
      },
      { $inc: { reservedBalance: -200000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(ledgerInsert).not.toHaveBeenCalled();
  });

  it("rejects cancellation for confirmed deliveries", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValue(createSessionQuery(createDelivery(ids, { status: "confirmed" })));

    await expect(
      cancelCorrespondentDelivery({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        payload: {},
        role: "manager",
        userId: ids.managerId,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CORRESPONDENT_DELIVERY_CANCEL_NOT_ALLOWED",
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

function createFindOneLeanQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    deliveryId: new mongoose.Types.ObjectId(),
    ledgerCreditId: new mongoose.Types.ObjectId(),
    ledgerDebitId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    otherPartnerMembershipId: new mongoose.Types.ObjectId(),
    otherPartnerUserId: new mongoose.Types.ObjectId(),
    partnerUserId: new mongoose.Types.ObjectId(),
  };
}

function createMembership(
  { companyId, correspondentMembershipId, partnerUserId },
  override = {},
) {
  return {
    _id: correspondentMembershipId,
    company: companyId,
    user: partnerUserId,
    role: "partner",
    status: "active",
    currency: "GNF",
    balance: 326000000,
    reservedBalance: 0,
    ...override,
  };
}

function createDelivery(
  {
    companyId,
    correspondentMembershipId,
    deliveryId,
    managerId,
    managerMembershipId,
  },
  override = {},
) {
  return {
    _id: deliveryId,
    company: companyId,
    correspondentMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    deliveryCode: "CDL-260627-ABCD",
    amount: 200000000,
    currency: "GNF",
    status: "pending",
    beneficiaryName: "Kallo",
    beneficiaryPhone: "+22470000000",
    note: "Kallo collects from Kalil",
    rateValue: 82000,
    rateBaseAmount: 5000,
    rateQuoteCurrency: "GNF",
    rateBaseCurrency: "FCFA",
    counterAmount: 20000000,
    counterCurrency: "FCFA",
    rateNote: "Kalil sold GNF to Abdoulaye",
    idempotencyKey: "delivery-create-1",
    idempotencyPayload: {
      amount: 200000000,
      beneficiaryName: "Kallo",
      beneficiaryPhone: "+22470000000",
      correspondentMembershipId: correspondentMembershipId.toString(),
      counterAmount: 20000000,
      counterCurrency: "FCFA",
      currency: "GNF",
      note: "Kallo collects from Kalil",
      rateBaseAmount: 5000,
      rateBaseCurrency: "FCFA",
      rateNote: "Kalil sold GNF to Abdoulaye",
      rateQuoteCurrency: "GNF",
      rateValue: 82000,
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createAccountOperation(
  {
    companyId,
    correspondentMembershipId,
    managerMembershipId,
    operationId,
    partnerUserId,
  },
  override = {},
) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: partnerUserId,
    workflow: "correspondent_collection",
    type: "withdrawal",
    status: "completed",
    amount: 200000000,
    currency: "GNF",
    previousBalance: 326000000,
    currentBalance: 126000000,
    operationCode: "AOP-260627-ABCD",
    ledgerEntries: [],
    ...override,
  };
}

function deliveryPayload({ correspondentMembershipId }, override = {}) {
  return {
    amount: 200000000,
    beneficiaryName: " Kallo ",
    beneficiaryPhone: " +22470000000 ",
    correspondentMembershipId: correspondentMembershipId.toString(),
    counterAmount: 20000000,
    counterCurrency: "FCFA",
    currency: "gnf",
    idempotencyKey: "delivery-create-1",
    note: " Kallo collects from Kalil ",
    rateBaseAmount: 5000,
    rateBaseCurrency: "FCFA",
    rateNote: " Kalil sold GNF to Abdoulaye ",
    rateQuoteCurrency: "GNF",
    rateValue: 82000,
    transactionPin: "123456",
    ...override,
  };
}
