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
      "SECURITY_TRANSACTION_PIN_SETUP",
      "SECURITY_TRANSACTION_PIN_CHANGE",
      "COMPANY_CASH_DEPOSIT",
      "ACCOUNT_OPERATION_COLLECTION_DEPOSIT",
      "ACCOUNT_OPERATION_WITHDRAWAL_REQUEST",
      "ACCOUNT_OPERATION_CONFIRM",
      "ACCOUNT_OPERATION_REJECT",
      "CORRESPONDENT_COLLECTION_CREATE",
      "CORRESPONDENT_COLLECTION_CONFIRM",
      "CORRESPONDENT_COLLECTION_CANCEL",
      "REMOTE_AGENT_PAYOUT_CREATE",
      "REMOTE_AGENT_AGENT_DEPOSIT",
      "REMOTE_AGENT_PAYOUT_PAY",
      "REMOTE_AGENT_PAYOUT_CANCEL",
      "REMOTE_AGENT_GROUP_CREATE",
      "REMOTE_AGENT_GROUP_UPDATE",
      "REMOTE_AGENT_GROUP_MEMBER_ADD",
      "REMOTE_AGENT_GROUP_MEMBER_UPDATE",
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
