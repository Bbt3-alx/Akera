import { describe, expect, it, jest } from "@jest/globals";

import {
  backfillCorrespondentTransactionCodes,
  removeObsoleteCollectionCodeUniqueIndex,
} from "../../scripts/backfillCorrespondentTransactionCodes.js";

describe("backfill correspondent transaction codes", () => {
  it("drops only the obsolete global collection code unique index", async () => {
    const CollectionModel = {
      collection: {
        indexes: jest.fn().mockResolvedValue([
          { key: { _id: 1 }, name: "_id_" },
          {
            key: { collectionCode: 1 },
            name: "collectionCode_1",
            unique: true,
          },
          {
            key: { company: 1, transactionCode: 1 },
            name: "company_1_transactionCode_1",
            unique: true,
          },
        ]),
        dropIndex: jest.fn().mockResolvedValue(undefined),
      },
    };

    await expect(
      removeObsoleteCollectionCodeUniqueIndex({ CollectionModel }),
    ).resolves.toEqual({ dropped: true, indexName: "collectionCode_1" });
    expect(CollectionModel.collection.dropIndex).toHaveBeenCalledWith(
      "collectionCode_1",
    );
  });

  it("does nothing when the obsolete collection code index is absent", async () => {
    const CollectionModel = {
      collection: {
        indexes: jest.fn().mockResolvedValue([
          { key: { _id: 1 }, name: "_id_" },
          {
            key: { company: 1, collectionCode: 1 },
            name: "company_1_collectionCode_1",
          },
        ]),
        dropIndex: jest.fn(),
      },
    };

    await expect(
      removeObsoleteCollectionCodeUniqueIndex({ CollectionModel }),
    ).resolves.toEqual({ dropped: false, indexName: null });
    expect(CollectionModel.collection.dropIndex).not.toHaveBeenCalled();
  });

  it("assigns codes only to records that are still missing one", async () => {
    const findQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "collection-1" }]),
    };
    const CollectionModel = {
      find: jest.fn().mockReturnValue(findQuery),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    await expect(
      backfillCorrespondentTransactionCodes({
        CollectionModel,
        generateCode: () => "TX-99210452",
      }),
    ).resolves.toEqual({ scanned: 1, updated: 1 });

    expect(CollectionModel.updateOne).toHaveBeenCalledWith(
      {
        _id: "collection-1",
        $or: [
          { transactionCode: { $exists: false } },
          { transactionCode: null },
          { transactionCode: "" },
        ],
      },
      { $set: { transactionCode: "TX-99210452" } },
    );
  });

  it("retries duplicate generated codes", async () => {
    const findQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "collection-1" }]),
    };
    const generateCode = jest.fn()
      .mockReturnValueOnce("TX-11111111")
      .mockReturnValueOnce("TX-22222222");
    const CollectionModel = {
      find: jest.fn().mockReturnValue(findQuery),
      updateOne: jest.fn()
        .mockRejectedValueOnce({
          code: 11000,
          keyPattern: { transactionCode: 1 },
        })
        .mockResolvedValueOnce({ modifiedCount: 1 }),
    };

    await expect(
      backfillCorrespondentTransactionCodes({ CollectionModel, generateCode }),
    ).resolves.toEqual({ scanned: 1, updated: 1 });
    expect(generateCode).toHaveBeenCalledTimes(2);
  });
});
