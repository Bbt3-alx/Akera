import { Schema, model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const receiptSchema = new Schema({
  amount: { type: Number, required: true }, // Currently paying amount
  totalAmount: { type: Number, required: true }, // amount from operation
  remain: { type: Number, required: true }, // totalamount - paiedAmount from operation
  method: { type: String }, // Payment model (ex: Mobile Money, Cash)
  operation: { type: Schema.Types.ObjectId, ref: "BuyOperation" },
  partner: { type: Schema.Types.ObjectId, ref: "Partner" },
  company: { type: Schema.Types.ObjectId, ref: "Company" },
  paiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  dateIssued: { type: Date, default: Date.now },
});

const Receipt = model("Receipt", receiptSchema);

export default Receipt;
