import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import CompanyExchangeRate from "../models/CompanyExchangeRate.js";
import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";
import Partner from "../models/Partner.js";
import { convert } from "../utils/convertAmount.js";
import { generateTransactionCode } from "../utils/generateTransactionCode.js";

// Get Transactions with Pagination and Filtering
export const getTransactions = async (req, res) => {
  try {
    const { companyId, role } = req.context;
    if (role !== "manager" && role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { page = 1, limit = 20, status } = req.query;
    const filter = {
      company: companyId,
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

// Get Partner Transactions
export const getPartnerTransactions = async (req, res) => {
  try {
    const { companyId, role } = req.context;

    if (role !== "partner") {
      return res.status(403).json({
        success: false,
        message: "Only partners can access this ressource",
      });
    }

    const { page = 1, limit = 20, status } = req.query;

    const filter = {
      company: companyId,
      initiatedBy: req.user.id,
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    console.error("Get partner transactions error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch partner transactions",
    });
  }
};

// Get transaction by ID
export const getTransaction = async (req, res) => {
  try {
    const { companyId, role } = req.context;
    const { id } = req.params;

    const baseFilter = {
      _id: id,
      company: companyId,
    };

    if (role === "partner") {
      baseFilter.initiatedBy = req.user.id;
    }

    const transaction = await Transaction.findOne(baseFilter).lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }
    res.status(200).json({ success: true, code: 200, data: transaction });
  } catch (error) {
    console.error("Get transaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve transaction",
    });
  }
};

// Update Transaction
export const updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { description, amount } = req.body;
    const user = await User.findById(req.user.id)
      .populate("company")
      .session(session);
    const companyId = user.company._id;

    // Validate input
    if (isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Valid positive amount required",
      });
    }

    if (description && description.trim() === "") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Description must be a non-empty string",
      });
    }

    const [manager, transaction] = await Promise.all([
      User.findById(req.user.id).select("company").session(session),
      Transaction.findOne({
        _id: req.params.id,
        company: companyId,
        deletedAt: null,
      }).session(session),
    ]);

    // Authorization checks
    if (!transaction || !manager?.company) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Transaction not found",
      });
    }

    // Check if transaction is editable
    if (transaction.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Only pending transaction can be modified",
      });
    }

    const amountDifference = amount - transaction.amount;
    const [partner, company] = await Promise.all([
      Partner.findById(transaction.partner).session(session),
      Company.findById(manager.company).session(session),
    ]);

    // Vaidate balances
    if (partner.balance + amountDifference < 0) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient partner balance",
      });
    }

    if (company.balance + amountDifference < 0) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient company balance",
      });
    }

    // Update transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { description, amount, updatedBy: req.user.id },
      { new: true, session },
    );

    // Update balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        transaction.partner,
        { $inc: { balance: -amountDifference } },
        { session },
      ),
      Company.findByIdAndUpdate(
        manager.company,
        { $inc: { balance: -amountDifference } },
        { session },
      ),
    ]);

    await session.commitTransaction();

    res
      .status(200)
      .json({ success: true, code: 200, data: updatedTransaction });
  } catch (error) {
    await session.abortTransaction();
    console.error("update transaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update transaction",
    });
  } finally {
    session.endSession();
  }
};

// Get transaction by code
export const getTransactionByCode = async (req, res) => {
  const { companyId, role } = req.context;
  if (role !== "manager" && role !== "employee") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const transaction = await Transaction.findOne({
    transactionCode: req.params.transactionCode,
    company: companyId,
  }).lean();
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }
  res.status(200).json({ success: true, data: transaction });
};

// Soft Delete a transaction
export const deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);

    if (!manager?.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, Unautorized" });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        company: manager.company._id,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
        deletedBy: req.user.id,
        status: "canceled",
      },
      { new: true, session },
    );

    if (!transaction) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Transaction not found." });
    }

    // Restore balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        transaction.partner,
        {
          $inc: { balance: transaction.amount },
        },
        { session },
      ),
      Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: { balance: transaction.amount },
        },
        { session },
      ),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: "Transaction canceled successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete transaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete transaction",
    });
  } finally {
    session.endSession();
  }
};

// Restore a soft deleted transaction
export const restoreTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);

    if (!manager?.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, Unautorized" });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        company: manager.company._id,
        deletedAt: { $ne: null },
      },
      {
        deletedAt: null,
        deletedBy: null,
        restoredBy: req.user.id,
        status: "pending",
      },
      { new: true, session },
    );

    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Transaction not found or not eligible for restoration.",
      });
    }

    // Restore balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        transaction.partner,
        {
          $inc: { balance: -transaction.amount },
        },
        { session },
      ),
      Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: { balance: -transaction.amount },
        },
        { session },
      ),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: "Transaction restored successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Restore transaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retore transaction",
    });
  } finally {
    session.endSession();
  }
};
