import { Schema, model } from "mongoose";

const correspondentModificationRequestSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["collection", "delivery"],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    oldValues: {
      type: Schema.Types.Mixed,
      required: true,
    },
    requestedValues: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    decisionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    initiatedByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      required: true,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: true,
      default: "pending",
      index: true,
    },
    decidedAt: Date,
  },
  { timestamps: true },
);

correspondentModificationRequestSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

const CorrespondentModificationRequest = model(
  "CorrespondentModificationRequest",
  correspondentModificationRequestSchema,
);

export default CorrespondentModificationRequest;
