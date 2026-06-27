import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import AccountOperation from "../../models/AccountOperation.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";
import CorrespondentDelivery from "../../models/CorrespondentDelivery.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  confirmCorrespondentCollection,
  createCorrespondentCollection,
} from "../../services/correspondentCollection.service.js";
import {
  confirmCorrespondentDelivery,
  createCorrespondentDelivery,
} from "../../services/correspondentDelivery.service.js";

describe("correspondent collection and delivery balance handoff", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("collection creation funds delivery and manager pay does not double-credit balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const collection = createCollection(ids, {
      amount: 328000000,
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "pending",
    });
    const paidCollection = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      paidAt: new Date("2026-06-27T10:00:00.000Z"),
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "paid",
    });
    const delivery = createDelivery(ids, {
      amount: 326000000,
      currency: "GNF",
      status: "pending",
    });
    const confirmedDelivery = createDelivery(ids, {
      amount: 326000000,
      currency: "GNF",
      save: jest.fn().mockResolvedValue(undefined),
      status: "confirmed",
    });

    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValueOnce(createSessionLeanQuery(null))
      .mockReturnValueOnce(createSessionQuery(collection));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery({
        _id: ids.correspondentMembershipId,
        balance: 0,
        company: ids.companyId,
        currency: "GNF",
        role: "partner",
        status: "active",
      }));
    jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(paidCollection);
    jest
      .spyOn(CorrespondentDelivery, "findOne")
      .mockReturnValueOnce(createSessionLeanQuery(null))
      .mockReturnValueOnce(createSessionQuery(delivery));
    jest
      .spyOn(CorrespondentDelivery, "findOneAndUpdate")
      .mockResolvedValue(confirmedDelivery);
    jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValueOnce({
        _id: ids.correspondentMembershipId,
        balance: 328000000,
      })
      .mockResolvedValueOnce({
        _id: ids.correspondentMembershipId,
        balance: 328000000,
        reservedBalance: 326000000,
      })
      .mockResolvedValueOnce({
        _id: ids.correspondentMembershipId,
        balance: 2000000,
        reservedBalance: 0,
      });
    jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValueOnce([
        createOperation(ids, {
          amount: 328000000,
          currentBalance: 328000000,
          previousBalance: 0,
          type: "deposit",
        }),
      ])
      .mockResolvedValueOnce([
        createOperation(ids, {
          amount: 326000000,
          currentBalance: 2000000,
          previousBalance: 328000000,
          type: "withdrawal",
        }),
      ]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    jest
      .spyOn(CorrespondentDelivery, "create")
      .mockResolvedValue([delivery]);

    await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      userId: ids.partnerUserId,
      payload: {
        amount: 328000000,
        beneficiaryName: "Kadidia",
        correspondentMembershipId: ids.correspondentMembershipId.toString(),
        currency: "GNF",
        idempotencyKey: "collection-create-kadidia",
        payoutAmount: 20000000,
        payoutCurrency: "FCFA",
      },
    });
    await confirmCorrespondentCollection({
      collectionCode: "CCL-260627-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      userId: ids.managerId,
    });
    await createCorrespondentDelivery({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      userId: ids.managerId,
      payload: {
        amount: 326000000,
        beneficiaryName: "Kallo",
        correspondentMembershipId: ids.correspondentMembershipId.toString(),
        currency: "GNF",
        idempotencyKey: "delivery-create-after-collection",
      },
    });
    await confirmCorrespondentDelivery({
      deliveryCode: "CDL-260627-ABCD",
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      userId: ids.partnerUserId,
    });

    expect(CompanyMembership.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        _id: ids.correspondentMembershipId,
        currency: "GNF",
      }),
      { $inc: { balance: 328000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        _id: ids.correspondentMembershipId,
        currency: "GNF",
      }),
      { $inc: { reservedBalance: 326000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        _id: ids.correspondentMembershipId,
        balance: { $gte: 326000000 },
        reservedBalance: { $gte: 326000000 },
      }),
      { $inc: { balance: -326000000, reservedBalance: -326000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(AccountOperation.create).toHaveBeenNthCalledWith(
      1,
      [
        expect.objectContaining({
          amount: 328000000,
          currentBalance: 328000000,
          previousBalance: 0,
          type: "deposit",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(AccountOperation.create).toHaveBeenNthCalledWith(
      2,
      [
        expect.objectContaining({
          amount: 326000000,
          currentBalance: 2000000,
          previousBalance: 328000000,
          type: "withdrawal",
        }),
      ],
      { session: expect.any(Object) },
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

function createIds() {
  return {
    collectionId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    deliveryId: new mongoose.Types.ObjectId(),
    ledgerCreditId: new mongoose.Types.ObjectId(),
    ledgerDebitId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    partnerUserId: new mongoose.Types.ObjectId(),
  };
}

function createCollection(
  { collectionId, companyId, correspondentMembershipId, managerId, managerMembershipId },
  override = {},
) {
  return {
    _id: collectionId,
    amount: 328000000,
    beneficiaryName: "Kadidia",
    company: companyId,
    correspondentMembership: correspondentMembershipId,
    createdBy: managerId,
    createdByMembership: managerMembershipId,
    currency: "GNF",
    collectionCode: "CCL-260627-ABCD",
    payoutAmount: 20000000,
    payoutCurrency: "FCFA",
    status: "pending",
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createDelivery(
  { companyId, correspondentMembershipId, deliveryId, managerId, managerMembershipId },
  override = {},
) {
  return {
    _id: deliveryId,
    amount: 326000000,
    beneficiaryName: "Kallo",
    company: companyId,
    correspondentMembership: correspondentMembershipId,
    createdBy: managerId,
    createdByMembership: managerMembershipId,
    currency: "GNF",
    deliveryCode: "CDL-260627-ABCD",
    idempotencyKey: "delivery-create-after-collection",
    idempotencyPayload: {
      amount: 326000000,
      beneficiaryName: "Kallo",
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency: "GNF",
    },
    status: "pending",
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createOperation({ companyId, correspondentMembershipId, managerId, managerMembershipId, operationId }, override = {}) {
  return {
    _id: operationId,
    amount: 328000000,
    company: companyId,
    createdBy: managerId,
    createdByMembership: managerMembershipId,
    currency: "GNF",
    currentBalance: 328000000,
    ledgerEntries: [],
    operationCode: "AOP-260627-ABCD",
    previousBalance: 0,
    save: jest.fn().mockResolvedValue(undefined),
    status: "completed",
    targetMembership: correspondentMembershipId,
    type: "deposit",
    workflow: "correspondent_collection",
    ...override,
  };
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
