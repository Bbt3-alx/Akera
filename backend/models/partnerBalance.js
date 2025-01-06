import { Schema, model } from "mongoose";

const partnerBalance = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const PartnerBalance = model("PartnerBalance", partnerBalance);
export default PartnerBalance;
