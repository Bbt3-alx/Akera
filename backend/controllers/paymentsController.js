import { isValidObjectId } from "mongoose";
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

    // check for duplicate paymen using indempotencyKey
    const existingPayment = await payment.findOne({ idempotencyKey });
    if (existingPayment) {
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
        "COMPANY_REQUIRED"
      );
    }

    // Prepare the payment data
    const paymentData = {
      description,
      amount,
      totalAmount: totalAmount || amount,
      remain: (totalAmount || amount) - amount,
      method,
      category,
      currency,
      reference,
      idempotencyKey,
      attachments,
      status: "draft",
      createdBy: req.user.id,
      paidBy: null, // Set to null for now, will be updated later
      company: manager.company._id,
    };

    // Check if a partner is involved
    if (partnerId) {
      if (!isValidObjectId(partnerId)) {
        throw new ApiError(400, "Invalid partner ID format", "INVALID_PARTNER");
      }

      const partner = await Partner.findById(partnerId).session(session);
      if (!partner) {
        throw new ApiError(404, "Partner not found", "PARTNER_NOT_FOUND");
      }
    }

    // Check if partner is associated with the company
    const partner = await Partner.findById(partnerId).session(session);
    if (!partner.companies.includes(manager.company._id)) {
      throw new ApiError(
        403,
        "Partner not associated with your company",
        "UNAUTHORIZED"
      );
    }

    paymentData.partner = partnerId;

    const payment = await Payment.create([paymentData], { session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      code: 201,
      data: payment,
      message: "Payment draft created successfully",
    });
  } catch (error) {
    await session.aborTransaction();
    console.error("Payment draft creation error:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(
        new ApiError(
          500,
          "Failed to create payment draft",
          "INTERNAL_SERVER_ERROR"
        )
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
      "-status -date -createdAt -updatedAt -__v -partner -company"
    ); // Retrieve associeted operation details

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const receipt = new Receipt({
      amount: payment.amount,
      totalAmount: payment.operation.amount,
      remain: payment.remain,
      method: payment.method,
      paymentId: payment._id,
      operationId: payment.operation._id,
      operationDetails: payment.operation,
      partnerId: payment.partner,
      companyId: payment.company,
    });

    await receipt.save();

    // Receipt JSON format
    res.status(200).json({ success: true, receipt: receipt });

    // Receipt PDF format
    // const pdfBuffer = await createPdf(receipt);
    // res.set({
    //   "Content-Type": "application/pdf",
    //   "Content-Disposition": "attachment; filename=receipt.pdf",
    // });
    // res.send(pdfBuffer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all the payment histories
export const getPaymentHistories = async (req, res) => {
  try {
    const payments = await Payment.find().sort({
      date: -1,
    });
    if (!payments) {
      return res
        .status(200)
        .json({ success: true, message: "There is no payment yet." });
    }
    res.status(200).json({ success: true, payments: payments });
  } catch (error) {
    console.log(error);
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
    if (!payments) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }
    res.status(200).json({ success: true, payments: payments });
  } catch (error) {
    console.log(error);
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
        .json({ success: false, message: "Access denied.Unauthorized." });
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

    res.status(200).json({ success: true, payment: payment });
  } catch (error) {
    console.log(error);
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

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    // Retrieve the original payment before updating it
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    const previousAmount = payment.amount; // Original amount
    const amountDifference = amount - previousAmount; // Calculate the difference

    // check company balance
    if (
      (amount || totalAmount) &&
      manager.company.balance < amountDifference + amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment failed, insuficient balance.",
      });
    }

    // Update the payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      { amount, method, status, totalAmount: totalAmount || amount },
      { new: true }
    );

    // Update the company balance accordinlly
    manager.company.balance += amountDifference;
    await manager.company.save();

    res.status(200).json({ success: true, updatedPayment: updatedPayment });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
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
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    // Check if the payment belong to the current manager's company.
    if (payment.company.toString() !== manager.company._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized action." });
    }

    const cancelledPayment = await Payment.findByIdAndDelete(paymentId);

    // Update the company balance
    manager.company.balance += cancelledPayment.amount;
    await manager.company.save();

    res.status(200).json({
      success: true,
      cancelledPayment,
      message: `Payment with ID ${paymentId} successfully cancelled`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
