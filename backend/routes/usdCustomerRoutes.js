import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import { audit } from "../middlewares/audit.js";
import { ROLES } from "../constants/roles.js";
import {
  createUsdCustomer,
  getAllUsdCustomers,
  getUsdCustomer,
  restoreUsdCustomer,
  softDeleteUsdCustomer,
  updateUsdCustomer,
} from "../controllers/usdCustomerManagement.js";
import { cache } from "../middlewares/cache.js";

const router = express.Router();

// CREATE A NEW CUSTOMER
router.post(
  "/customers",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("CREATE", "UsdCustomer"),
  createUsdCustomer
);

// RETRIEVES ALL THE USD CUSTOimport express from "express";
router.get(
  "/customers",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.EMPLOYEE, ROLES.MANAGER),
  cache("usdCustomers"),
  getAllUsdCustomers
);

// ROUTE TO GET A SPECIFIC USD CUSTOMER
router.get(
  "/customers/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE),
  getUsdCustomer
);

// ROUTE TO UPDATE USD CUSTOMER
router.put(
  "/customers/:id/edit",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("UPDATE", "UsdCustomer"),
  updateUsdCustomer
);

// ROUTE TO SOFT DELETE A USD CUSTOMER
router.put(
  "/customers/:id/delete",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("DELETE", "UsdCustomer"),
  softDeleteUsdCustomer
);

// ROUTE TO RESTORE A SOFT DELETED USD CUSTOMER
router.put(
  "/customers/:id/restore",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("UPDATE", "UsdCustomer"),
  restoreUsdCustomer
);

export default router;
