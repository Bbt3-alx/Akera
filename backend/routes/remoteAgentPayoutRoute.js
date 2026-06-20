import express from "express";

import {
  cancelPayout,
  createAgentDeposit,
  createPayout,
  getPayout,
  listGroups,
  listPayouts,
  lookupPayout,
  payPayout,
} from "../controllers/remoteAgentPayout.controller.js";
import { COMPANY_MODULES } from "../constants/companyModules.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
import { requireCompanyModule } from "../middlewares/requireCompanyModule.js";
import { requireManagerContext } from "../middlewares/requireManagerContext.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";
import verifyTransactionPin from "../middlewares/verifyTransactionPin.js";

const router = express.Router();

const activeCompanyAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireCompanyModule(COMPANY_MODULES.REMOTE_AGENT_PAYOUT),
];

router.get("/", activeCompanyAccess, catchAsync(listPayouts));

router.post(
  "/",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_PAYOUT_CREATE", "RemoteAgentPayout"),
  catchAsync(createPayout),
);

router.get(
  "/groups",
  activeCompanyAccess,
  requireManagerContext,
  catchAsync(listGroups),
);

router.post(
  "/groups/:groupId/deposits",
  activeCompanyAccess,
  verifyTransactionPin,
  audit("REMOTE_AGENT_AGENT_DEPOSIT", "AccountOperation"),
  catchAsync(createAgentDeposit),
);

router.post("/lookup", activeCompanyAccess, catchAsync(lookupPayout));

router.get("/:payoutCode", activeCompanyAccess, catchAsync(getPayout));

router.post(
  "/:payoutCode/pay",
  activeCompanyAccess,
  verifyTransactionPin,
  audit("REMOTE_AGENT_PAYOUT_PAY", "RemoteAgentPayout"),
  catchAsync(payPayout),
);

router.post(
  "/:payoutCode/cancel",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_PAYOUT_CANCEL", "RemoteAgentPayout"),
  catchAsync(cancelPayout),
);

export default router;
