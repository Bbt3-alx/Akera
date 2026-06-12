import { Schema, model } from "mongoose";

const auditLogSchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: [
      "CREATE",
      "UPDATE",
      "CANCEL",
      "STATUS_CHANGE",
      "RESTORE",
      "TRANSACTION_CREATE",
      "TRANSACTION_PAY",
      "TRANSACTION_CANCEL",
      "TRANSACTION_REVERSE",
    ],
  },
  collectionName: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetCode: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  details: { type: Schema.Types.Mixed },
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  changes: {
    type: Schema.Types.Mixed,
  },
  Timestamp: { type: Date, default: Date.now },
});

const AuditLog = model("AuditLog", auditLogSchema);
export default AuditLog;
