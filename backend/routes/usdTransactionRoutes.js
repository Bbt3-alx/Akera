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
import {
  createUsdCustomer,
  getAllUsdCustomers,
  getUsdCustomer,
  restoreUsdCustomer,
  softDeleteUsdCustomer,
  updateUsdCustomer,
} from "../controllers/usdCustomerManagement.js";

const router = express.Router();

// ROUTE TO CREATE A NEW USD TRANSACTION
router.post(
  "/transactions",
  verifyToken,
  authorizeRoles("manager"),
  createSellUsd
);

// ROUTE TO RETRIEVES ALL USD TRANSACTIONS INCLUDING SOFT DELETED
router.get(
  "/transactions",
  verifyToken,
  authorizeRoles("manager"),
  getAllUsdTransactions
);

// ROUTE TO RETRIEVES ALL THE ACTIVE TRANSACTION
router.get(
  "/transactions/actives",
  verifyToken,
  authorizeRoles("manager"),
  activeTransactions
);

// ROUTE TO GET A SPECIFIC USD TRANSACTION
router.get(
  "/transactions/:usdTransactionId",
  verifyToken,
  authorizeRoles("manager"),
  getUsdTransaction
);

// ROUTE TO UPDATE A USD TRANSACTION
router.put(
  "/transactions/edit/:usdTransactionId",
  verifyToken,
  authorizeRoles("manager"),
  updateSellUsd
);

// ROUTE TO SOFT DELETE A USD TRANSACTION
router.put(
  "/transactions/delete/:usdTransactionId",
  verifyToken,
  authorizeRoles("manager"),
  softDeleteSellUsd
);

// ROUTE TO  RESTORE A SOFT DELETED OPERATION
router.put(
  "/transactions/restore/:usdTransactionId",
  verifyToken,
  authorizeRoles("manager"),
  restoreSellUsd
);

// usd customers
// CREATE A NEW CUSTOMER
router.post(
  "/customers",
  verifyToken,
  authorizeRoles("manager"),
  createUsdCustomer
);

// RETRIEVES ALL THE USD CUSTOMER
router.get(
  "/customers",
  verifyToken,
  authorizeRoles("manager"),
  getAllUsdCustomers
);

// ROUTE TO GET A SPECIFIC USD CUSTOMER
router.get(
  "/customers/:usdCustomerId",
  verifyToken,
  authorizeRoles("manager"),
  getUsdCustomer
);

// ROUTE TO UPDATE USD CUSTOMER
router.put(
  "/customers/edit/:usdCustomerId",
  verifyToken,
  authorizeRoles("manager"),
  updateUsdCustomer
);

// ROUTE TO SOFT DELETE A USD CUSTOMER
router.delete(
  "/customers/delete/:usdCustomerId",
  verifyToken,
  authorizeRoles("manager"),
  softDeleteUsdCustomer
);

// ROUTE TO RESTORE A SOFT DELETED USD CUSTOMER
router.put(
  "/customers/restore/:usdCustomerId",
  verifyToken,
  authorizeRoles("manager"),
  restoreUsdCustomer
);
export default router;
