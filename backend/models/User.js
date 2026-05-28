import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    transactionPinHash: {type: String,select: false},
    lastLogin: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const User = model("User", userSchema);

export default User;
