import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import payForOperation from "../controllers/payForOperation.js";
import {
  createPayment,
  getOperationPayments,
  getPaymentHistories,
  generateReceipt,
  updatePayment,
  cancelPayment,
  getPayment,
} from "../controllers/paymentsController.js";

const router = express.Router();

// ROUTES TO MAKE A NEW PAYMENT
router.post("/new", verifyToken, authorizeRoles("manager"), createPayment);

// ROUTES TO MAKE A PAYMENT FOR AN OPERATION
router.post(
  "/operations/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  payForOperation
);

// ROUTE TO GENERATE RECEIPT FOR A PAYMENT
router.post(
  "/receipt/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  generateReceipt
);

// ROUTE TO RETRIEVE ALL THE PAYMENT HISTORIES
router.get("/", verifyToken, authorizeRoles("manager"), getPaymentHistories);

// ROUTE TO GET A SPECIFIC PAYMENT BY IT'S ID
router.get("/:paymentId", verifyToken, authorizeRoles("manager"), getPayment);

// ROUTE TO GET PAYMENT HYSTORIES FOR A SPECIFIC OPERATION
router.get(
  "/operations/:operationId",
  verifyToken,
  authorizeRoles("manager"),
  getOperationPayments
);

// ROUTE TO UPDATE A PAYMENT
router.put(
  "/edit/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  updatePayment
);

// ROUTE TO CANCEL A PAYMENT
router.delete(
  "/cancel/:paymentId",
  verifyToken,
  authorizeRoles("manager"),
  cancelPayment
);

export default router;
