import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import AccountOperation from "../../models/AccountOperation.js";
import AuditLog from "../../models/AuditLog.js";
import CorrespondentDelivery from "../../models/CorrespondentDelivery.js";

describe("CorrespondentDelivery model", () => {
  it("validates a pending GNF delivery with rate snapshot fields", async () => {
    const delivery = new CorrespondentDelivery({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      deliveryCode: "CDL-260627-ABCD",
      amount: 326000000,
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
        correspondentMembershipId: new mongoose.Types.ObjectId().toString(),
        amount: 326000000,
        currency: "GNF",
        beneficiaryName: "Kallo",
      },
    });

    await expect(delivery.validate()).resolves.toBeUndefined();
  });

  it("requires positive integer FCFA/GNF amounts", async () => {
    const delivery = new CorrespondentDelivery({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      deliveryCode: "CDL-260627-ABCD",
      amount: 326000000.5,
      currency: "GNF",
      status: "pending",
      beneficiaryName: "Kallo",
      idempotencyKey: "delivery-create-1",
      idempotencyPayload: {},
    });

    await expect(delivery.validate()).rejects.toThrow();
  });

  it("rejects non-positive rate values when provided", async () => {
    const delivery = new CorrespondentDelivery({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      deliveryCode: "CDL-260627-ABCD",
      amount: 326000000,
      currency: "GNF",
      status: "pending",
      beneficiaryName: "Kallo",
      rateValue: 0,
      idempotencyKey: "delivery-create-1",
      idempotencyPayload: {},
    });

    await expect(delivery.validate()).rejects.toThrow();
  });

  it("only allows pending, confirmed, and canceled statuses", () => {
    expect(CorrespondentDelivery.schema.path("status").enumValues).toEqual([
      "pending",
      "confirmed",
      "canceled",
    ]);
  });
});

describe("correspondent delivery schema integrations", () => {
  it("adds correspondent delivery links to account operations", () => {
    expect(AccountOperation.schema.path("linkedCorrespondentDelivery").options.ref)
      .toBe("CorrespondentDelivery");
    expect(AccountOperation.schema.path("type").enumValues).toContain(
      "withdrawal",
    );
  });

  it("allows correspondent delivery audit actions", () => {
    expect(AuditLog.schema.path("action").enumValues).toEqual(
      expect.arrayContaining([
        "CORRESPONDENT_DELIVERY_CREATE",
        "CORRESPONDENT_DELIVERY_CONFIRM",
        "CORRESPONDENT_DELIVERY_CANCEL",
      ]),
    );
  });
});
