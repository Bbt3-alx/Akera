import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  cancelCollection,
  confirmCollection,
  createCollection,
  getCollection,
  listCorrespondents,
  listCollections,
  payCollection,
} from "../../controllers/correspondentCollection.controller.js";
import * as correspondentCollectionService from "../../services/correspondentCollection.service.js";

describe("correspondent collection controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a collection response with safe audit metadata", async () => {
    const ids = createIds();
    const collection = createCollectionRecord(ids);
    jest
      .spyOn(correspondentCollectionService, "createCorrespondentCollection")
      .mockResolvedValue(collection);
    const res = createResponse();

    await createCollection(createRequest(ids), res);

    expect(correspondentCollectionService.createCorrespondentCollection)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: expect.objectContaining({ transactionPin: "123456" }),
      });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        id: ids.collectionId.toHexString(),
        transactionCode: "TX-99210452",
        status: "pending",
        correspondentName: "Awa Traore",
      }),
    );
    expect(res.locals.audit).toEqual({
      targetId: ids.collectionId,
      targetCode: "TX-99210452",
      metadata: {
        transactionCode: "TX-99210452",
        amount: 25000,
        currency: "FCFA",
        payoutAmount: 20000000,
        payoutCurrency: "FCFA",
        status: "pending",
        correspondentMembership: ids.correspondentMembershipId,
        accountOperation: ids.operationId,
      },
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
    expect(JSON.stringify(res.locals.audit)).not.toContain("collection-create-1");
  });

  it("lists collections with context-scoped service inputs", async () => {
    const ids = createIds();
    jest
      .spyOn(correspondentCollectionService, "listCorrespondentCollections")
      .mockResolvedValue({
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        collections: [createCollectionRecord(ids)],
      });
    const res = createResponse();

    await listCollections(
      createRequest(ids, {
        query: { status: "pending" },
      }),
      res,
    );

    expect(correspondentCollectionService.listCorrespondentCollections)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
        query: { status: "pending" },
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 200,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      data: [expect.objectContaining({ transactionCode: "TX-99210452" })],
    });
  });

  it("lists sanitized active correspondents for the active company", async () => {
    const ids = createIds();
    jest
      .spyOn(correspondentCollectionService, "listActiveCorrespondents")
      .mockResolvedValue([
        {
          _id: ids.correspondentMembershipId,
          balance: 328000000,
          reservedBalance: 2000000,
          currency: "GNF",
          status: "active",
          user: {
            _id: ids.correspondentUserId,
            firstName: "Kalil",
            lastName: "Diallo",
            email: "kalil@example.com",
            transactionPinHash: "secret-pin",
          },
          idempotencyKey: "hidden",
        },
      ]);
    const res = createResponse();

    await listCorrespondents(
      createRequest(ids, {
        query: { search: "kalil" },
      }),
      res,
    );

    expect(correspondentCollectionService.listActiveCorrespondents)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
        query: { search: "kalil" },
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          membershipId: ids.correspondentMembershipId.toHexString(),
          name: "Kalil Diallo",
          email: "kalil@example.com",
          currency: "GNF",
          balance: 328000000,
          reservedBalance: 2000000,
          availableBalance: 326000000,
          status: "active",
        },
      ],
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(
      "secret-pin",
    );
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("hidden");
  });

  it("gets a collection by code with partner visibility delegated to service", async () => {
    const ids = createIds();
    jest
      .spyOn(correspondentCollectionService, "getCorrespondentCollectionByCode")
      .mockResolvedValue(createCollectionRecord(ids));
    const res = createResponse();

    await getCollection(
      createRequest(ids, {
        context: {
          companyId: ids.companyId,
          membershipId: ids.correspondentMembershipId,
          role: "partner",
        },
        params: { collectionCode: "TX-99210452" },
      }),
      res,
    );

    expect(correspondentCollectionService.getCorrespondentCollectionByCode)
      .toHaveBeenCalledWith({
        collectionCode: "TX-99210452",
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        role: "partner",
      });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("pays a collection by code without exposing PIN or idempotency fields", async () => {
    const ids = createIds();
    const collection = createCollectionRecord(ids, {
      accountOperation: ids.operationId,
      paidAt: "2026-06-27T10:00:00.000Z",
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      status: "paid",
    });
    jest
      .spyOn(correspondentCollectionService, "confirmCorrespondentCollection")
      .mockResolvedValue(collection);
    const res = createResponse();

    await payCollection(
      createRequest(ids, {
        params: { collectionCode: "TX-99210452" },
      }),
      res,
    );

    expect(correspondentCollectionService.confirmCorrespondentCollection)
      .toHaveBeenCalledWith({
        collectionCode: "TX-99210452",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("123456");
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(
      "collection-create-1",
    );
    expect(res.locals.audit.metadata).toEqual({
      transactionCode: "TX-99210452",
      amount: 25000,
      currency: "FCFA",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "paid",
      correspondentMembership: ids.correspondentMembershipId,
      accountOperation: ids.operationId,
      paidAt: "2026-06-27T10:00:00.000Z",
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
    });
  });

  it("keeps confirm as a compatibility alias for manager-paid collections", async () => {
    const ids = createIds();
    const collection = createCollectionRecord(ids, {
      paidAt: "2026-06-27T10:00:00.000Z",
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      status: "paid",
    });
    jest
      .spyOn(correspondentCollectionService, "confirmCorrespondentCollection")
      .mockResolvedValue(collection);
    const res = createResponse();

    await confirmCollection(
      createRequest(ids, {
        params: { collectionCode: "TX-99210452" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.locals.audit.metadata.status).toBe("paid");
  });

  it("cancels a collection with safe audit metadata", async () => {
    const ids = createIds();
    const collection = createCollectionRecord(ids, {
      cancellationAccountOperation: ids.cancellationOperationId,
      cancelReason: "Customer reversed",
      canceledAt: "2026-06-25T11:00:00.000Z",
      canceledBy: ids.managerId,
      canceledByMembership: ids.managerMembershipId,
      status: "canceled",
    });
    jest
      .spyOn(correspondentCollectionService, "cancelCorrespondentCollection")
      .mockResolvedValue(collection);
    const res = createResponse();

    await cancelCollection(
      createRequest(ids, {
        body: { reason: "Customer reversed", transactionPin: "123456" },
        params: { collectionCode: "TX-99210452" },
      }),
      res,
    );

    expect(correspondentCollectionService.cancelCorrespondentCollection)
      .toHaveBeenCalledWith({
        collectionCode: "TX-99210452",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: { reason: "Customer reversed", transactionPin: "123456" },
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.locals.audit.metadata).toEqual({
      transactionCode: "TX-99210452",
      amount: 25000,
      currency: "FCFA",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "canceled",
      correspondentMembership: ids.correspondentMembershipId,
      cancellationAccountOperation: ids.cancellationOperationId,
      cancelReason: "Customer reversed",
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });
});

function createIds() {
  return {
    collectionId: new mongoose.Types.ObjectId(),
    cancellationOperationId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    correspondentUserId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
  };
}

function createCollectionRecord(
  {
    collectionId,
    companyId,
    correspondentMembershipId,
    correspondentUserId,
    managerId,
    managerMembershipId,
    operationId,
  },
  override = {},
) {
  return {
    _id: collectionId,
    company: companyId,
    correspondentMembership: {
      _id: correspondentMembershipId,
      user: {
        _id: correspondentUserId,
        firstName: "Awa",
        lastName: "Traore",
        email: "awa@example.com",
      },
    },
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    transactionCode: "TX-99210452",
    amount: 25000,
    beneficiaryName: "Client Bamako",
    beneficiaryPhone: "+22370000000",
    currency: "FCFA",
    payoutAmount: 20000000,
    payoutCurrency: "FCFA",
    status: "pending",
    customerName: "Client Bamako",
    customerPhone: "+22370000000",
    note: "Market collection",
    idempotencyKey: "collection-create-1",
    idempotencyPayload: { amount: 25000 },
    accountOperation: operationId,
    createdAt: "2026-06-25T09:00:00.000Z",
    updatedAt: "2026-06-25T09:00:00.000Z",
    ...override,
  };
}

function createRequest(
  { companyId, managerId, managerMembershipId, correspondentMembershipId },
  override = {},
) {
  return {
    body: {
      amount: 25000,
      beneficiaryName: "Client Bamako",
      beneficiaryPhone: "+22370000000",
      currency: "FCFA",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      customerName: "Client Bamako",
      correspondentMembershipId: correspondentMembershipId.toHexString(),
      idempotencyKey: "collection-create-1",
      transactionPin: "123456",
    },
    context: {
      companyId,
      membershipId: managerMembershipId,
      role: "manager",
    },
    params: {},
    query: {},
    user: {
      id: managerId,
    },
    ...override,
  };
}

function createResponse() {
  return {
    locals: {},
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
}
