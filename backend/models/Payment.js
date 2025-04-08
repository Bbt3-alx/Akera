import { Schema, model } from "mongoose";

// Payment schema
const paymentSchema = new Schema(
  {
    operation: {
      type: Schema.Types.ObjectId,
      ref: "BuyOperation",
      required: true,
    },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 }, // Currently paying amount
    totalAmount: { type: Number, required: true, min: 0 }, // amount from operation
    remain: {
      type: Number,
      min: 0,
      default: function () {
        return this.totalAmount - this.amount;
      },
    },
    status: {
      type: String,
      enum: ["cancelled", "paid", "partially paid", "pending"],
    },
    date: { type: Date, default: Date.now },
    partner: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    method: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Mobile Money", "Check", "Credit Card"],
      default: "Cash",
    }, // Payment model (ex: Mobile Money, Cash)
    updatedAt: { type: Date, default: Date.now }, // Last update date
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Last user who updated the payment
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" }, // Last user who cancelled the payment
    cancelledAt: { type: Date }, // Last date when the payment was cancelled
  },
  { timestamps: true, toJSON: { getters: true } }
);

// Add a virtual for getting the payment status dynamically
paymentSchema.virtual("computedStatus").get(function () {
  if (this.amount >= this.totalAmount) return "paid";
  if (this.amount > 0) return "partially paid";
  return "pending";
});

// Add index for faster queries
paymentSchema.index({ operation: 1, partner: 1, company: 1 });

const Payment = model("Payment", paymentSchema);
export default Payment;
