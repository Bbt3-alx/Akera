import { Schema, model } from "mongoose";

const operationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["purchase, sale"],
      required: true,
    },
    weight: { type: Number, required: true },
    carat: { type: Number, required: true },
    amount: { type: Number, required: true },
    partner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Operation = model("Operation", operationSchema);

export default Operation;
