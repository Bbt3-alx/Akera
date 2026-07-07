import express from "express";

import {
  getReconciliationIssues,
  resolveIssue,
  scanReconciliation,
} from "../controllers/reconciliation.controller.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
];

router.get(
  "/issues",
  activeCompanyAccess,
  requireManagerContext,
  catchAsync(getReconciliationIssues),
);

router.post(
  "/scan",
  activeCompanyAccess,
  requireManagerContext,
  audit("RECONCILIATION_SCAN", "ReconciliationIssue"),
  catchAsync(scanReconciliation),
);

router.patch(
  "/issues/:id/resolve",
  activeCompanyAccess,
  requireManagerContext,
  audit("RECONCILIATION_ISSUE_RESOLVE", "ReconciliationIssue"),
  catchAsync(resolveIssue),
);

export default router;
