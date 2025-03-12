import { UsdCustomer, DollarExchange } from "../models/DollarExchange.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import mongoose from "mongoose";
import Company from "../models/Company.js";
import { validateIdParam } from "../utils/validators.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";
import { ApiError } from "../middlewares/errorHandler.js";
import {
  validateUsdTransactionInput,
  validateUsdTransactionUpdateInput,
} from "../validations/usdTransactionValidation.js";
import IdempotencyKey from "../models/IdempotencyKey.js";

export const createSellUsd = async (req, res, next) => {
  const { rate, amountUSD, usdCustomerId, usdTaker } = req.body;

  validateIdParam(req);
  validateUsdTransactionInput(req.body);

  // Start a mongoose transaction for Atomic Updates
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const idempotencyRecord = await IdempotencyKey.findOne({
        key: req.idempotencyKey,
      }).session(session);

      if (idempotencyRecord?.status === "completed") {
        return res.status(200).json(idempotencyRecord.response);
      }

      const manager = await checkUserAuthorization(req, session);
      if (!manager?.company)
        throw new ApiError(403, "Access denied. Company Not Found", {
          errorCode: "COMPANY_NOT_FOUND",
        });

      const customer = await UsdCustomer.findOne({
        _id: usdCustomerId,
        companies: manager.company._id,
      }).session(session);

      if (!customer) {
        throw new ApiError(404, "Customer not found");
      }

      const amountCFA = parseFloat(rate) * parseFloat(amountUSD);

      // Check if the company has sufficient usd.
      const result = await Company.updateOne(
        {
          _id: manager.company._id,
          usdBalance: { $gte: amountUSD },
        },
        {
          $inc: { usdBalance: -amountUSD, balance: amountCFA },
        },
        { session }
      );
      if (result.modifiedCount === 0) {
        throw new ApiError(400, "Insufficient Funds", {
          companyId: req.user.company,
          errorCode: "INSUFFICIENT_FUNDS",
        });
      }

      const newSell = await DollarExchange.create(
        [
          {
            rate,
            amountUSD,
            usdCustomer: usdCustomerId,
            amountCFA,
            usdTaker,
            confirmedBy: manager._id,
            company: manager.company._id,
          },
        ],
        { session }
      );

      // Update customer balance
      customer.outstandingBalance += amountCFA;
      await customer.save({ session });

      await IdempotencyKey.updateOne(
        {
          key: req.idempotencyKey,
        },
        {
          status: "completed",
          response: {
            success: true,
            code: 201,
            data: newSell[0],
          },
        },
        { session }
      );

      res.status(201).json({ success: true, code: 201, data: newSell[0] });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Create usd transaction error:", error);
    await IdempotencyKey.updateOne(
      {
        key: req.idempotencyKey,
      },
      { status: "failed" }
    );

    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to create usd transaction", {
            companyId: req.user.company,
          });

    next(apiError);
  } finally {
    await session.endSession();
  }
};

// Retrieves all usd transaction
export const getAllUsdTransactions = async (req, res, next) => {
  try {
    const manager = await checkUserAuthorization(req);
    const { page = 1, limit = 30 } = req.params;
    const filter = { company: manager.company._id };

    const [transactions, total] = await Promise.all([
      DollarExchange.find(filter)
        .sort("-createdAt")
        .select("-__v -updatedAt")
        .skip(Number((page - 1) * limit))
        .limit(limit)
        .lean(),
      DollarExchange.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to retrieves tranasactions", {
            companyId: req.user.company,
          });
    next(apiError);
  }
};

// Retrieves all active usd transaction
export const getActiveUsdTransactions = async (req, res, next) => {
  try {
    const manager = await checkUserAuthorization(req);

    const { page = 1, limit = 30 } = req.params;
    const filter = {
      company: manager.company._id,
      deletedAt: null,
      archivedAt: null,
    };

    const [transactions, total] = await Promise.all([
      DollarExchange.find(filter)
        .sort({ createdAt: -1 })
        .select("-__v -updatedAt")
        .skip(Number((page - 1) * limit))
        .limit(Number(limit))
        .lean(),
      DollarExchange.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed fetching transactions", {
            company: req.user.company,
          });
    next(apiError);
  }
};

// Get a usd transaction by id
export const getUsdTransaction = async (req, res, next) => {
  const { id } = req.params;

  validateIdParam(req);
  try {
    const manager = await checkUserAuthorization(req);
    const usdTransaction = await DollarExchange.findOne({
      _id: id,
      company: manager.company._id,
      deletedAt: null,
      archivedAt: null,
    });

    if (!usdTransaction) {
      throw new ApiError(404, "Operation not found");
    }

    res.status(200).json({ success: true, code: 200, data: usdTransaction });
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to retrieves operation", {
            operationId: req.params.id,
            companyId: req.user.company,
          });
    next(apiError);
  }
};

// Update a transaction
export const updateSellUsd = async (req, res, next) => {
  const { id } = req.params;
  const { rate, amountUSD, newUsdCustomer, usdTaker } = req.body;

  validateIdParam(req);
  validateUsdTransactionUpdateInput(req.body);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const originalTransaction = await DollarExchange.findOne({
        _id: req.params.id,
        company: manager.company._id,
        deletedAt: null,
        archivedAt: null,
      })
        .populate("usdCustomer")
        .session(session);

      if (!originalTransaction) {
        throw new ApiError(404, "Operation not found", {
          usdCustomerId: id,
          companyId: req.user.company,
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
      const finalUsdCustomer =
        newUsdCustomer !== undefined
          ? newUsdCustomer
          : originalTransaction.usdCustomer;

      if (newUsdCustomer) {
        const validCustomer = await UsdCustomer.exists({
          _id: newUsdCustomer,
          companies: manager.company._id,
        }).session(session);

        if (!validCustomer) throw new ApiError(404, "invalid customer");
      }

      // Check balance after reverting original transaction
      const availableBalance =
        manager.company.usdBalance + originalTransaction.amountUSD;
      if (availableBalance < newAmountUSD) {
        throw new ApiError(
          422,
          "Insufficient USD balance to update transaction"
        );
      }

      // Calculate differences
      const amountDifferenceUsd = newAmountUSD - originalTransaction.amountUSD;
      const amountCFA = newRate * newAmountUSD;
      const amountDifferenceCfa = amountCFA - originalTransaction.amountCFA;
      const remainingAmount =
        amountDifferenceCfa + originalTransaction.remainingAmount;

      // Update transaction
      const updatedTransaction = await DollarExchange.findByIdAndUpdate(
        id,
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
        {
          $inc: {
            usdBalance: -amountDifferenceUsd,
            balance: amountDifferenceCfa,
          },
        },
        { session }
      );

      // Handle customer changes
      if (
        finalUsdCustomer.toString() !==
        originalTransaction.usdCustomer._id.toString()
      ) {
        // Update new customer
        await UsdCustomer.findOneAndUpdate(
          { _id: finalUsdCustomer, companies: manager.company._id },
          { $inc: { outstandingBalance: amountCFA } },
          { session }
        );

        // Revert original customer
        await UsdCustomer.findOneAndUpdate(
          {
            _id: originalTransaction.usdCustomer._id,
            companies: manager.company._id,
          },
          { $inc: { outstandingBalance: -originalTransaction.amountCFA } },
          { session }
        );
      } else {
        // Update existing customer
        await UsdCustomer.findOneAndUpdate(
          {
            _id: originalTransaction.usdCustomer._id,
            companies: manager.company._id,
          },
          { $inc: { outstandingBalance: amountDifferenceCfa } },
          { session }
        );
      }

      res.status(200).json({
        success: true,
        code: 200,
        message: `Transaction updated successfully`,
        data: updatedTransaction,
      });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Update sell usd error:", error);

    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to update usd sell");
    next(apiError);
  } finally {
    await session.endSession();
  }
};

// Soft delete a usd transaction
export const softDeleteSellUsd = async (req, res, next) => {
  const { id } = req.params;

  validateIdParam(req);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const transaction = await DollarExchange.findOne({
        _id: id,
        company: manager.company._id,
        deletedAt: null,
      }).session(session);

      if (!transaction) {
        throw new ApiError(404, "Transaction not found");
      }

      // Soft delete the selected transaction
      transaction.deletedAt = new Date();
      transaction.deletedBy = manager._id;
      transaction.status = "canceled";
      transaction.previousStatus = transaction.status;
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
          $inc: { outstandingBalance: -transaction.amountCFA }, // Deduct from customer’s outstandingBalance
        },
        { new: true, session }
      );

      if (!updatedCompany || !updatedCustomer) {
        throw new ApiError(400, "Balance update failed");
      }

      res.status(200).json({
        success: true,
        code: 200,
        message: `USD Transaction deleted successfully`,
        data: transaction,
      });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to delete usd sell", {
            usdSellOperationId: req.params.id,
            company: req.user.company,
          });
    next(apiError);
  } finally {
    await session.endSession();
  }
};

// Restore a soft-deleted transaction
export const restoreSellUsd = async (req, res, next) => {
  const { id } = req.params;

  validateIdParam(req);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const transaction = await DollarExchange.findOne({
        _id: id,
        company: manager.company._id,
        deletedAt: { $ne: null },
      }).session(session);

      if (!transaction) {
        throw new ApiError(404, "Transaction not found");
      }

      // prevent negative balance
      if (manager.company.usdBalance < transaction.amountUSD) {
        throw new ApiError(
          422,
          "Insufficient USD balance to restore this transaction"
        );
      }

      // Restore the transaction
      transaction.deletedAt = null;
      transaction.restoredBy = manager._id;
      transaction.status = transaction.previousStatus;
      await transaction.save({ session });

      // Adjust company and customer balances
      const updatedCompany = await Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: { usdBalance: -transaction.amountUSD }, // Deduct USD
        },
        { session }
      );

      const updatedCustomer = await UsdCustomer.findByIdAndUpdate(
        transaction.usdCustomer,
        {
          $inc: { outstandingBalance: transaction.amountCFA }, // Add to customer’s outstandingBalance
        },
        { new: true, session }
      );

      if (!updatedCustomer || !updatedCompany) {
        throw new ApiError(400, "Balance update failed.");
      }

      await session.commitTransaction();
      res.status(200).json({
        success: true,
        code: 200,
        message: `Transaction restored`,
        data: transaction,
      });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to restore usd transactiion");
    next(apiError);
  } finally {
    await session.endSession();
  }
};
