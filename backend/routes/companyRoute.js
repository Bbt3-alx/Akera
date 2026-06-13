import express from "express";
import { createCompany } from "../controllers/createCompany.js";
import { companyCreationLimiter } from "../middlewares/rateLimit.js";
import verifyToken from "../middlewares/verifyToken.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";

const router = express.Router();

const legacyCompanyRouteDisabled = (req, res) => {
  res.status(410).json({
    success: false,
    code: 410,
    message:
      "Legacy company route disabled. Use membership-context company endpoints instead.",
  });
};

router.post(
  "/",
  verifyToken,
  requireVerifiedUser,
  companyCreationLimiter,
  createCompany
);

router.get("/", legacyCompanyRouteDisabled);

router.get("/:id", legacyCompanyRouteDisabled);

router.put("/delete/:id", legacyCompanyRouteDisabled);

router.put("/:id", legacyCompanyRouteDisabled);

export default router;
