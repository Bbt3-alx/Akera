import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import mongoose from "mongoose";
import Company from "../models/Company.js";

// Make a new transaction
export const createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description, partnerId } = req.body;

    const manager = await User.findById(req.user.id)
      .select("company")
      .session(session);

    // Authorization checks
    if (!manager?.company) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Company association required",
      });
    }

    const [partner, company] = await Promise.all([
      Partner.findById(partnerId).session(session),
      Company.findById(manager.company).session(session),
    ]);

    // Validation checks
    if (!partner || !partner.companies.includes(company._id)) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Partner not found in your company",
      });
    }

    // Verify if the partner has enought balance
    if (amount > partner.balance) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Inuffficient partner balance !",
      });
    }

    if (amount > company.balance) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        code: 422,
        message: "Insufficient company balance",
      });
    }

    // Create transaction
    const transaction = await Transaction.create(
      [
        {
          amount,
          description,
          partner: partnerId,
          company: company._id,
        },
      ],
      { session }
    );

    // Update balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        partnerId,
        { $inc: { balance: -amount } },
        { session }
      ),
      Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { balance: -amount },
        },
        { session }
      ),
    ]);

    await session.commitTransaction();

    res.status(201).json({ success: true, code: 201, data: transaction[0] });
  } catch (error) {
    await session.abortTransaction();
    console.log("Tansaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Transaction processing failed",
    });
  } finally {
    session.endSession();
  }
};

// Get Transactions with Pagination and Filtering
export const getTransactions = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).select("company").lean();

    if (!manager?.company) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Company association required",
      });
    }

    const { page = 1, limit = 10, status, minAmount, maxAmount } = req.query;
    const filter = { company: manager.company };

    if (status) filter.status = status;
    if (minAmount) filter.amount = { $gte: Number(minAmount) };
    if (maxAmount)
      filter.amount = { ...filter.amount, $lte: Number(maxAmount) };
    const transactions = await Transaction.find({
      company: manager.company,
    });

    const [transaction, total] = await Promise.all([
      Transaction.find(filter)
        .select("-__v -updatedAt")
        .sort("-date")
        .skip((page - 1) * limit)
        .populate("partner", "name balance")
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
    console.error("Fetch transaction error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve transactions",
    });
  }
};

// Get Partner Transactions
export const getPartnerTransactions = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).select("company").lean();

    const partnerId = req.params.id;

    if (!manager?.company || !mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Invalid request",
      });
    }

    const transactions = await Transaction.find({
      company: manager.company,
      partner: partnerId,
    })
      .select("-__v, -updatedAt")
      .sort("-date")
      .populate("partner", "name phone")
      .lean();

    res.status(200).json({
      success: true,
      code: 200,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Partner transaction error:", error);
    return res.status(500).json({
      success: true,
      code: 500,
      message: "Failed to retrieve partner transaction",
    });
  }
};

// Get transaction by ID
export const getTransaction = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).populate("company");
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      company: manager.company,
    })
      .select("-__v -updatedAt")
      .populate("partner", "name phone balance");

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Transaction not found." });
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
      { new: true, session }
    );

    // Update balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        transaction.partner,
        { $inc: { balance: -amountDifference } },
        { session }
      ),
      Company.findByIdAndUpdate(
        manager.company,
        { $inc: { balance: -amountDifference } },
        { session }
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
      { new: true, session }
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
        { session }
      ),
      Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: { balance: transaction.amount },
        },
        { session }
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
      { new: true, session }
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
        { session }
      ),
      Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: { balance: -transaction.amount },
        },
        { session }
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
