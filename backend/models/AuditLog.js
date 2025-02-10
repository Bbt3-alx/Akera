import { Schema, model } from "mongoose";

const auditLogSchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "RESTORE"],
  },
  collectionName: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  details: { type: Schema.Types.Mixed },
  companyId: { type: Schema.Types.ObjectId, ref: "Company", requied: true },
  changes: {
    type: Schema.Types.Mixed,
  },
  Timestamp: { type: Date, default: Date.now },
});

const AuditLog = model("AuditLog", auditLogSchema);
export default AuditLog;
