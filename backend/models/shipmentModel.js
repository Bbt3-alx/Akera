import { Schema, model } from "mongoose";

// Shipment Schema
const shipmentSchema = new Schema(
  {
    goldWeight: { type: Number, required: true }, // Weight of gold to be shipped
    carat: { type: Number, required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    shipmentDate: { type: Date, default: Date.now },
    destination: { type: String, default: "Dubai" },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Shipment = model("Shipment", shipmentSchema);

export default Shipment;
