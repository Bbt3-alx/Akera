import mongoose from "mongoose";
const { isValidObjectId } = mongoose;
import { v4 as uuidv4 } from "uuid";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import Receipt from "../models/Receipt.js";
import Company from "../models/Company.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validatePaymentData } from "../utils/paymentUtils.js";
import { calculatePaymentStatus } from "../utils/paymentUtils.js";
import { validateIdParam } from "../utils/validators.js";

// Create new payment draft
export const createPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const {
      amount,
      method,
      partnerId,
      description,
      totalAmount,
      category,
      currency = "XOF",
      idempotencyKey = uuidv4(),
      reference,
      attachments = [],
    } = req.body;

    validatePaymentData(req.body);
    validateIdParam(req);

    // check for duplicate payment using idempotencyKey
    const existingPayment = await Payment.findOne({ idempotencyKey }).session(
      session,
    );
    if (existingPayment) {
      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        payment: existingPayment,
      });
    }

    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);
    if (!manager?.company) {
      throw new ApiError(
        401,
        "You need a company account to create",
        "COMPANY_REQUIRED",
      );
    }

    // Prepare the payment data
    const paymentData = {
      description,
      amount,
      totalAmount: totalAmount ?? amount,
      remain: (totalAmount ?? amount) - amount,
      method,
      category,
      currency,
      reference,
      idempotencyKey,
      attachments,
      status: "draft",
      createdBy: req.user.id,
      paidBy: null,
      company: manager.company._id,
    };

    // If partnerId provided validate and ensure association
    let partner = null;
    if (partnerId) {
      if (!isValidObjectId(partnerId)) {
        throw new ApiError(400, "Invalid partner ID format", "INVALID_PARTNER");
      }
      partner = await Partner.findById(partnerId).session(session);
      if (!partner) {
        throw new ApiError(404, "Partner not found", "PARTNER_NOT_FOUND");
      }
      if (
        !Array.isArray(partner.companies) ||
        !partner.companies.some(
          (c) => c.toString() === manager.company._id.toString(),
        )
      ) {
        throw new ApiError(
          403,
          "Partner not associated with your company",
          "UNAUTHORIZED",
        );
      }
      paymentData.partner = partnerId;
    }

    // create single document (not array) and attach session
    const payment = await Payment.create(paymentData, { session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      code: 201,
      data: payment,
      message: "Payment draft created successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Payment draft creation error:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(
        new ApiError(
          500,
          "Failed to create payment draft",
          "INTERNAL_SERVER_ERROR",
        ),
      );
    }
  } finally {
    session.endSession();
  }
};

// Generate a receipt for a payment
export const generateReceipt = async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid payment ID format." });
  }

  try {
    const payment = await Payment.findById(paymentId).populate(
      "operation",
      "-status -date -createdAt -updatedAt -__v -partner -company",
    ); // Retrieve associated operation details

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const receipt = new Receipt({
      amount: payment.amount,
      totalAmount: payment.operation
        ? payment.operation.amount
        : payment.totalAmount,
      remain: payment.remain,
      method: payment.method,
      paymentId: payment._id,
      operationId: payment.operation ? payment.operation._id : null,
      operationDetails: payment.operation || null,
      partnerId: payment.partner,
      companyId: payment.company,
    });

    await receipt.save();

    res.status(200).json({ success: true, receipt });
  } catch (error) {
    console.error("Generate receipt error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get all the payment histories
export const getPaymentHistories = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    if (!payments || payments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "There is no payment yet.",
        payments: [],
      });
    }
    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get payment histories of an operation
export const getOperationPayments = async (req, res) => {
  const { operationId } = req.params;

  try {
    const payments = await Payment.find({ operation: operationId }).sort({
      date: -1,
    });
    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get a specific payment by id.
export const getPayment = async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid payment ID format." });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      company: manager.company._id,
    });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update a payment
export const updatePayment = async (req, res) => {
  const { amount, method, status, totalAmount } = req.body;
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid payment ID format." });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);
    if (!manager || !manager.company) {
      await session.abortTransaction();
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    const previousAmount = Number(payment.amount ?? 0);
    const newAmount =
      typeof amount === "number" ? Number(amount) : previousAmount;
    const amountDifference = newAmount - previousAmount;

    // If increasing payment amount, ensure company has enough balance for the additional amount
    if (amountDifference > 0 && manager.company.balance < amountDifference) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payment failed, insufficient balance.",
      });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        amount: newAmount,
        method: method ?? payment.method,
        status: status ?? payment.status,
        totalAmount: totalAmount ?? newAmount,
        updatedBy: req.user.id,
      },
      { new: true, session },
    );

    // Adjust company balance: reduce by amountDifference (positive -> deduct, negative -> refund)
    manager.company.balance -= amountDifference;
    await manager.company.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, updatedPayment });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update payment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// Cancel a payment
export const cancelPayment = async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid payment ID format." });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);
    if (!manager || !manager.company) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    if (payment.company.toString() !== manager.company._id.toString()) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized action." });
    }

    // perform delete (consider soft-delete in future)
    const cancelledPayment = await Payment.findByIdAndDelete(paymentId, {
      session,
    });
    if (!cancelledPayment) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    // Refund company balance
    manager.company.balance += cancelledPayment.amount;
    await manager.company.save({ session });

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      cancelledPayment,
      message: `Payment with ID ${paymentId} successfully cancelled`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Cancel payment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
