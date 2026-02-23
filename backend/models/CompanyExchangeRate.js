import { Schema, model } from "mongoose";

const companyExchangeRatesSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
      unique: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },
    to: {
      type: String,
      enum: ["GNF", "FCFA"],
      required: true,
    },
    setBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const CompanyExchangeRate = model(
  "CompanyExchangeRate",
  companyExchangeRatesSchema,
);

export default CompanyExchangeRate;
