import { Schema, model } from "mongoose";

//User Shcema
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    roles: [
      {
        type: String,
        required: true,
        enum: [
          "super_admin",
          "admin",
          "accountant",
          "employee",
          "manager",
          "partner",
        ],
        default: "partner",
      },
    ],
    // balance: { type: Number, default: 0 }, //Used only for partners
    // restrictions: {
    //   transactionLimit: { type: Number }, // Maximun transaction amount
    //   isRestricted: { type: Boolean, default: false }, //Restriction flag
    // },
    lastLogin: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    //createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // Reference to the manager who created the account
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = model("User", userSchema);

export default User;
