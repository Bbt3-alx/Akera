import { Schema, model } from "mongoose";

const IdempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    requestHash: String, // Hash of request body + endpoint
    response: Schema.Types.Mixed,
    expireAt: Date,
  },
  { timestamps: true }
);

// TTL index for auto-cleanup
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const IdempotencyKey = model("IdempotencyKey", IdempotencyKeySchema);
export default IdempotencyKey;
