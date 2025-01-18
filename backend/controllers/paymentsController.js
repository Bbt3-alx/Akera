import { isValidObjectId } from "mongoose";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";

// Make a new payment
export const createPayment = async (req, res) => {
  const { amount, method, partnerId, description, totalAmount } = req.body;

  if (!amount || !description) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing." });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, unauthorised" });
    }

    // Check if the user has a company
    if (!manager.company) {
      return res.status(401).json({
        success: false,
        message: "You cannot initiate a payment, create a company first.",
      });
    }

    // Check the payment amount
    const total = totalAmount || amount;
    if (amount > total) {
      return res.status(400).json({
        success: false,
        message: "Payment amount cannot exceed the total amount.",
      });
    }

    // Create the new payment
    const payment = new Payment({
      description,
      amount,
      totalAmount: total,
      remain: total - amount,
      method,
      partner: partnerId,
      paidBy: req.user.id,
      company: manager.company._id,
    });

    // Check if a partner is involved
    if (partnerId) {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return res
          .status(404)
          .json({ success: false, message: "Partner not exist." });
      }

      // Deduct the amount to the partner balance
      partner.balance -= amount;
      await partner.save();
    }

    // Deduct the amount to the company balance
    manager.company.balance -= amount;
    await manager.company.save();

    // Save the payement to the database
    await payment.save();
    res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ success: false, message: error.message });
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
    const payment = await Payment.findById(paymentId).populate("operation"); // Retrieve associeted operation details

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const receipt = {
      paymentId: payment._id,
      operationId: payment.operation._id,
      amount: payment.amount,
      totalAmount: payment.operation.amount,
      remain: payment.remain,
      date: payment.date,
      method: payment.method,
      operationDetails: payment.operation,
      partner: payment.partner,
      company: payment.company,
    };

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
      cancelledPayment: ccancelledPayment,
      message: `Payment with ID ${paymentId} successfully cancelled`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
