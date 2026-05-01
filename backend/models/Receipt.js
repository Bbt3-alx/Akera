import { Schema, model } from "mongoose";

const receiptSchema = new Schema(
  {
    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },

    snapshot: {
      type: Object,
      required: true,
    },

    signatureHash: {
      type: String,
      required: true,
    },

    pdfPath: {
      type: String,
      required: true,
    },

    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

receiptSchema.index(
  { company: 1, receiptNumber: 1 },
  { unique: true }
);

const Receipt = model("Receipt", receiptSchema);

export default Receipt;
