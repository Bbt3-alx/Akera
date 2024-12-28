import { Schema, model } from "mongoose";
import { uuidv4 } from "uuid";

//Transaction Schema
const transactionSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    code: {
      type: String,
      default: uuidv4,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    client: {
      type: String,
      required: true,
    }, // Name of the person to be paid
    partners: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }, // Associeted partners
    ],
    company: [
      {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
      },
    ], // Associeted managers
  },
  { timestamps: true }
);

const Transaction = model("Transaction", transactionSchema);
export default Transaction;
