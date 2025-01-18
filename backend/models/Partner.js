import { Schema, model } from "mongoose";

const partnerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    balance: { type: Number, default: 0 },
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

const Partner = model("Partner", partnerSchema);
export default Partner;
