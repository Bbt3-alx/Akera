import { Schema, model } from "mongoose";

const usdCustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true },
    toPaid: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who created the customer
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who updated the customer
    companies: [{ type: Schema.Types.ObjectId, ref: "Company" }],
    deletedAt: { type: Date, default: null }, // Soft delete flag
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who deleted the customer
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who restored the customer
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const dollarExchangeSchema = new Schema(
  {
    rate: { type: Number, required: true },
    usdCustomer: {
      type: Schema.Types.ObjectId,
      ref: "UsdCustomer",
      required: true,
    },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    amountUSD: { type: Number, required: true },
    amountCFA: { type: Number },
    paidAmount: { type: Number },
    remainingAmount: { type: Number },
    usdTaker: { type: String }, // The usd recipient in Dubai
    status: {
      type: String,
      enum: ["pending", "canceled", "completed", "archived", "in progress"],
      default: "pending",
    },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who initiated the transaction
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who updated the transaction
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who deleted the transaction
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" }, // Who restored the transaction
    archivedAt: { type: Date, default: null },
    archivedReason: String,
    previousStatus: String,
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dollarExchangeSchema.pre("save", function (next) {
  this.remainingAmount = (this.amountCFA || 0) - (this.remainingAmount || 0);
  next();
});

usdCustomerSchema.index({ deletedAt: 1 });
dollarExchangeSchema.index({ deletedAt: 1, company: 1 });

const UsdCustomer = model("UsdCustomer", usdCustomerSchema);
const DollarExchange = model("DollarExchange", dollarExchangeSchema);

export { DollarExchange, UsdCustomer };
