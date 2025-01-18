import { Schema, model } from "mongoose";

// Company Schema
const companySchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    balance: { type: Number, default: 0 },
    manager: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Associated manager
    partners: [{ type: Schema.Types.ObjectId, ref: "Partner", required: true }], // Associated partners
    transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    operations: [{ type: Schema.Types.ObjectId, ref: "BuyOperation" }],
  },
  { timestamps: true }
);

const Company = model("Company", companySchema);

export default Company;
