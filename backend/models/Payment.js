import { Schema, model } from "mongoose";

// Payment schema
const paymentSchema = new Schema(
  {
    // Basic Payment Info
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    remain: {
      type: Number,
      min: 0,
      default: function () {
        return this.totalAmount - this.amount;
      },
    },

    // Categorization & status
    category: {
      type: String,
      enum: ["operational", "payroll", "vendor", "other"],
      default: "operational",
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "completed",
        "rejected",
        "cancelled",
      ],
      default: "draft",
    },

    // Payment details
    method: {
      type: String,
      enum: ["bank_transfer", "cash", "check", "card", "mobile_money"],
      default: "cash",
    },
    currency: {
      type: String,
      default: "XOF",
      exchangeRate: { type: Number, default: 1 },
    },

    // References
    reference: { type: String }, // External reference number
    operation: {
      type: Schema.Types.ObjectId,
      ref: "BuyOperation",
    },
    partner: { type: Schema.Types.ObjectId, ref: "Partner" },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },

    // Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Audit Information
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },

    // Idempotency
    idempotencyKey: { type: String, index: true },

    // Workflow
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        user: { type: Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Add hooks for status change tracking
paymentSchema.pre("save", function (next) {
  const payment = this;
  if (payment.isModified("status")) {
    payment.statusHistory.push({
      status: payment.status,
      timestamp: new Date(),
      user:
        payment.approvedBy ||
        payment.rejectedBy ||
        payment.cancelledBy ||
        payment.createdBy,
    });
  }
  next();
});

// Virtual for formatted amount
paymentSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: this.currency,
  }).format(this.amount);
});

// Add index for faster queries
paymentSchema.index({ operation: 1, partner: 1, company: 1 });

const Payment = model("Payment", paymentSchema);
export default Payment;
