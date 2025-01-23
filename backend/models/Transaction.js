import { Schema, model } from "mongoose";

//Transaction Schema
const transactionSchema = new Schema(
  {
    amount: { type: Number, required: true },
    code: { type: String },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true }, // Name of the person to be paid or purpose
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    }, // Associeted partners
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

const Transaction = model("Transaction", transactionSchema);
export default Transaction;
