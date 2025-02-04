import { Schema, model } from "mongoose";

// Company Schema
const companySchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    balance: { type: Number, default: 0 },
    usdBalance: { type: Number, default: 0 }, // Balance in USD after selling gold.
    totalWeightExpedited: { type: Number, default: 0 }, // Total weight expedited by the company for sell.
    remainWeight: { type: Number, default: 0 }, // Remain weight to be sold
    manager: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Associated manager
    partners: [{ type: Schema.Types.ObjectId, ref: "Partner", required: true }], // Associated partners
    transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    operations: [{ type: Schema.Types.ObjectId, ref: "BuyOperation" }],
    currency: { type: String, default: "XOF" },
    status: {
      type: String,
      enum: ["active", "inactive", "closed"],
      default: "active",
    },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    usdCustomers: [{ type: Schema.Types.ObjectId, ref: "UsdCustomer" }],
  },
  { timestamps: true }
);
companySchema.index({ name: 1, deletedAt: 1 });
companySchema.index({ contact: 1, deletedAt: 1 });

const Company = model("Company", companySchema);

export default Company;
