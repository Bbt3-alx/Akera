import { Schema, model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const receiptSchema = new Schema(
  {
    amount: { type: Number, required: true }, // Currently paying amount
    totalAmount: { type: Number, required: true }, // amount from operation
    remain: { type: Number, required: true }, // totalamount - paiedAmount from operation
    method: { type: String }, // Payment model (ex: Mobile Money, Cash)
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    operationId: { type: Schema.Types.ObjectId, ref: "BuyOperation" },
    operationDetails: { type: Schema.Types.ObjectId, ref: "BuyOperation" },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Receipt = model("Receipt", receiptSchema);

export default Receipt;
