import AuditLog from "../models/AuditLog.js";
import Company from "../models/Company.js";

export const audit = (action, collection) => async (req, res, next) => {
  const oldDoc =
    req.method === "PUT" && req.params.id
      ? await Company.findById(req.params.id).lean()
      : null;

  res.on("finish", async () => {
    try {
      if (res.statusCode < 400) {
        await AuditLog.create({
          action,
          collectionName: collection,
          targetId: req.params.id || req.body._id,
          userId: req.user.id,
          companyId: req.user.company,
          changes: req.body,
        });
      }
    } catch (error) {
      console.error(
        `Audit logging failed for action: ${action}, user: ${req.user.id}`,
        error
      );
    }
  });

  next();
};
