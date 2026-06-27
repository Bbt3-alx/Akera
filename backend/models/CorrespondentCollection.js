import { Schema, model } from "mongoose";

const correspondentCollectionSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    correspondentMembership: {
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
    confirmedByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    canceledByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    canceledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    collectionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Collection amount must be a positive integer",
      },
    },
    currency: {
      type: String,
      enum: ["FCFA"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled"],
      default: "pending",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerPhone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    confirmedAt: Date,
    canceledAt: Date,
    cancelReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    accountOperation: {
      type: Schema.Types.ObjectId,
      ref: "AccountOperation",
      index: true,
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
  },
  { timestamps: true },
);

correspondentCollectionSchema.index({
  company: 1,
  collectionCode: 1,
});

correspondentCollectionSchema.index({
  company: 1,
  correspondentMembership: 1,
  status: 1,
  createdAt: -1,
});

correspondentCollectionSchema.index(
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

const CorrespondentCollection = model(
  "CorrespondentCollection",
  correspondentCollectionSchema,
);

export default CorrespondentCollection;
