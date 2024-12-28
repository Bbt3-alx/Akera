import { Schema, model } from "mongoose";

// Company Schema
const companySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: { type: String },
    partners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ], // Associated partners
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ], // Associated managers
  },
  { timestamps: true }
);

const Company = model("Company", companySchema);

export default Company;
