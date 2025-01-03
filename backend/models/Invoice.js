import { Schema, model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const receiptSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  partner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  goldDetails: {
    base: { type: Number, required: true },
    weight: { type: Number, required: true },
    WeightWater: { type: Number, required: true },
    dencity: { type: Number, required: true },
    carat: { type: Number, required: true },
  },
  totalAmount: { type: Number, required: true }, // Total value of the gold
  advancedPaid: { type: Number, default: 0 }, // Amount already paid to the partner
  remainingAmount: { type: Number, default: 0 }, // TotalAmount - AdvancePaid
  dateIssued: { type: Date, default: Date.now },
});

const Receipt = model("Receipt", receiptSchema);

export default Receipt;
