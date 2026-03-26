import { model, Schema } from "mongoose";

const companyBrandingSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    logoUrl: String,
    primaryColor: {
      type: String,
      default: "#1A73E8",
    },

    footerText: String,

    receiptPrefix: {
      type: String,
      default: "RCPT",
    },

    receiptCounter: {
      type: Number,
      default: 0,
    },
  },
  { timetimes: true },
);

const CompanyBranding = model("CompanyBranding", companyBrandingSchema);

export default CompanyBranding;
