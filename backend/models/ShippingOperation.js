import { Schema, model } from "mongoose";

// Shipping Gold
const shippingOperationSchema = new Schema(
  {
    golds: [
      {
        weight: { type: Number, required: true, min: 1 },
        w_weight: { type: Number, required: true, min: 1 },
        carat: { type: Number, required: true, min: 10 },
        value: { type: Number, required: true },
        partner: { type: Schema.Types.ObjectId, ref: "User" },
        situation: { type: String }, // Example: Agreement
        fees: { type: Number, default: 150 },
      },
    ],
    status: {
      type: String,
      enum: ["in progress", "delivered", "on hold", "canceled"],
      default: "in progress",
    },
    buyOperation: {
      type: Schema.Types.ObjectId,
      ref: "BuyOperation",
      required: true,
    }, // Link to the buy operation to be shipped
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    totalBars: Number, // Total of golds bar
    totalWeight: Number,
    totalFees: Number,
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
shippingOperationSchema.index({ company: 1, createdAt: -1 });
shippingOperationSchema.index({
  buyOperationId: 1,
  status: 1,
});

shippingOperationSchema.index({ company: 1, createdAt: -1 });
shippingOperationSchema.index({ status: 1, company: 1 });

const ShippingOperation = model("ShippingOperation", shippingOperationSchema);
export default ShippingOperation;
