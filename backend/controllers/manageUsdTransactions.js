import { UsdCustomer, DollarExchange } from "../models/DollarExchange.js";
import { isValidObjectId } from "mongoose";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import mongoose from "mongoose";
import Company from "../models/Company.js";

// Sell USD
export const createSellUsd = async (req, res) => {
  const { rate, amountUSD, usdCustomerId, usdTaker } = req.body;

  if (!rate || !amountUSD || !usdCustomerId) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: "All fields are required." });
  }
  if (!isValidObjectId(usdCustomerId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid usdCustomer ID format.",
    });
  }

  // Start a mongoose transaction for Atomic Updates
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const manager = await checkUserAuthorization(req);
    const customer = await UsdCustomer.findById(usdCustomerId);

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Customer not found." });
    }
    if (isNaN(rate) || isNaN(amountUSD) || rate <= 0 || amountUSD <= 0) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "All rate and amount must be a number.",
      });
    }

    // Check if the company has sufficient usd.
    if (manager.company.usdBalance < amountUSD) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient usd balance.",
      });
    }

    const amountCFA = parseFloat(rate) * parseFloat(amountUSD);
    const newSell = new DollarExchange({
      rate,
      amountUSD,
      usdCustomer: usdCustomerId,
      amountCFA,
      usdTaker,
      confirmedBy: manager._id,
      company: manager.company._id,
    });

    await newSell.save({ session });

    // Update company usd balance
    const updatedCompany = await Company.findByIdAndUpdate(
      manager.company._id,
      {
        $inc: { usdBalance: -amountUSD },
      },
      { new: true, session }
    );

    if (!updatedCompany) throw new Error("Company update failed.");

    // Update customer balance
    const updatedCustomer = await UsdCustomer.findByIdAndUpdate(
      usdCustomerId,
      { $inc: { toPaid: amountCFA } },
      { new: true, session }
    );
    if (!updatedCustomer) throw new Error("Customer update failed.");

    await session.commitTransaction();

    res.status(201).json({ success: true, code: 201, newSell });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Internal server error.",
    });
  } finally {
    await session.endSession();
  }
};

// Retrieves all usd transaction
export const getAllUsdTransactions = async (req, res) => {
  try {
    const manager = await checkUserAuthorization(req);
    const usdTransactions = await DollarExchange.find({
      company: manager.company._id,
    }).sort({ createdAt: -1 });

    if (usdTransactions.lenght === 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "There are no usd transaction yet.",
      });
    }

    res.status(200).json({ success: true, code: 200, usdTransactions });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Retrieves all active usd transaction
export const activeTransactions = async (req, res) => {
  try {
    const manager = await checkUserAuthorization(req);
    const usdTransactions = await DollarExchange.find({
      company: manager.company._id,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    if (usdTransactions.lenght === 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "There are no usd transaction yet.",
      });
    }

    res.status(200).json({ success: true, code: 200, usdTransactions });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Get a usd transaction by id
export const getUsdTransaction = async (req, res) => {
  const { usdTransactionId } = req.params;

  if (!isValidObjectId(usdTransactionId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid transaction ID format.",
    });
  }
  try {
    const manager = await checkUserAuthorization(req);
    const usdTransaction = await DollarExchange.findOne({
      _id: usdTransactionId,
      company: manager.company._id,
    });

    if (!usdTransaction) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "USD Transaction not found.",
      });
    }

    res.status(200).json({ success: true, code: 200, usdTransaction });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Update a transaction
export const updateSellUsd = async (req, res) => {
  const { usdTransactionId } = req.params;
  const { rate, amountUSD, usdCustomer: newUsdCustomer, usdTaker } = req.body;

  if (!isValidObjectId(usdTransactionId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid USD transaction ID format.",
    });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const manager = await checkUserAuthorization(req);
    const originalTransaction = await DollarExchange.findById(usdTransactionId)
      .populate("usdCustomer")
      .session(session);
    if (!originalTransaction) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "USD sell record not found.",
      });
    }

    // Check if originalTransaction is not canceled
    if (originalTransaction.deletedAt) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "You can not update a deleted transaction.",
      });
    }

    // Validate new customer ID (if provided)
    if (newUsdCustomer && !isValidObjectId(newUsdCustomer)) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Invalid customer ID format.",
      });
    }

    // Determine new values
    const newUSDTaker =
      usdTaker !== undefined ? usdTaker : originalTransaction.usdTaker;
    const newRate =
      rate !== undefined ? parseFloat(rate) : originalTransaction.rate;
    const newAmountUSD =
      amountUSD !== undefined
        ? parseFloat(amountUSD)
        : originalTransaction.amountUSD;
    const finalUsdCustomer = newUsdCustomer || originalTransaction.usdCustomer;

    // Validate numeric inputs
    if (
      isNaN(newRate) ||
      isNaN(newAmountUSD) ||
      newRate <= 0 ||
      newAmountUSD <= 0
    ) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Rate and amount must be positive numbers.",
      });
    }

    // Check balance after reverting original transaction
    const availableBalance =
      manager.company.usdBalance + originalTransaction.amountUSD;
    if (availableBalance < newAmountUSD) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient USD balance to update transaction.",
      });
    }

    // Calculate differences
    const amountDifferenceUsd = newAmountUSD - originalTransaction.amountUSD;
    const amountCFA = newRate * newAmountUSD;
    const amountDifferenceCfa = amountCFA - originalTransaction.amountCFA;
    const remainingAmount =
      amountDifferenceCfa + originalTransaction.remainingAmount;

    // Update transaction
    const updatedTransaction = await DollarExchange.findByIdAndUpdate(
      usdTransactionId,
      {
        rate: newRate,
        amountUSD: newAmountUSD,
        usdCustomer: finalUsdCustomer,
        amountCFA,
        usdTaker: newUSDTaker,
        remainingAmount,
        updatedBy: manager._id,
      },
      { new: true, session }
    );

    // Adjust company balance atomically
    await Company.findByIdAndUpdate(
      manager.company._id,
      { $inc: { usdBalance: -amountDifferenceUsd } },
      { session }
    );

    // Handle customer changes
    if (
      finalUsdCustomer.toString() !==
      originalTransaction.usdCustomer._id.toString()
    ) {
      // Revert original customer
      await UsdCustomer.findByIdAndUpdate(
        originalTransaction.usdCustomer._id,
        { $inc: { toPaid: -originalTransaction.amountCFA } },
        { session }
      );

      // Update new customer
      await UsdCustomer.findByIdAndUpdate(
        finalUsdCustomer,
        { $inc: { toPaid: amountCFA } },
        { session }
      );
    } else {
      // Update existing customer
      await UsdCustomer.findByIdAndUpdate(
        originalTransaction.usdCustomer._id,
        { $inc: { toPaid: amountDifferenceCfa } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: `Transaction ${updatedTransaction._id} updated.`,
      transaction: updatedTransaction,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log("Update error:", error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  } finally {
    await session.endSession();
  }
};

// Soft delete a usd transaction
export const softDeleteSellUsd = async (req, res) => {
  const { usdTransactionId } = req.params;

  if (!isValidObjectId(usdTransactionId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid USD transaction ID format.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const manager = await checkUserAuthorization(req);
    const transaction = await DollarExchange.findOne({
      _id: usdTransactionId,
      company: manager.company._id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Transaction not found." });
    }
    if (transaction.deletedAt) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Transaction already deleted.",
      });
    }

    // Soft delete the selected transaction
    transaction.deletedAt = new Date();
    transaction.deletedBy = manager._id;
    transaction.status = "canceled";
    await transaction.save({ session });

    // Reverse original transaction effects
    const updatedCompany = await Company.findByIdAndUpdate(
      manager.company._id,
      {
        $inc: { usdBalance: transaction.amountUSD }, // Return USD to company
      },
      { new: true, session }
    );

    const updatedCustomer = await UsdCustomer.findByIdAndUpdate(
      transaction.usdCustomer,
      {
        $inc: { toPaid: -transaction.amountCFA }, // Deduct from customer’s toPaid
      },
      { new: true, session }
    );

    if (!updatedCompany || !updatedCustomer) {
      throw new Error("Balance update failed");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      message: `USD Transaction with ID ${transaction._id} soft deleted successfully.`,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  } finally {
    session.endSession();
  }
};

// Restore a soft-deleted transaction
export const restoreSellUsd = async (req, res) => {
  const { usdTransactionId } = req.params;

  if (!isValidObjectId(usdTransactionId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid usd trasaction ID format.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const manager = await checkUserAuthorization(req);
    const transaction = await DollarExchange.findOne({
      _id: usdTransactionId,
      company: manager.company._id,
    }).session(session);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "USD Transaction not found.",
      });
    }

    // Check if the transaction was already deleted
    if (!transaction.deletedAt) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Transaction is not deleted.",
      });
    }

    // prevent negative balance
    if (manager.company.usdBalance < transaction.amountUSD) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient USD balance to restore this transaction.",
      });
    }

    // Restore the transaction
    transaction.deletedAt = null;
    transaction.restoredBy = manager._id;
    transaction.status = "pending";
    await transaction.save({ session });

    // Adjust company and customer balances
    const updatedCompany = await Company.findByIdAndUpdate(
      manager.company._id,
      {
        $inc: { usdBalance: -transaction.amountUSD }, // Deduct USD
      },
      { new: true, session }
    );

    const updatedCustomer = await UsdCustomer.findByIdAndUpdate(
      transaction.usdCustomer,
      {
        $inc: { toPaid: transaction.amountCFA }, // Add to customer’s toPaid
      },
      { new: true, session }
    );

    if (!updatedCustomer || !updatedCompany) {
      throw new Error("Balance update failed.");
    }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: `Transaction ${transaction._id} restored.`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 422, message: "Internal server error." });
  } finally {
    await session.endSession();
  }
};
