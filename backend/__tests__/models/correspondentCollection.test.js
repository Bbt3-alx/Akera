import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";

import AccountOperation from "../../models/AccountOperation.js";
import AuditLog from "../../models/AuditLog.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";

describe("CorrespondentCollection model", () => {
  it("validates a pending FCFA collection for a partner membership", async () => {
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
      customerPhone: "+22370000000",
      note: "Bamako collection",
      idempotencyKey: "collection-create-1",
      idempotencyPayload: {
        correspondentMembershipId: new mongoose.Types.ObjectId().toString(),
        amount: 25000,
        currency: "FCFA",
        customerName: "Awa Traore",
      },
    });

    await expect(collection.validate()).resolves.toBeUndefined();
  });

  it("rejects non-FCFA collections", async () => {
    const collection = new CorrespondentCollection({
      company: new mongoose.Types.ObjectId(),
      correspondentMembership: new mongoose.Types.ObjectId(),
      createdByMembership: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      collectionCode: "CCL-260625-ABCD",
      amount: 25000,
      currency: "GNF",
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

  it("only allows pending, confirmed, and canceled statuses", () => {
    expect(CorrespondentCollection.schema.path("status").enumValues).toEqual([
      "pending",
      "confirmed",
      "canceled",
    ]);
  });

  it("has lookup and idempotency indexes", () => {
    expect(CorrespondentCollection.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          {
            company: 1,
            collectionCode: 1,
          },
          {},
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
        "CORRESPONDENT_COLLECTION_CANCEL",
      ]),
    );
  });
});
