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
    //usdTransactions: [{ type: Schema.Types.ObjectId, ref: "SellUSD" }],
    usdCustomers: [{ type: Schema.Types.ObjectId, ref: "UsdCustomer" }],
  },
  { timestamps: true }
);

const Company = model("Company", companySchema);

export default Company;
