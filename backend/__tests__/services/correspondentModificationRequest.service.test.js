import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import AuditLog from "../../models/AuditLog.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";
import CorrespondentModificationRequest from "../../models/CorrespondentModificationRequest.js";
import {
  approveCorrespondentModificationRequest,
  createCorrespondentCollectionModificationRequest,
  listCorrespondentModificationRequests,
  rejectCorrespondentModificationRequest,
} from "../../services/correspondentModificationRequest.service.js";

describe("correspondent modification request service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("partner creates an auditable transaction modification request for own collection", async () => {
    const ids = createIds();
    const collection = createCollection(ids);
    const request = createRequest(ids);
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createLeanQuery(collection));
    jest
      .spyOn(CorrespondentModificationRequest, "create")
      .mockResolvedValue(request);
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});

    const result = await createCorrespondentCollectionModificationRequest({
      collectionId: ids.collectionId.toString(),
      companyId: ids.companyId,
      membershipId: ids.partnerMembershipId,
      payload: { requestedValues: { amount: 330000000 }, reason: "Wrong amount" },
      role: "partner",
      userId: ids.partnerUserId,
    });

    expect(result).toBe(request);
    expect(CorrespondentCollection.findOne).toHaveBeenCalledWith({
      _id: ids.collectionId,
      company: ids.companyId,
      correspondentMembership: ids.partnerMembershipId,
    });
    expect(CorrespondentModificationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company: ids.companyId,
        targetType: "collection",
        targetId: ids.collectionId,
        oldValues: expect.objectContaining({ amount: 328000000 }),
        requestedValues: { amount: 330000000 },
        reason: "Wrong amount",
        initiatedBy: ids.partnerUserId,
        initiatedByMembership: ids.partnerMembershipId,
        status: "pending",
      }),
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CORRESPONDENT_MODIFICATION_REQUEST_CREATE",
        collectionName: "CorrespondentModificationRequest",
        targetId: request._id,
        userId: ids.partnerUserId,
        companyId: ids.companyId,
      }),
    );
  });

  it("manager approves a pending collection modification request and applies requested values", async () => {
    mockMongooseSession();
    const ids = createIds();
    const request = createRequest(ids, {
      requestedValues: { amount: 330000000, note: "Corrected amount" },
    });
    const approved = createRequest(ids, {
      approvedBy: ids.managerUserId,
      decidedAt: expect.any(Date),
      status: "approved",
    });
    jest
      .spyOn(CorrespondentModificationRequest, "findOne")
      .mockReturnValue(createSessionQuery(request));
    const requestUpdate = jest
      .spyOn(CorrespondentModificationRequest, "findOneAndUpdate")
      .mockResolvedValue(approved);
    const collectionUpdate = jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue({});
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});

    const result = await approveCorrespondentModificationRequest({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      requestId: ids.requestId.toString(),
      role: "manager",
      userId: ids.managerUserId,
    });

    expect(result).toBe(approved);
    expect(collectionUpdate).toHaveBeenCalledWith(
      { _id: ids.collectionId, company: ids.companyId },
      { $set: { amount: 330000000, note: "Corrected amount" } },
      { new: true, session: expect.any(Object) },
    );
    expect(requestUpdate).toHaveBeenCalledWith(
      { _id: ids.requestId, company: ids.companyId, status: "pending" },
      {
        $set: {
          approvedBy: ids.managerUserId,
          approvedByMembership: ids.managerMembershipId,
          decidedAt: expect.any(Date),
          status: "approved",
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CORRESPONDENT_MODIFICATION_REQUEST_APPROVE",
        changes: {
          oldValues: request.oldValues,
          requestedValues: request.requestedValues,
        },
      }),
    );
  });

  it("manager rejects a pending modification request without applying requested values", async () => {
    mockMongooseSession();
    const ids = createIds();
    const request = createRequest(ids);
    const rejected = createRequest(ids, { status: "rejected" });
    jest
      .spyOn(CorrespondentModificationRequest, "findOne")
      .mockReturnValue(createSessionQuery(request));
    jest
      .spyOn(CorrespondentModificationRequest, "findOneAndUpdate")
      .mockResolvedValue(rejected);
    const collectionUpdate = jest.spyOn(CorrespondentCollection, "findOneAndUpdate");
    const auditCreate = jest.spyOn(AuditLog, "create").mockResolvedValue({});

    await expect(
      rejectCorrespondentModificationRequest({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        payload: { reason: "No supporting receipt" },
        requestId: ids.requestId.toString(),
        role: "manager",
        userId: ids.managerUserId,
      }),
    ).resolves.toBe(rejected);
    expect(collectionUpdate).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CORRESPONDENT_MODIFICATION_REQUEST_REJECT",
        details: expect.objectContaining({ decisionReason: "No supporting receipt" }),
      }),
    );
  });

  it("partners list only their own modification requests while managers list company requests", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(CorrespondentModificationRequest, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest
      .spyOn(CorrespondentModificationRequest, "countDocuments")
      .mockResolvedValue(0);

    await listCorrespondentModificationRequests({
      companyId: ids.companyId,
      membershipId: ids.partnerMembershipId,
      query: {},
      role: "partner",
    });
    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      initiatedByMembership: ids.partnerMembershipId,
    });

    await listCorrespondentModificationRequests({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      query: { status: "pending" },
      role: "manager",
    });
    expect(find).toHaveBeenLastCalledWith({
      company: ids.companyId,
      status: "pending",
    });
  });
});

function createIds() {
  return {
    collectionId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    managerUserId: new mongoose.Types.ObjectId(),
    partnerMembershipId: new mongoose.Types.ObjectId(),
    partnerUserId: new mongoose.Types.ObjectId(),
    requestId: new mongoose.Types.ObjectId(),
  };
}

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

function createCollection(ids) {
  return {
    _id: ids.collectionId,
    company: ids.companyId,
    correspondentMembership: ids.partnerMembershipId,
    amount: 328000000,
    currency: "GNF",
    payoutAmount: 20000000,
    payoutCurrency: "FCFA",
    status: "pending",
    beneficiaryName: "Kadidia",
    note: "Original note",
  };
}

function createRequest(ids, override = {}) {
  return {
    _id: ids.requestId,
    company: ids.companyId,
    targetType: "collection",
    targetId: ids.collectionId,
    oldValues: {
      amount: 328000000,
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "pending",
      beneficiaryName: "Kadidia",
      note: "Original note",
    },
    requestedValues: { amount: 330000000 },
    reason: "Wrong amount",
    initiatedBy: ids.partnerUserId,
    initiatedByMembership: ids.partnerMembershipId,
    status: "pending",
    ...override,
  };
}

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
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
