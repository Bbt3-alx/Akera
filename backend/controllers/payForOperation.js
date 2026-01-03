import mongoose from "mongoose";
import BuyOperation from "../models/BuyOperation.js";
import Payment from "../models/Payment.js";
import Partner from "../models/Partner.js";
import { validateIdParam } from "../utils/validators.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validatePaymentInput } from "../validations/validatePaymentInput.js";
import {
  calculatePaymentStatus,
  validatePaymentData,
} from "../utils/paymentUtils.js";

const payForOperation = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction(transactionOptions);

  try {
    // Validate input
    validatePaymentInput(req.body);

    const { amount, method, partnerId, category } = req.body;
    const { operationId } = req.params;
    validateIdParam(req);

    // Parse amount to avoid floating point issues
    const paymentAmount = parseFloat(Number(amount).toFixed(2));

    const manager = await checkUserAuthorization(req, session);

    // Check if the selected partner exist
    const partner = await Partner.findById(partnerId).session(session);
    if (!partner) {
      throw new ApiError(404, "Partner not found", "INVALID_PARTNER");
    }

    // Find the operation
    const operation = await BuyOperation.findOne({
      _id: operationId,
      partner: partnerId,
      company: manager.company._id,
      status: { $ne: "CANCELLED" },
    }).session(session);

    if (!operation) {
      throw new ApiError(404, "Operation not found", "OPERATION_NOT_FOUND");
    }

    if (operation.paymentStatus === "completed") {
      throw new ApiError(
        409,
        "Operation already completed",
        "DUPLICATED_PAYMENT"
      );
    }

    // Calculate remaining amount
    const previousPayment = await Payment.find({
      operation: operation._id,
      status: { $ne: "cancelled" },
    }).session(session);

    const totalPaidAmount = previousPayment.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    const remainingAmount = operation.amount - totalPaidAmount;

    // Validate payment
    validatePaymentData(
      paymentAmount,
      remainingAmount,
      manager.company.balance
    );

    // Update the operation paid amount
    operation.amountPaid += paymentAmount;
    operation.paymentStatus = calculatePaymentStatus(
      operation.amount,
      operation.amountPaid
    );
    await operation.save({ session });

    // Create the new payment
    const payment = new Payment({
      operation: operationId,
      amount: paymentAmount,
      totalAmount: operation.amount,
      category: category || "operational",
      method,
      status: "completed",
      partner: partnerId,
      company: manager.company._id,
      paidBy: req.user.id,
    });

    await payment.save({ session });

    // Update company balance
    manager.company.balance -= paymentAmount;
    await manager.company.save({ session });

    // Update partner's balance
    partner.balance -= paymentAmount;
    await partner.save({ session });

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      data: payment,
      message: `Payment of ${paymentAmount} processed successfully. Operation status: ${operation.paymentStatus}`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Buy operation payment error:", error);

    next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to process payment", "PAYMENT_FAILED")
    );
  } finally {
    session.endSession();
  }
};

export default payForOperation;
