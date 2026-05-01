import { Schema, model } from "mongoose";

const ledgerEntrySchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      index: true,
    },

    accountCode: {
      type: String,
      required: true,
      index: true,
    },

    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },

    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

ledgerEntrySchema.pre("validate", function () {
  if (
    (this.debit === 0 && this.credit === 0) ||
    (this.debit > 0 && this.credit > 0)
  ) {
    throw new Error("LedgerEntry must have either debit or credit not both.");
  }
});

const LedGerEntry = model("LedgerEntry", ledgerEntrySchema);

export default LedGerEntry;
