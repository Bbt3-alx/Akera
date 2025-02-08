import { Schema, model } from "mongoose";

//Transaction Schema
const transactionSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1"],
    },
    code: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substr(2, 9).toUpperCase(),
    },
    date: { type: Date, default: Date.now, index: true },
    description: {
      type: String,
      required: true,
      maxLenght: [255, "Description too long"],
    }, // Name of the person to be paid or purpose
    status: {
      type: String,
      enum: ["pending", "paid", "canceled", "archived"],
      default: "pending",
      index: true,
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true,
    }, // Associeted partners
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    archived: { type: Boolean, default: false },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compound indexes
transactionSchema.index({ company: 1, partner: 1 });
transactionSchema.index({ company: 1, date: -1 });
const Transaction = model("Transaction", transactionSchema);
export default Transaction;
