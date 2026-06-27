import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  cancelDelivery,
  confirmDelivery,
  createDelivery,
  getDelivery,
  listDeliveries,
} from "../../controllers/correspondentDelivery.controller.js";
import * as correspondentDeliveryService from "../../services/correspondentDelivery.service.js";

describe("correspondent delivery controller", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a delivery response with safe audit metadata", async () => {
    const ids = createIds();
    const delivery = createDeliveryRecord(ids);
    jest
      .spyOn(correspondentDeliveryService, "createCorrespondentDelivery")
      .mockResolvedValue(delivery);
    const res = createResponse();

    await createDelivery(createRequest(ids), res);

    expect(correspondentDeliveryService.createCorrespondentDelivery)
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
        id: ids.deliveryId.toHexString(),
        deliveryCode: "CDL-260627-ABCD",
        status: "pending",
        correspondentName: "Kalil Diallo",
        rateValue: 82000,
      }),
    );
    expect(res.locals.audit).toEqual({
      targetId: ids.deliveryId,
      targetCode: "CDL-260627-ABCD",
      metadata: {
        deliveryCode: "CDL-260627-ABCD",
        amount: 200000000,
        currency: "GNF",
        status: "pending",
        correspondentMembership: ids.correspondentMembershipId,
      },
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
    expect(JSON.stringify(res.locals.audit)).not.toContain("delivery-create-1");
  });

  it("lists deliveries with context-scoped service inputs", async () => {
    const ids = createIds();
    jest
      .spyOn(correspondentDeliveryService, "listCorrespondentDeliveries")
      .mockResolvedValue({
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        deliveries: [createDeliveryRecord(ids)],
      });
    const res = createResponse();

    await listDeliveries(
      createRequest(ids, {
        query: { status: "pending" },
      }),
      res,
    );

    expect(correspondentDeliveryService.listCorrespondentDeliveries)
      .toHaveBeenCalledWith({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
        query: { status: "pending" },
      });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("gets a delivery by code with partner visibility delegated to service", async () => {
    const ids = createIds();
    jest
      .spyOn(correspondentDeliveryService, "getCorrespondentDeliveryByCode")
      .mockResolvedValue(createDeliveryRecord(ids));
    const res = createResponse();

    await getDelivery(
      createRequest(ids, {
        context: {
          companyId: ids.companyId,
          membershipId: ids.correspondentMembershipId,
          role: "partner",
        },
        params: { deliveryCode: "CDL-260627-ABCD" },
      }),
      res,
    );

    expect(correspondentDeliveryService.getCorrespondentDeliveryByCode)
      .toHaveBeenCalledWith({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        role: "partner",
      });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("confirms delivery with partner context and safe audit metadata", async () => {
    const ids = createIds();
    const delivery = createDeliveryRecord(ids, {
      accountOperation: ids.operationId,
      confirmedAt: "2026-06-27T10:00:00.000Z",
      confirmedBy: ids.partnerUserId,
      confirmedByMembership: ids.correspondentMembershipId,
      status: "confirmed",
    });
    jest
      .spyOn(correspondentDeliveryService, "confirmCorrespondentDelivery")
      .mockResolvedValue(delivery);
    const res = createResponse();

    await confirmDelivery(
      createRequest(ids, {
        context: {
          companyId: ids.companyId,
          membershipId: ids.correspondentMembershipId,
          role: "partner",
        },
        params: { deliveryCode: "CDL-260627-ABCD" },
        user: { id: ids.partnerUserId },
      }),
      res,
    );

    expect(correspondentDeliveryService.confirmCorrespondentDelivery)
      .toHaveBeenCalledWith({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        userId: ids.partnerUserId,
        role: "partner",
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.locals.audit.metadata).toEqual({
      deliveryCode: "CDL-260627-ABCD",
      amount: 200000000,
      currency: "GNF",
      status: "confirmed",
      correspondentMembership: ids.correspondentMembershipId,
      accountOperation: ids.operationId,
    });
    expect(JSON.stringify(res.locals.audit)).not.toContain("123456");
  });

  it("cancels a delivery with safe audit metadata", async () => {
    const ids = createIds();
    const delivery = createDeliveryRecord(ids, {
      cancelReason: "Beneficiary unavailable",
      canceledAt: "2026-06-27T11:00:00.000Z",
      canceledBy: ids.managerId,
      canceledByMembership: ids.managerMembershipId,
      status: "canceled",
    });
    jest
      .spyOn(correspondentDeliveryService, "cancelCorrespondentDelivery")
      .mockResolvedValue(delivery);
    const res = createResponse();

    await cancelDelivery(
      createRequest(ids, {
        body: { reason: "Beneficiary unavailable", transactionPin: "123456" },
        params: { deliveryCode: "CDL-260627-ABCD" },
      }),
      res,
    );

    expect(correspondentDeliveryService.cancelCorrespondentDelivery)
      .toHaveBeenCalledWith({
        deliveryCode: "CDL-260627-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: { reason: "Beneficiary unavailable", transactionPin: "123456" },
      });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.locals.audit.metadata).toEqual({
      deliveryCode: "CDL-260627-ABCD",
      amount: 200000000,
      currency: "GNF",
      status: "canceled",
      correspondentMembership: ids.correspondentMembershipId,
      cancelReason: "Beneficiary unavailable",
    });
  });
});

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    deliveryId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    partnerUserId: new mongoose.Types.ObjectId(),
  };
}

function createDeliveryRecord(
  {
    companyId,
    correspondentMembershipId,
    deliveryId,
    managerId,
    managerMembershipId,
    partnerUserId,
  },
  override = {},
) {
  return {
    _id: deliveryId,
    company: companyId,
    correspondentMembership: {
      _id: correspondentMembershipId,
      user: {
        _id: partnerUserId,
        firstName: "Kalil",
        lastName: "Diallo",
        email: "kalil@example.com",
      },
    },
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
    idempotencyPayload: { amount: 200000000 },
    createdAt: "2026-06-27T09:00:00.000Z",
    updatedAt: "2026-06-27T09:00:00.000Z",
    ...override,
  };
}

function createRequest(
  { companyId, correspondentMembershipId, managerId, managerMembershipId },
  override = {},
) {
  return {
    body: {
      amount: 200000000,
      beneficiaryName: "Kallo",
      correspondentMembershipId: correspondentMembershipId.toHexString(),
      currency: "GNF",
      idempotencyKey: "delivery-create-1",
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
