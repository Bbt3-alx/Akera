import { Schema, model } from "mongoose";
import { LEDGER_TYPES } from "../constants/ledgerTypes.js";

const ledgerEntrySchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    membership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      index: true,
    },

    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      index: true,
    },

    accountType: {
      type: String,
      enum: ["COMPANY", "PARTNER"],
      required: true,
    },

    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(LEDGER_TYPES),
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

ledgerEntrySchema.index({ company: 1, accountType: 1, currency: 1 });
ledgerEntrySchema.index({ membership: 1, accountType: 1, currency: 1 });
ledgerEntrySchema.index({ transaction: 1, accountType: 1 }, { unique: true });

const LedGerEntry = model("LedgerEntry", ledgerEntrySchema);

export default LedGerEntry;
