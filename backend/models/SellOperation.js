import { Schema, model } from "mongoose";

// Selling Gold
const sellOperationSchema = new Schema({
  rate: { type: Number, required: true },
  weight: { type: Number, required: true, min: 0.001 },
  amount: { type: Number, required: true },
  unit: { type: String, enum: ["g", "kg", "ozt"] },
  totalAmount: { type: Number },
  date: { type: Date, default: Date.now },
  company: { type: Schema.Types.ObjectId, ref: "Company" },
  status: {
    type: String,
    enum: ["sold", "canceled"],
    default: "sold",
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
});
const SellOperation = model("SellOperation", sellOperationSchema);
export default SellOperation;
