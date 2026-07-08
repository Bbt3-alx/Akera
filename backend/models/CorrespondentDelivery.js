import { Schema, model } from "mongoose";

const correspondentDeliverySchema = new Schema(
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
    deliveryCode: {
      type: String,
      trim: true,
    },
    referenceCode: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Delivery amount must be a positive integer",
      },
    },
    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled"],
      default: "pending",
      required: true,
      index: true,
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

correspondentDeliverySchema.index(
  {
    company: 1,
    deliveryCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      deliveryCode: { $type: "string" },
    },
  },
);

correspondentDeliverySchema.index(
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

correspondentDeliverySchema.index({
  company: 1,
  correspondentMembership: 1,
  status: 1,
  createdAt: -1,
});

correspondentDeliverySchema.index(
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

const CorrespondentDelivery = model(
  "CorrespondentDelivery",
  correspondentDeliverySchema,
);

export default CorrespondentDelivery;
