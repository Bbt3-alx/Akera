import { Schema, model } from "mongoose";

const companyMembershipSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["manager", "employee", "partner"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "invited", "suspended"],
      default: "active",
      index: true,
    },

    // Finance
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Compound index to ensure a user can have only one membership per company
companyMembershipSchema.index({ user: 1, company: 1 }, { unique: true });

const CompanyMembership = model("CompanyMembership", companyMembershipSchema);

export default CompanyMembership;
