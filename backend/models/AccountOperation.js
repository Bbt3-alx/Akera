import { Schema, model } from "mongoose";

const accountOperationSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    targetMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      required: true,
      index: true,
    },
    createdByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    linkedTransaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending_confirmation", "rejected", "reversed"],
      required: true,
      index: true,
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
    previousBalance: {
      type: Number,
      required: true,
    },
    currentBalance: {
      type: Number,
      required: true,
    },
    operationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    idempotencyPayload: {
      type: Schema.Types.Mixed,
    },
    collectorName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    collectorPhone: {
      type: String,
      trim: true,
      maxlength: 40,
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
    confirmedByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: Date,
    rejectedAt: Date,
    reversedAt: Date,
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reversedReason: {
      type: String,
      trim: true,
      maxlength: 300,
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

accountOperationSchema.index({
  company: 1,
  targetMembership: 1,
  createdAt: -1,
});

accountOperationSchema.index({
  company: 1,
  operationCode: 1,
});

accountOperationSchema.index(
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
);

const AccountOperation = model("AccountOperation", accountOperationSchema);

export default AccountOperation;
