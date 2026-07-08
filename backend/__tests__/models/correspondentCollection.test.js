import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import AccountOperation from "../../models/AccountOperation.js";
import AuditLog from "../../models/AuditLog.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";

describe("CorrespondentCollection model", () => {
  it("validates a pending GNF collection with rate snapshot fields", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 326000000,
      beneficiaryName: "Kadidia",
      beneficiaryPhone: "+22371000000",
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "pending",
      customerName: "Awa Traore",
      customerPhone: "+22370000000",
      note: "Bamako collection",
      rateValue: 82000,
      rateBaseAmount: 5000,
      rateQuoteCurrency: "GNF",
      rateBaseCurrency: "FCFA",
      counterAmount: 20000000,
      counterCurrency: "FCFA",
      rateNote: "Kalil sold GNF to Abdoulaye",
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {
        correspondentMembershipId: new mongoose.Types.ObjectId().toString(),
        amount: 326000000,
        beneficiaryName: "Kadidia",
        currency: "GNF",
        payoutAmount: 20000000,
        payoutCurrency: "FCFA",
      },
    });

    await expect(collection.validate()).resolves.toBeUndefined();
  });

  it("rejects unsupported collection currencies", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 25000,
      currency: "USD",
      status: "pending",
      customerName: "Awa Traore",
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {},
    });

    await expect(collection.validate()).rejects.toThrow();
  });

  it("requires a positive integer amount", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 25000.5,
      currency: "FCFA",
      status: "pending",
      customerName: "Awa Traore",
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {},
    });

    await expect(collection.validate()).rejects.toThrow();
  });

  it("validates payout amount and currency when provided", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 328000000,
      beneficiaryName: "Kadidia",
      currency: "GNF",
      payoutAmount: 20000000.5,
      payoutCurrency: "FCFA",
      status: "pending",
      customerName: "Kadidia",
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {},
    });

    await expect(collection.validate()).rejects.toThrow();

    collection.payoutAmount = 20000000;
    collection.payoutCurrency = "USD";

    await expect(collection.validate()).rejects.toThrow();
  });

  it("rejects non-positive rate values when provided", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 25000,
      currency: "FCFA",
      status: "pending",
      customerName: "Awa Traore",
      rateValue: 0,
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {},
    });

    await expect(collection.validate()).rejects.toThrow();
  });

  it("allows pending, paid, legacy confirmed, and canceled statuses", () => {
    expect(CorrespondentCollection.schema.path("status").enumValues).toEqual([
      "pending",
      "paid",
      "confirmed",
      "canceled",
    ]);
  });

  it("tracks paid audit fields and cancellation reversal operation", () => {
    expect(CorrespondentCollection.schema.path("paidByMembership").options.ref)
      .toBe("CompanyMembership");
    expect(CorrespondentCollection.schema.path("paidBy").options.ref)
      .toBe("User");
    expect(
      CorrespondentCollection.schema.path("cancellationAccountOperation").options.ref,
    ).toBe("AccountOperation");
  });

  it("has lookup and idempotency indexes", () => {
    expect(CorrespondentCollection.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            collectionCode: 1,
          },
          {
            unique: true,
            partialFilterExpression: {
              collectionCode: { $type: "string" },
            },
          },
        ],
        [
          {
            company: 1,
            referenceCode: 1,
          },
          {
            unique: true,
            partialFilterExpression: {
              referenceCode: { $type: "string" },
            },
          },
        ],
        [
          {
            company: 1,
            correspondentMembership: 1,
            status: 1,
            createdAt: -1,
          },
          {},
        ],
        [
          {
            company: 1,
            createdBy: 1,
            idempotencyKey: 1,
          },
          {
            unique: true,
            partialFilterExpression: {
              idempotencyKey: { $type: "string" },
            },
          },
        ],
      ]),
    );
  });
});

describe("correspondent collection schema integrations", () => {
  it("adds correspondent collection links to account operations", () => {
    expect(AccountOperation.schema.path("linkedCorrespondentCollection").options.ref)
      .toBe("CorrespondentCollection");
  });

  it("allows correspondent collection audit actions", () => {
    expect(AuditLog.schema.path("action").enumValues).toEqual(
      expect.arrayContaining([
        "CORRESPONDENT_COLLECTION_CREATE",
        "CORRESPONDENT_COLLECTION_CONFIRM",
        "CORRESPONDENT_COLLECTION_PAY",
        "CORRESPONDENT_COLLECTION_CANCEL",
      ]),
    );
  });
});
