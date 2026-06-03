import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  createBuyOperation,
  deleteBuyOperation,
  getAllOperations,
  getOperation,
  restoreBuyOperation,
  updateOperation,
} from "../controllers/createBuyOperation.js";
import { validateBuyOperation } from "../middlewares/validators.js";
import { audit } from "../middlewares/audit.js";
import { cache } from "../middlewares/cache.js";

const router = express.Router();

// ROUTE TO CREATE A NEW BUY OPERATION

router.post(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  validateBuyOperation,
  createBuyOperation
);

// ROUTE TO RETRIEVES ALL BUY THE OPERATIONS
router.get(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  cache("buyOperations", 3600),
  getAllOperations
);

// ROUTE TO GET A SPECIFIC OPERATION
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  cache("buyOperation", 3600),
  getOperation
);

// ROUTE TO UPDATE AN OPERATION
router.put(
  "/:id/edit",
  verifyToken,
  authorizeRoles("manager"),
  audit("UPDATE", "BuyOperation"),
  updateOperation
);

// ROUTE TO DELETE AN OPERATION
router.put(
  "/:id/delete",
  verifyToken,
  authorizeRoles("manager"),
  audit("DELETE", "BuyOperation"),
  deleteBuyOperation
);

// RESTORE OPERATION
router.put(
  "/:id/restore",
  verifyToken,
  authorizeRoles("manager"),
  audit("RESTORE", "BuyOperation"),
  restoreBuyOperation
);

export default router;
