import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

export const audit = (action, collection) => async (req, res, next) => {
  res.on("finish", async () => {
    try {
      if (res.statusCode >= 400) {
        return;
      }

      const auditContext = res.locals?.audit ?? {};
      const targetId = auditContext.targetId ?? req.params?.id ?? req.body?._id;
      const targetCode =
        auditContext.targetCode ?? req.params?.transactionCode;
      const userId = req.user?.id;
      const companyId = req.context?.companyId ?? req.user?.company;

      if (!targetId || !userId || !companyId) {
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        console.warn(
          `Audit logging skipped for action: ${action}, invalid targetId`,
        );
        return;
      }

      const auditLog = {
        action,
        collectionName: collection,
        targetId,
        userId,
        companyId,
      };

      if (targetCode) {
        auditLog.targetCode = targetCode;
      }

      if (auditContext.metadata !== undefined) {
        auditLog.details = auditContext.metadata;
      }

      if (auditContext.changes !== undefined) {
        auditLog.changes = auditContext.changes;
      }

      await AuditLog.create(auditLog);
    } catch (error) {
      console.error(
        `Audit logging failed for action: ${action}, user: ${req.user?.id}`,
        error,
      );
    }
  });

  next();
};
