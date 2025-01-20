import { Schema, model } from "mongoose";

// Shipping Gold
const shippingOperationSchema = new Schema(
  {
    golds: [
      {
        weight: { type: Number, required: true, min: 1 },
        w_weight: { type: Number, required: true, min: 1 },
        carat: { type: Number, required: true, min: 10 },
        amount: { type: Number, required: true },
        partner: { type: Schema.Types.ObjectId, ref: "User" },
        situation: { type: String }, // Example: Agreement
        fees: { type: Number, default: 150 },
      },
    ],
    status: {
      type: String,
      enum: ["in progress", "completed", "on hold", "cancel", "shipped"],
      default: "in progress",
    },
    buyOperationId: {
      type: Schema.Types.ObjectId,
      ref: "BuyOperation",
      required: true,
    }, // Link to the buy operation
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    totalBars: Number, // Total of golds bar
    totalWeight: Number,
    totalFees: Number,
  },
  { timestamps: true }
);

const ShippingOperation = model("ShippingOperation", shippingOperationSchema);
export default ShippingOperation;
