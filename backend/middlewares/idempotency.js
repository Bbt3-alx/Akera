import crypto from "crypto";
import IdempotencyKey from "../models/IdempotencyKey.js";
import mongoose from "mongoose";
import { ApiError } from "./errorHandler.js";

/* Idempotency
- Include `Idempotency-Key: <UUIDv4>` header in POST/PUT/PATCH requests
- Retry failed requests with same key to prevent duplicates
*/

export const idempotencyCheck = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency-Key header required",
    });
  }

  // Create request hash fingerprint
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ body: req.body, path: req.path }))
    .digest("hex");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingKey = await IdempotencyKey.findOne({
      key: idempotencyKey,
    }).session(session);

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        throw new ApiError(
          409,
          "Request conflict - key reused with different parameters"
        );
      }

      // Return cached response if completed
      if (existingKey.status === "completed") {
        return res.status(200).json(existingKey.response);
      }

      // Handle pending requests
      throw new ApiError(409, "Request already in progress");
    }

    // Reverse the key
    await IdempotencyKey.create(
      [
        {
          key: idempotencyKey,
          status: "pending",
          requestHash,
          expiresAt: new Date(Date.now() + 86400000), // 24h
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Attach to request for later use
    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
