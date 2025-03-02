import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import Company from "../models/Company.js";

export const audit = (action, collection) => async (req, res, next) => {
  if (!req.params.id) return next();
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: "Invalid id provided" });
  }
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
