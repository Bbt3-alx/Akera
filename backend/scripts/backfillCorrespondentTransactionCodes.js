import mongoose from "mongoose";

import { connectDB } from "../config/connectDB.js";
import CorrespondentCollection from "../models/CorrespondentCollection.js";
import { generateTransactionCode } from "../services/correspondentCollection.service.js";

const MISSING_TRANSACTION_CODE_FILTER = [
  { transactionCode: { $exists: false } },
  { transactionCode: null },
  { transactionCode: "" },
];
const MAX_CODE_ATTEMPTS = 5;

export async function removeObsoleteCollectionCodeUniqueIndex({
  CollectionModel = CorrespondentCollection,
} = {}) {
  const indexes = await CollectionModel.collection.indexes();
  const obsoleteIndex = indexes.find((index) => {
    const keys = Object.keys(index.key ?? {});

    return (
      index.unique === true &&
      keys.length === 1 &&
      keys[0] === "collectionCode" &&
      index.key.collectionCode === 1
    );
  });

  if (!obsoleteIndex) {
    return { dropped: false, indexName: null };
  }

  await CollectionModel.collection.dropIndex(obsoleteIndex.name);
  return { dropped: true, indexName: obsoleteIndex.name };
}

export async function backfillCorrespondentTransactionCodes({
  CollectionModel = CorrespondentCollection,
  generateCode = generateTransactionCode,
} = {}) {
  const records = await CollectionModel.find({
    $or: MISSING_TRANSACTION_CODE_FILTER,
  })
    .select("_id")
    .lean();
  let updated = 0;

  for (const record of records) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const result = await CollectionModel.updateOne(
          {
            _id: record._id,
            $or: MISSING_TRANSACTION_CODE_FILTER,
          },
          { $set: { transactionCode: generateCode() } },
        );
        updated += result.modifiedCount ?? 0;
        break;
      } catch (error) {
        const isCodeCollision =
          error?.code === 11000 &&
          Boolean(
            error.keyPattern?.transactionCode || error.keyValue?.transactionCode,
          );

        if (!isCodeCollision || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }
  }

  return { scanned: records.length, updated };
}

async function runFromCommandLine() {
  await connectDB();

  try {
    const indexResult = await removeObsoleteCollectionCodeUniqueIndex();
    const result = await backfillCorrespondentTransactionCodes();
    console.log(
      indexResult.dropped
        ? `Removed obsolete correspondent collection index: ${indexResult.indexName}`
        : "Obsolete correspondent collection index already absent",
    );
    console.log(
      `Correspondent transaction code backfill complete: ${result.updated}/${result.scanned} updated`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (
  process.argv[1] &&
  process.argv[1].endsWith("backfillCorrespondentTransactionCodes.js")
) {
  runFromCommandLine().catch((error) => {
    console.error("Correspondent transaction code backfill failed", error);
    process.exitCode = 1;
  });
}
