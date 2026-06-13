import { Schema, model } from "mongoose";

const companyCashMovementSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },
    method: {
      type: String,
      enum: ["cash", "bank", "mobile_money", "other"],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    currentBalance: {
      type: Number,
      required: true,
    },
    ledgerEntries: [
      {
        type: Schema.Types.ObjectId,
        ref: "LedgerEntry",
      },
    ],
  },
  { timestamps: true },
);

companyCashMovementSchema.index(
  { company: 1, idempotencyKey: 1 },
  { unique: true },
);

const CompanyCashMovement = model(
  "CompanyCashMovement",
  companyCashMovementSchema,
);

export default CompanyCashMovement;
