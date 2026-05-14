import { Schema, model } from "mongoose";

//Transaction Schema
const transactionSchema = new Schema(
  {
    transactionCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    membership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      required: true,
      index: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    inputAmount: {
      type: Number,
      required: true,
    },

    inputCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },

    partnerAmount: {
      type: Number,
      required: true,
    },

    partnerCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },

    companyAmount: {
      type: Number,
      required: true,
    },

    companyCurrency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },

    exchangeRate: {
      type: Number,
    },

    date: { type: Date, default: Date.now, index: true },

    beneficiaryName: {
      type: String,
      required: true,
      trim: true,
      maxLength: [100, "Beneficiary name too long"],
    },

    description: {
      type: String,
      trim: true,
      maxLength: [255, "Description too long"],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "canceling",
        "canceled",
        "reversing",
        "reversed",
        "archived",
        
      ],
      default: "pending",
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    canceledAt: { type: Date, default: null, index: true },
    cancelReason: String,
    canceledBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    reversedAt: Date,
    reversedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reversedReason: String,

    archived: { type: Boolean, default: false },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes
transactionSchema.index({ company: 1, partner: 1 });
transactionSchema.index({ idempotencyKey: 1, company: 1 }, { unique: true });

const Transaction = model("Transaction", transactionSchema);
export default Transaction;
