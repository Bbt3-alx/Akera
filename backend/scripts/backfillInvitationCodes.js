import crypto from "node:crypto";
import mongoose from "mongoose";

import { connectDB } from "../config/connectDB.js";
import CompanyInvitation from "../models/CompanyInvitation.js";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MISSING_CODE = [
  { invitationCode: { $exists: false } },
  { invitationCode: null },
  { invitationCode: "" },
];

export function generateInvitationCode() {
  return Array.from(crypto.randomBytes(10), (byte) =>
    ALPHABET[byte % ALPHABET.length]
  ).join("");
}

export async function backfillInvitationCodes({
  InvitationModel = CompanyInvitation,
  generateCode = generateInvitationCode,
} = {}) {
  const records = await InvitationModel.find({
    status: "pending",
    $or: MISSING_CODE,
  }).select("_id").lean();
  let updated = 0;

  for (const record of records) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const result = await InvitationModel.updateOne(
          { _id: record._id, $or: MISSING_CODE },
          { $set: { invitationCode: generateCode() } },
        );
        updated += result.modifiedCount ?? 0;
        break;
      } catch (error) {
        const collision =
          error?.code === 11000 &&
          Boolean(
            error.keyPattern?.invitationCode ||
              error.keyValue?.invitationCode,
          );
        if (!collision || attempt === 4) throw error;
      }
    }
  }

  return { scanned: records.length, updated };
}

async function run() {
  await connectDB();
  try {
    const result = await backfillInvitationCodes();
    console.log(
      `Invitation code backfill complete: ${result.updated}/${result.scanned} updated`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1]?.endsWith("backfillInvitationCodes.js")) {
  run().catch((error) => {
    console.error("Invitation code backfill failed", error);
    process.exitCode = 1;
  });
}
