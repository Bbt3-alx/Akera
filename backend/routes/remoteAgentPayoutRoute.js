import express from "express";

import {
  addGroupMember,
  cancelPayout,
  createAgentDeposit,
  createGroup,
  createPayout,
  getGroup,
  getPayout,
  listGroups,
  listMyGroups,
  listPayouts,
  lookupPayout,
  payPayout,
  updateGroup,
  updateGroupMember,
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

router.get("/my-groups", activeCompanyAccess, catchAsync(listMyGroups));

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
  "/groups",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_GROUP_CREATE", "RemoteAgentGroup"),
  catchAsync(createGroup),
);

router.get(
  "/groups/:groupId",
  activeCompanyAccess,
  requireManagerContext,
  catchAsync(getGroup),
);

router.patch(
  "/groups/:groupId",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_GROUP_UPDATE", "RemoteAgentGroup"),
  catchAsync(updateGroup),
);

router.post(
  "/groups/:groupId/members",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_GROUP_MEMBER_ADD", "RemoteAgentGroup"),
  catchAsync(addGroupMember),
);

router.patch(
  "/groups/:groupId/members/:membershipId",
  activeCompanyAccess,
  requireManagerContext,
  verifyTransactionPin,
  audit("REMOTE_AGENT_GROUP_MEMBER_UPDATE", "RemoteAgentGroup"),
  catchAsync(updateGroupMember),
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
