import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true },
    collectionName: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    details: { type: Schema.Types.Mixed },
  },
  { Timestamp: true }
);

const AuditLog = model("AuditLog", auditLogSchema);
export default AuditLog;
