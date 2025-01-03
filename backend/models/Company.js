import { Schema, model } from "mongoose";

// Company Schema
const companySchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    manager: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Associated manager
    partners: [{ type: Schema.Types.ObjectId, ref: "Partner", required: true }], // Associated partners
  },
  { timestamps: true }
);

const Company = model("Company", companySchema);

export default Company;
