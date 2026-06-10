import express from "express";
import {
  createCompany,
  getCompanyProfile,
  updateCompany,
  getCompanies,
} from "../controllers/createCompany.js";
import {
  validateCompanyId,
  validateCompanyUpdate,
} from "../middlewares/validators.js";
import { paginate } from "../middlewares/pagination.js";
import { audit } from "../middlewares/audit.js";
import { companyCreationLimiter } from "../middlewares/rateLimit.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import verifyToken from "../middlewares/verifyToken.js";
import { requireVerifiedUser } from "../middlewares/requireVerifiedUser.js";
import { softDeleteCompany } from "../controllers/createCompany.js";
import { searchCompany } from "../utils/searchAutoCompletion.js";

const router = express.Router();


router.post(
  "/",
  verifyToken,
  requireVerifiedUser,
  companyCreationLimiter,
  createCompany
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "manager"),
  getCompanyProfile
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  paginate(),
  getCompanies
);

// Update company
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  validateCompanyId,
  validateCompanyUpdate,
  audit("Update", "Company"),
  updateCompany
);

// Soft delete a company
router.put(
  "/delete/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("Soft Delete", "Company"),
  softDeleteCompany
);
export default router;
