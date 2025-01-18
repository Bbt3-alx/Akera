import { Schema, model } from "mongoose";

// Payment schema
const paymentSchema = new Schema({
  operation: { type: Schema.Types.ObjectId, ref: "BuyOperation" },
  description: { type: String },
  amount: { type: Number, required: true }, // Currently paying amount
  totalAmount: { type: Number, required: true }, // amount from operation
  remain: { type: Number }, // totalamount - paiedAmount from operation
  status: {
    type: String,
    enum: ["canceled", "paid", "partially paid", "pending"],
  },
  date: { type: Date, default: Date.now },
  partner: { type: Schema.Types.ObjectId, ref: "Partner" },
  company: { type: Schema.Types.ObjectId, ref: "Company" },
  paiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  method: { type: String, default: "Cash" }, // Payment model (ex: Mobile Money, Cash)
});

const Payment = model("Payment", paymentSchema);
export default Payment;
