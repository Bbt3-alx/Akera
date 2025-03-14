import { Schema, model } from "mongoose";
import getCarat from "../utils/getCarat.js";

const goldObject = {
  base: { type: Number }, // Gold price per gram
  weight: { type: Number },
  w_weight: { type: Number, min: 0 },
  density: { type: Number },
  carat: { type: Number },
  value: { type: Number }, // The value in money for this gold
  situation: { type: String },
};

const buyOperationSchema = new Schema(
  {
    currency: { type: String, enum: ["XOF", "GNF", "USD"], default: "XOF" },
    golds: [goldObject],
    amount: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially paid"],
      default: "pending",
    },
    amountPaid: { type: Number, default: 0 }, // Total amount already paid
    partner: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        "pending",
        "shipped",
        "completed",
        "canceled",
        "on hold",
        "archived",
      ],
      default: "pending",
    },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    archived: { type: Boolean, default: false },
    restorationHistory: [
      {
        restoredAt: { type: Date, default: null },
        restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

// Method to calculate the total amount.
buyOperationSchema.methods.calculateTotalValue = function () {
  return this.gold.reduce(
    (total, goldItem) => total + (goldItem.value || 0),
    0
  );
};

// Pre-save hook to calculate density and carat
buyOperationSchema.pre("save", function (next) {
  if (!this.density && this.w_weight && this.weight) {
    // Calculate the density if not defined
    this.density = this.weight / this.w_weight;
  }
  if (!this.carat && this.density) {
    // Calculate the carat if not defined
    this.carat = getCarat(this.density);
  }
  next();
});

buyOperationSchema.index({ company: 1, deletedAt: 1 });
buyOperationSchema.index({ partner: 1, status: 1 });
const BuyOperation = model("BuyOperation", buyOperationSchema);
export default BuyOperation;
