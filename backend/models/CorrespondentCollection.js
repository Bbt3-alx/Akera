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
    paidByMembership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
    },
    paidBy: {
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
      trim: true,
    },
    referenceCode: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    inputAmount: {
      type: Number,
      min: 1,
      validate: {
        validator(value) {
          return value === undefined || Number.isInteger(value);
        },
        message: "Collection input amount must be a positive integer",
      },
    },
    inputCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    inputSide: {
      type: String,
      enum: ["account", "company"],
    },
    conversionDirection: {
      type: String,
      enum: ["GNF_TO_FCFA", "FCFA_TO_GNF"],
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
      enum: ["FCFA", "GNF"],
      required: true,
    },
    payoutAmount: {
      type: Number,
      min: 1,
      validate: {
        validator(value) {
          return value === undefined || Number.isInteger(value);
        },
        message: "Collection payout amount must be a positive integer",
      },
    },
    payoutCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    status: {
      type: String,
      enum: ["pending", "paid", "confirmed", "canceled"],
      default: "pending",
      required: true,
      index: true,
    },
    beneficiaryName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    beneficiaryPhone: {
      type: String,
      trim: true,
      maxlength: 40,
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
    rateValue: {
      type: Number,
      validate: {
        validator(value) {
          return value === undefined || value > 0;
        },
        message: "Rate value must be greater than 0",
      },
    },
    rateBaseAmount: {
      type: Number,
      min: 1,
      validate: {
        validator(value) {
          return value === undefined || Number.isInteger(value);
        },
        message: "Rate base amount must be a positive integer",
      },
    },
    rateQuoteCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    rateBaseCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    counterAmount: {
      type: Number,
      min: 1,
      validate: {
        validator(value) {
          return value === undefined || Number.isInteger(value);
        },
        message: "Counter amount must be a positive integer",
      },
    },
    counterCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    rateNote: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    confirmedAt: Date,
    paidAt: Date,
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
    cancellationAccountOperation: {
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

correspondentCollectionSchema.index(
  {
    company: 1,
    collectionCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      collectionCode: { $type: "string" },
    },
  },
);

correspondentCollectionSchema.index(
  {
    company: 1,
    referenceCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      referenceCode: { $type: "string" },
    },
  },
);

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
