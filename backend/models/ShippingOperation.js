import { Schema, model } from "mongoose";

// Shipping Gold
const shippingOperationSchema = new Schema(
  {
    weight: { type: Number, required: true, min: 1 },
    carat: { type: Number, required: true, min: 10 },
    amount: { type: Number, required: true },
    partner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    shippedAt: { type: Date, default: Date.now },
    situation: { type: String }, // Example: Agreement
    fees: { type: Number },
    status: {
      type: String,
      enum: ["pending", "shipped"],
      default: "pending",
    },
    buyId: { type: Schema.Types.ObjectId, ref: "BuyOperation", required: true }, // Link to the buy operation
  },
  { timestamps: true }
);

const ShippingOperation = model("ShippingOperation", shippingOperationSchema);
export default ShippingOperation;
