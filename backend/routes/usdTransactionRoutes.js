import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  activeTransactions,
  createSellUsd,
  getAllUsdTransactions,
  getUsdTransaction,
  restoreSellUsd,
  softDeleteSellUsd,
  updateSellUsd,
} from "../controllers/manageUsdTransactions.js";
import { audit } from "../middlewares/audit.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

// ROUTE TO CREATE A NEW USD TRANSACTION
router.post(
  "/transactions",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.PARTNER, ROLES.ADMIN),
  audit("CREATE", "DollarExchange"),
  createSellUsd
);

// ROUTE TO RETRIEVES ALL USD TRANSACTIONS INCLUDING SOFT DELETED
router.get(
  "/transactions",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE),
  getAllUsdTransactions
);

// ROUTE TO RETRIEVES ALL THE ACTIVE TRANSACTION
router.get(
  "/transactions/actives",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE),
  activeTransactions
);

// ROUTE TO GET A SPECIFIC USD TRANSACTION
router.get(
  "/transactions/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE),
  getUsdTransaction
);

// ROUTE TO UPDATE A USD TRANSACTION
router.put(
  "/transactions/edit/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("UPDATE", "DollarExchange"),
  updateSellUsd
);

// ROUTE TO SOFT DELETE A USD TRANSACTION
router.put(
  "/transactions/delete/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("DELETE", "DollarExchange"),
  softDeleteSellUsd
);

// ROUTE TO  RESTORE A SOFT DELETED OPERATION
router.put(
  "/transactions/restore/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("RESTORE", "DollarExchange"),
  restoreSellUsd
);

export default router;
