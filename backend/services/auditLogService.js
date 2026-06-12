import AuditLog from "../models/AuditLog.js";

export const logDeletion = async (data) => {
  await AuditLog.create({
    action: "HARD_DELETE",
    collection: data.collection,
    count: data.count,
    initiatedBy: "system",
  });
};
