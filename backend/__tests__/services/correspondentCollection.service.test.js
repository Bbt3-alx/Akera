import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import AccountOperation from "../../models/AccountOperation.js";
import Company from "../../models/Company.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  cancelCorrespondentCollection,
  confirmCorrespondentCollection,
  createCorrespondentCollection,
  getCorrespondentCollectionByCode,
  listCorrespondentCollections,
} from "../../services/correspondentCollection.service.js";

describe("correspondent collection service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("manager creates a pending collection for an active partner membership", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { role: "partner" });
    const collection = createCollection(ids);
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    const membershipFind = jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    const membershipUpdate = jest.spyOn(CompanyMembership, "findOneAndUpdate");
    const companyUpdate = jest.spyOn(Company, "updateOne");
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: collectionPayload(ids),
    });

    expect(result).toBe(collection);
    expect(membershipFind).toHaveBeenCalledWith({
      _id: ids.correspondentMembershipId,
      company: ids.companyId,
      status: "active",
      role: "partner",
      currency: "FCFA",
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          correspondentMembership: ids.correspondentMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          amount: 25000,
          currency: "FCFA",
          status: "pending",
          customerName: "Client Bamako",
          customerPhone: "+22370000000",
          note: "Market collection",
          idempotencyKey: "collection-create-1",
          idempotencyPayload: {
            amount: 25000,
            correspondentMembershipId: ids.correspondentMembershipId.toString(),
            currency: "FCFA",
            customerName: "Client Bamako",
            customerPhone: "+22370000000",
            note: "Market collection",
          },
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
    expect(ledgerInsert).not.toHaveBeenCalled();
  });

  it.each([
    ["employee", { role: "employee", status: "active" }],
    ["inactive partner", { role: "partner", status: "suspended" }],
  ])("rejects collection creation for %s membership", async (_label, override) => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids, override),
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_MEMBERSHIP_NOT_FOUND",
    });
  });

  it.each([
    [{ amount: 0 }, "INVALID_COLLECTION_AMOUNT"],
    [{ amount: 25000.5 }, "INVALID_COLLECTION_AMOUNT"],
    [{ currency: "GNF" }, "INVALID_COLLECTION_CURRENCY"],
  ])("validates FCFA positive integer amounts", async (override, errorCode) => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids, override),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode,
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("returns the existing collection for matching create idempotency", async () => {
    mockMongooseSession();
    const ids = createIds();
    const existing = createCollection(ids, {
      idempotencyPayload: {
        amount: 25000,
        correspondentMembershipId: ids.correspondentMembershipId.toString(),
        currency: "FCFA",
        customerName: "Client Bamako",
        customerPhone: "+22370000000",
        note: "Market collection",
      },
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(existing));
    const membershipFind = jest.spyOn(CompanyMembership, "findOne");
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: collectionPayload(ids),
    });

    expect(result).toBe(existing);
    expect(membershipFind).not.toHaveBeenCalled();
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("rejects reused create idempotency keys with different normalized payloads", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(CorrespondentCollection, "findOne").mockReturnValue(
      createSessionLeanQuery(
        createCollection(ids, {
          idempotencyPayload: {
            amount: 99999,
            correspondentMembershipId: ids.correspondentMembershipId.toString(),
            currency: "FCFA",
            customerName: "Different",
          },
        }),
      ),
    );

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids),
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });

  it("lists all company collections for managers and only own collections for partners", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(CorrespondentCollection, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest.spyOn(CorrespondentCollection, "countDocuments").mockResolvedValue(0);

    await listCorrespondentCollections({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { status: "pending" },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "pending",
    });

    await listCorrespondentCollections({
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

  it("prevents partners from seeing another partner collection", async () => {
    const ids = createIds();
    const findOne = jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createFindOneLeanQuery(null));

    await expect(
      getCorrespondentCollectionByCode({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.otherPartnerMembershipId,
        role: "partner",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_COLLECTION_NOT_FOUND",
    });
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      collectionCode: "CCL-260625-ABCD",
      correspondentMembership: ids.otherPartnerMembershipId,
    });
  });

  it("manager confirms a pending collection and creates balanced ledger entries", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      save: jest.fn().mockResolvedValue(undefined),
      status: "pending",
    });
    const confirmed = createCollection(ids, {
      save: jest.fn().mockResolvedValue(undefined),
      status: "confirmed",
    });
    const operation = createAccountOperation(ids, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(confirmed);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 125000,
    });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([operation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await confirmCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(result).toBe(confirmed);
    expect(CompanyMembership.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        role: "partner",
        status: "active",
        currency: "FCFA",
      },
      { $inc: { balance: 25000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(AccountOperation.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          targetMembership: ids.correspondentMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          linkedCorrespondentCollection: ids.collectionId,
          workflow: "correspondent_collection",
          type: "deposit",
          status: "completed",
          amount: 25000,
          currency: "FCFA",
          previousBalance: 100000,
          currentBalance: 125000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          accountOperation: ids.operationId,
          credit: 0,
          debit: 25000,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          accountOperation: ids.operationId,
          credit: 25000,
          debit: 0,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(operation.ledgerEntries).toEqual([
      ids.ledgerDebitId,
      ids.ledgerCreditId,
    ]);
    expect(operation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(confirmed.accountOperation).toBe(ids.operationId);
    expect(confirmed.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it.each(["confirmed", "canceled"])(
    "rejects confirmation when collection is %s",
    async (status) => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CorrespondentCollection, "findOne")
        .mockReturnValue(createSessionQuery(createCollection(ids, { status })));
      const operationCreate = jest.spyOn(AccountOperation, "create");

      await expect(
        confirmCorrespondentCollection({
          collectionCode: "CCL-260625-ABCD",
          companyId: ids.companyId,
          membershipId: ids.managerMembershipId,
          userId: ids.managerId,
          role: "manager",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "CORRESPONDENT_COLLECTION_CONFIRM_NOT_ALLOWED",
      });
      expect(operationCreate).not.toHaveBeenCalled();
    },
  );

  it("manager cancels a pending collection without ledger entries", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, { status: "pending" });
    const canceled = createCollection(ids, {
      cancelReason: "Customer reversed",
      status: "canceled",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(canceled);
    const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");

    const result = await cancelCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      payload: { reason: "Customer reversed" },
      role: "manager",
      userId: ids.managerId,
    });

    expect(result).toBe(canceled);
    expect(CorrespondentCollection.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.collectionId,
        company: ids.companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceled",
          canceledBy: ids.managerId,
          canceledByMembership: ids.managerMembershipId,
          canceledAt: expect.any(Date),
          cancelReason: "Customer reversed",
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(ledgerInsert).not.toHaveBeenCalled();
  });

  it("rejects cancellation for confirmed collections", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(createCollection(ids, { status: "confirmed" })));

    await expect(
      cancelCorrespondentCollection({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        payload: {},
        role: "manager",
        userId: ids.managerId,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED",
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
    collectionId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    ledgerCreditId: new mongoose.Types.ObjectId(),
    ledgerDebitId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    otherPartnerMembershipId: new mongoose.Types.ObjectId(),
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
    currency: "FCFA",
    balance: 100000,
    ...override,
  };
}

function createCollection(
  {
    collectionId,
    companyId,
    correspondentMembershipId,
    managerId,
    managerMembershipId,
  },
  override = {},
) {
  return {
    _id: collectionId,
    company: companyId,
    correspondentMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    collectionCode: "CCL-260625-ABCD",
    amount: 25000,
    currency: "FCFA",
    status: "pending",
    customerName: "Client Bamako",
    customerPhone: "+22370000000",
    note: "Market collection",
    idempotencyKey: "collection-create-1",
    idempotencyPayload: {
      amount: 25000,
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency: "FCFA",
      customerName: "Client Bamako",
      customerPhone: "+22370000000",
      note: "Market collection",
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createAccountOperation({ companyId, correspondentMembershipId, managerId, managerMembershipId, operationId }, override = {}) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    workflow: "correspondent_collection",
    type: "deposit",
    status: "completed",
    amount: 25000,
    currency: "FCFA",
    previousBalance: 100000,
    currentBalance: 125000,
    operationCode: "AOP-260625-ABCD",
    ledgerEntries: [],
    ...override,
  };
}

function collectionPayload({ correspondentMembershipId }, override = {}) {
  return {
    amount: 25000,
    currency: "fcfa",
    correspondentMembershipId: correspondentMembershipId.toString(),
    customerName: " Client Bamako ",
    customerPhone: " +22370000000 ",
    note: " Market collection ",
    idempotencyKey: "collection-create-1",
    transactionPin: "123456",
    ...override,
  };
}
