import express from "express";

import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  listMine,
  rejectInvitation,
  revokeInvitation,
} from "../controllers/companyInvitation.controller.js";
import { catchAsync, ApiError } from "../middlewares/errorHandler.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

const requireManagerContext = (req, res, next) => {
  if (req.context?.role !== "manager") {
    return next(
      new ApiError(
        403,
        "Only managers can manage invitations",
        "INVITATION_MANAGER_REQUIRED",
      ),
    );
  }

  next();
};

const managerAccess = [
  verifyToken,
  requireVerifiedUser,
  resolveCompanyContext,
  requireManagerContext,
];

const inviteeAccess = [verifyToken, requireVerifiedUser];

router.post("/", managerAccess, catchAsync(createInvitation));
router.get("/", managerAccess, catchAsync(listInvitations));
router.get("/mine", inviteeAccess, catchAsync(listMine));
router.post("/:id/accept", inviteeAccess, catchAsync(acceptInvitation));
router.post("/:id/reject", inviteeAccess, catchAsync(rejectInvitation));
router.post("/:id/revoke", managerAccess, catchAsync(revokeInvitation));

export default router;
