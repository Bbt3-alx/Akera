import crypto from "node:crypto";
import { Schema, model } from "mongoose";

const INVITATION_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateInvitationCode() {
  const bytes = crypto.randomBytes(10);

  return Array.from(bytes, (byte) =>
    INVITATION_CODE_ALPHABET[byte % INVITATION_CODE_ALPHABET.length]
  ).join("");
}

const companyInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
      enum: ["employee", "partner"],
      required: true,
    },
    currency: {
      type: String,
      enum: ["FCFA", "GNF"],
    },
    startingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invitationCode: {
      type: String,
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: Date,
    rejectedAt: Date,
    revokedAt: Date,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Pre-validate hook to generate a unique token if not provided
companyInvitationSchema.pre("validate", function () {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString("hex");
  }

  if (!this.invitationCode) {
    this.invitationCode = generateInvitationCode();
  }
});

// Compound index to ensure a user can have only one pending invitation per company
companyInvitationSchema.index(
  { email: 1, company: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

const CompanyInvitation = model("CompanyInvitation", companyInvitationSchema);

export default CompanyInvitation;
