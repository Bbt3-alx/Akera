import express from "express";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  addPartner,
  getPartners,
  getPartnerBalance,
  removePartner,
  getPartner,
  restorePartner,
} from "../controllers/managePartner.js";
import { audit } from "../middlewares/audit.js";
import verifyToken from "../middlewares/verifyToken.js";
import { updatePartner } from "../controllers/managePartner.js";
import { paginate } from "../middlewares/pagination.js";
import { validatePartnerId } from "../middlewares/validators.js";
import { ROLES } from "../constants/roles.js";
import { cache } from "../middlewares/cache.js";

const router = express.Router();

// ROUTE TO CREATE A NEW COMPUTER

router.post(
  "/new",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  addPartner
);

// ROUTE TO RETRIEVES ALL THE PARTNER BELONG TO A COMPANY
router.get(
  "/",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  cache("partners", 60),
  paginate(),
  getPartners
);

// ROUTE TO GET A SPECIFIC PARTNER BY ITS ID
router.get(
  "/:id",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  getPartner
);

// ROUTE TO UPDATE A SPECIFIC PARTNER
router.put(
  "/:id/update/",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  audit("UPDATE", "Partner"),
  updatePartner
);

// ROUTE TO GET A PERTNER'S BALANCE
router.get(
  "/:id/balance",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  getPartnerBalance
);

// Remove a partner
router.put(
  "/:id/remove",
  verifyToken,
  authorizeRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validatePartnerId,
  audit("DELETE", "Partner"),
  removePartner
);

// RESTORE PARTNER
router.put(
  "/:id/restore",
  verifyToken,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validatePartnerId,
  audit("RESTORE", "Partner"),
  restorePartner
);
export default router;
