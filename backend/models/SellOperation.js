import { Schema, model } from "mongoose";

// Selling Gold
const sellOperationSchema = new Schema({
  rate: { type: Number, required: true },
  weight: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }, // Removed required: true
  company: { type: Schema.Types.ObjectId, ref: "Company" },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
});
const SellOperation = model("SellOperation", sellOperationSchema);
export default SellOperation;
