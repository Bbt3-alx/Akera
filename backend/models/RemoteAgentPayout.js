import { Schema, model } from "mongoose";

const remoteAgentPayoutSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    payoutCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    assignedAgentGroup: {
      type: Schema.Types.ObjectId,
      ref: "RemoteAgentGroup",
      required: true,
      index: true,
    },
    assignedAgentMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["FCFA"],
      required: true,
    },
    beneficiaryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    beneficiaryPhone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "canceled"],
      default: "pending",
      required: true,
      index: true,
    },
    beneficiaryCodeHash: {
      type: String,
      required: true,
      index: true,
    },
    beneficiaryCodeLast4: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 4,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    idempotencyPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    paymentIdempotencyKey: {
      type: String,
      trim: true,
    },
    accountOperation: {
      type: Schema.Types.ObjectId,
      ref: "AccountOperation",
      index: true,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    paidByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    paidAt: Date,
    canceledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    canceledByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    canceledAt: Date,
    cancelReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

remoteAgentPayoutSchema.index({
  company: 1,
  payoutCode: 1,
});

remoteAgentPayoutSchema.index({
  company: 1,
  assignedAgentGroup: 1,
  status: 1,
  createdAt: -1,
});

remoteAgentPayoutSchema.index(
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

const RemoteAgentPayout = model(
  "RemoteAgentPayout",
  remoteAgentPayoutSchema,
);

export default RemoteAgentPayout;
