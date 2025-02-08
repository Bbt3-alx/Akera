import { Schema, model } from "mongoose";

const partnerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "XOF" },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    restorationHistory: [
      {
        restoredAt: Date,
        restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    companies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: true,
      },
    ], // Associeted companies
    transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    operations: [{ type: Schema.Types.ObjectId, ref: "BuyOperation" }],
  },
  { timestamps: true }
);

partnerSchema.index({ deletedAt: 1 });
partnerSchema.index({ companies: 1, deletedAt: 1 });
partnerSchema.index({ deletedAt: 1, restorationHistory: 1 });

const Partner = model("Partner", partnerSchema);
export default Partner;
