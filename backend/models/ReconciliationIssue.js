import { Schema, model } from "mongoose";

export const RECONCILIATION_WORKFLOW_TYPES = [
  "transaction",
  "payment",
  "receipt",
  "company_cash",
  "account_operation",
  "correspondent_collection",
  "correspondent_delivery",
  "remote_agent_payout",
];

export const RECONCILIATION_SEVERITIES = ["info", "warning", "critical"];
export const RECONCILIATION_STATUSES = ["open", "resolved"];

const reconciliationSourceRefSchema = new Schema(
  {
    collectionName: { type: String, required: true },
    documentId: { type: Schema.Types.ObjectId, required: true },
    code: { type: String },
  },
  { _id: false },
);

const reconciliationIssueSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    workflowType: {
      type: String,
      enum: RECONCILIATION_WORKFLOW_TYPES,
      required: true,
      index: true,
    },
    issueType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    severity: {
      type: String,
      enum: RECONCILIATION_SEVERITIES,
      required: true,
      default: "warning",
      index: true,
    },
    status: {
      type: String,
      enum: RECONCILIATION_STATUSES,
      required: true,
      default: "open",
      index: true,
    },
    sourceRefs: {
      type: [reconciliationSourceRefSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one source reference is required",
      },
    },
    sourceKey: {
      type: String,
      required: true,
      trim: true,
    },
    expectedAmount: { type: Number, default: null },
    actualAmount: { type: Number, default: null },
    currency: {
      type: String,
      enum: ["FCFA", "GNF", "XOF", null],
      default: null,
    },
    difference: { type: Number, default: null },
    referenceCode: {
      type: String,
      trim: true,
      index: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

reconciliationIssueSchema.pre("validate", function setSourceKey() {
  if (!this.sourceKey && Array.isArray(this.sourceRefs)) {
    this.sourceKey = this.sourceRefs
      .map((source) => `${source.collectionName}:${source.documentId}`)
      .join("|");
  }
});

reconciliationIssueSchema.index({
  company: 1,
  status: 1,
  severity: 1,
  workflowType: 1,
  detectedAt: -1,
});

reconciliationIssueSchema.index(
  {
    company: 1,
    issueType: 1,
    sourceKey: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "open",
    },
  },
);

const ReconciliationIssue = model(
  "ReconciliationIssue",
  reconciliationIssueSchema,
);

export default ReconciliationIssue;
