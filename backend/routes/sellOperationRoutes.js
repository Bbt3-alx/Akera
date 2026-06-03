import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  createSellOperation,
  deleteSellOperation,
  getSellOperation,
  getSellOperations,
  updateSellOperation,
} from "../controllers/sellOperationController.js";
import { audit } from "../middlewares/audit.js";
import { catchAsync } from "../middlewares/errorHandler.js";
const router = express.Router();

//ROUTE TO CREATE A NEW SELL OPERATION
router.post(
  "/",
  verifyToken,
  authorizeRoles("manager"),
  audit("CREATE", "SellOperation"),
  createSellOperation
);

// ROUTE TO RETRIEVES ALL THE SELLS OPERATION
router.get("/", verifyToken, authorizeRoles("manager"), getSellOperations);

// ROUTE TO GET A SPECIFIC SELL OPERATION BY ID
router.get("/:id", verifyToken, authorizeRoles("manager"), getSellOperation);

//ROUTE TO UPDATE A SELL
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("UPDATE", "SellOperation"),
  updateSellOperation
);

// ROUTE TO DELETE A SELL
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("manager"),
  audit("DELETE", "SellOperation"),
  deleteSellOperation
);

export default router;
