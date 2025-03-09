import { DollarExchange, UsdCustomer } from "../models/DollarExchange.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import { isValidObjectId } from "mongoose";
import mongoose from "mongoose";
import { ApiError } from "../middlewares/errorHandler.js";
import { CustomerService } from "../services/customerService.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";
import {
  validateCustomerCreation,
  validateCustomerUpdate,
} from "../validations/usdCustomerValidation.js";
import Company from "../models/Company.js";
import { validateIdParam } from "../utils/validators.js";

// Create a new customer usd
export const createUsdCustomer = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const service = new CustomerService(session);
      const manager = await checkUserAuthorization(req);

      validateCustomerCreation(req.body);

      const existingCustomer = await UsdCustomer.findOne({
        email: req.body.email,
        companies: manager.company._id,
      });

      if (existingCustomer) throw new ApiError(409, "Customer already exists");

      const customer = await service.createCustomer(
        req.body,
        manager.company._id,
        manager._id
      );

      await Company.findByIdAndUpdate(
        manager.company._id,
        {
          $push: { usdCustomers: customer._id },
        },
        { session }
      );

      res.status(201).json({
        success: true,
        code: 201,
        message: "USD customer successfully created.",
        data: customer,
      });
    }, transactionOptions);
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

// Retrieves all the usd customers
export const getAllUsdCustomers = async (req, res, next) => {
  try {
    const manager = await checkUserAuthorization(req);

    const { page = 1, limit = 5 } = req.params;
    const filter = { companies: manager.company._id };

    const [usdCustomers, total] = await Promise.all([
      UsdCustomer.find({
        companies: manager.company._id,
        deletedAt: null,
        archivedAt: null,
      })
        .select("-__v -updatedAt")
        .sort("-createdAt")
        .skip(Number(page - 1) * limit)
        .lean(),
      UsdCustomer.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      data: usdCustomers,
      pagination: {
        page: Number(page),
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific customer by id
export const getUsdCustomer = async (req, res, next) => {
  validateIdParam(req);

  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findOne({
      _id: req.params.id,
      companies: manager.company._id,
      deletedAt: null,
      archivedAt: null,
    });

    if (!usdCustomer) {
      throw new ApiError(404, "USD customer not found");
    }

    res.status(200).json({ success: true, code: 200, data: usdCustomer });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      error = new ApiError(500, "Error fetching custmer");
      next(error);
    }
  }
};

// Update a usd customer
export const updateUsdCustomer = async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  try {
    validateIdParam(req);
    validateCustomerUpdate(req.body);

    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findOne({
      _id: id,
      companies: manager.company._id,
      deletedAt: null,
      archivedAt: null,
    });

    if (!usdCustomer) {
      throw new ApiError(404, "Customer not found");
    }

    const updatedUsdCustomer = await UsdCustomer.findByIdAndUpdate(
      id,
      {
        name,
        phone,
        email,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: `Customer updated successfully.`,
      data: updatedUsdCustomer,
    });
  } catch (error) {
    console.error("Customer update error:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      error = new ApiError(500, "Failed to update customer");
      next(error);
    }
  }
};

// Soft delete a usd customer
export const softDeleteUsdCustomer = async (req, res, next) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  try {
    validateIdParam(req);

    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const customer = await UsdCustomer.findOne({
        _id: id,
        deletedAt: null,
        companies: manager.company._id,
      }).session(session);

      if (!customer) {
        throw new ApiError(404, "Customer not found or already deleted", {
          customerId: req.params.id,
          companyId: manager.company._id,
        });
      }

      // soft delete customer
      customer.deletedAt = new Date();
      customer.deletedBy = manager._id;
      customer.archivedAt = null;
      customer.archivedBy = null;
      customer.status = "inactive";
      customer.version += 1;
      await customer.save({ session });

      // Cascade soft delete related records
      await DollarExchange.updateMany(
        { usdCustomer: customer._id, deletedAt: null },
        [
          {
            $set: {
              previousStatus: "$status",
              status: "archived",
              archivedAt: new Date(),
              archivedBy: manager._id,
              archivedReason: "Parent deleted",
              version: { $add: ["$version", 1] },
            },
          },
        ],
        { session }
      );

      res.status(200).json({
        success: true,
        code: 200,
        message: "Customer and related transactions deleted",
        data: customer.toJSON(),
      });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Deletion failed", {
            customerId: req.params.id,
            errorCode: "DELETE_FAILURE",
          });
    next(apiError);
  } finally {
    await session.endSession();
  }
};

// Restore soft deleted usd customer
export const restoreUsdCustomer = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    validateIdParam(req);
    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const customer = await UsdCustomer.findOne({
        _id: req.params.id,
        companies: manager.company._id,
        status: "inactive",
      }).session(session);

      if (!customer) {
        throw new ApiError(404, "Customer not found or already active", {
          customerId: req.params.id,
          companyId: manager.company._id,
        });
      }

      customer.deletedAt = null;
      customer.archivedat = null;
      customer.archivedBy = null;
      customer.deletedBy = null;
      customer.restoredBy = manager._d;
      customer.status = "active";
      customer.version += 1;
      await customer.save({ session });

      await DollarExchange.updateMany(
        { usdCustomer: customer._id, deletedAt: { $ne: null } },
        [
          {
            $set: {
              deletedAt: null,
              deletedBy: null,
              archivedAt: null,
              archivedBy: null,
              status: "$previousStatus",
              previousStatus: "$$REMOVE",
              version: { $add: ["$version", 1] },
            },
          },
        ],
        { session }
      );

      res.status(200).json({
        success: true,
        code: 200,
        message: "Customer and transactions restored.",
        data: customer.toJSON(),
      });
    }, transactionOptions);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Customer restoration error:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      error = new ApiError(500, "Failed to restore customer");
      next(error);
    }
  } finally {
    await session.endSession();
  }
};

// Get customer transaction history
export const getCustomerTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    const filter = {
      usdCustomer: req.params.id,
      ...(status && { status }),
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && {
        createdAt: { ...filter.createdAt, $lte: new Date(endDate) },
      }),
      ...(minAmount && { amount: { $gte: Number(minAmount) } }),
      ...(maxAmount && {
        amount: { ...filter.amount, $lte: Number(maxAmount) },
      }),
    };
    const [transactions, total] = await Promise.all([
      DollarExchange.find({ usdCustomer: req.params.id })
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      DollarExchange.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      data: transactions,
      pagination: {
        page: Number(page),
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        dateRange: { startDate, endDate },
        amountRange: { minAmount, maxAmount },
      },
    });
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to retrieve transactions", {
            customerId: req.params.id,
            error: error.message,
          });
    next(apiError);
  }
};
