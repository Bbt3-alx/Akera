import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import {
  createBuyOperation,
  deleteBuyOperation,
  getAllOperations,
  getOperation,
  updateOperation,
} from "../controllers/createBuyOperation.js";

const router = express.Router();

// ROUTE TO CREATE A NEW BUY OPERATION
router.post("/buy", verifyToken, authorizeRoles("manager"), createBuyOperation);

// ROUTE TO RETRIEVES ALL THE OPERATION
router.get("/", verifyToken, authorizeRoles("manager"), getAllOperations);

// ROUTE TO GET A SPECIFIC OPERATION
router.get(
  "/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  getOperation
);

// ROUTE TO UPDATE AN OPERATION
router.put(
  "/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  updateOperation
);

// ROUTE TO DELETE AN OPERATION
router.delete(
  "/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  deleteBuyOperation
);

export default router;
