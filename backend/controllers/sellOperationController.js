import mongoose from "mongoose";
import Decimal from "decimal.js";
import Company from "../models/Company.js";
import SellOperation from "../models/SellOperation.js";
import {
  convertWeightToTroyOunces,
  convertWeightToGrams,
  validateWeightInput,
} from "../utils/weightConversion.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import {
  validateCreateSellOperationInput,
  validateUpdateSellOperationInput,
} from "../validations/sellOperationValidation.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";
import { preciseFinancialCalc } from "../utils/calculationUtils.js";
import { validateIdParam } from "../utils/validators.js";

// Create sell operation
export const createSellOperation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { weight, rate, unit } = validateCreateSellOperationInput(req.body);

      const manager = await checkUserAuthorization(req, session);
      const company = manager.company;

      const weightValue = Number(weight);
      if (isNaN(weightValue)) {
        throw new ApiError(400, `invalid weight format: ${weight}`);
      }

      const sanitizedUnit = unit.toLowerCase();

      validateWeightInput(weightValue, sanitizedUnit);

      // Convert weights to grams for consistent calculation
      const weightInGrams = convertWeightToGrams(weightValue, sanitizedUnit);
      const weightInTroyOz = convertWeightToTroyOunces(
        weightValue,
        sanitizedUnit
      );

      // Validate company balance
      if (new Decimal(company.remainWeight).lessThan(weightInGrams)) {
        throw new ApiError(
          422,
          "Insufficient remaining weight for this operation."
        );
      }

      if (typeof weightInTroyOz !== "number" || Number.isNaN(weightInTroyOz)) {
        throw new ApiError(400, `Invalid weight conversion resuly: ${weight}`);
      }

      if (typeof rate !== "number" || Number.isNaN(rate)) {
        throw new ApiError(400, `Invalid rate value: ${rate}`);
      }

      // Calculate amount
      const amount = preciseFinancialCalc(weightInTroyOz, rate);

      // Create sell operation
      const newSell = await SellOperation.create(
        [
          {
            rate,
            weight,
            amount,
            unit,
            company: company._id,
            createdBy: manager._id,
          },
        ],
        { session }
      );

      // Update company balances
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: {
            usdBalance: amount,
            remainWeight: -weightInGrams,
          },
        },
        { session }
      );

      return res.status(201).json({
        success: true,
        code: 201,
        message: `Successfully sold ${weight}${unit}`,
        data: newSell[0],
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Create sell operation error:", error);
    if (error instanceof ApiError) {
      error = new ApiError(error.statusCode, error.message);
    } else {
      error = new ApiError(500, "Failed to create sell operation");
    }
    next(error);
  }
};

// Retrieves all the sell operations
export const getSellOperations = async (req, res, next) => {
  try {
    const manager = await checkUserAuthorization(req);
    const { page = 1, limit = 10 } = req.query;

    const [sells, total] = await Promise.all([
      SellOperation.find({ company: manager.company._id })
        .select("-__v -updatedAt")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      SellOperation.countDocuments({ company: manager.company._id }),
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
      data: sells,
    });
  } catch (error) {
    console.error("Get sell operations error:", error);
    if (error instanceof ApiError) {
      error = new ApiError(error.statusCode, error.message);
    } else {
      error = new ApiError(500, "Failed to retrieve sell operations");
    }
    next(error);
  }
};

export const getSellOperation = async (req, res, next) => {
  const { id } = req.params;

  try {
    validateIdParam(req);
    const manager = await checkUserAuthorization(req);
    const operation = await SellOperation.findOne({
      _id: id,
      company: manager.company._id,
    })
      .select("-__v -updatedAt")
      .lean();

    if (!operation) {
      throw new ApiError(404, "Sell operation not found");
    }

    res.status(200).json({ success: true, code: 200, data: operation });
  } catch (error) {
    console.error("Get sell operation error:", error);
    if (error instanceof ApiError) {
      error = new ApiError(error.statusCode, error.message);
    } else {
      error = new ApiError(500, "Failed to retrieve sell operation");
    }
    next(error);
  }
};

// Update a sell operations
export const updateSellOperation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { rate, weight, unit } = validateUpdateSellOperationInput(req.body);
    validateIdParam(req);

    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const operation = await SellOperation.findOne({
        _id: id,
        company: manager.company._id,
        deletedAt: null,
      }).session(session);

      if (!operation) {
        throw new ApiError(404, "Sell operation not found");
      }

      const weightValue = weight !== undefined ? Number(weight) : undefined;
      console.log(weightValue);
      if (weightValue && isNaN(weightValue)) {
        throw new ApiError(400, `invalid weight format: ${weight}`);
      }
      const sanitizedUnit = unit !== undefined ? unit.toLowerCase() : undefined;

      validateWeightInput(weightValue, sanitizedUnit);

      const newWeight = weightValue || operation.weight;
      const newRate = rate || operation.rate;
      const newUnit = sanitizedUnit || operation.unit;

      // Convert weights to grams for consistent calculation
      const weightInGrams = convertWeightToGrams(newWeight, newUnit);
      const previousWeightInGrams = convertWeightToGrams(
        operation.weight,
        operation.unit
      );

      const weightDifference = weightInGrams - previousWeightInGrams;

      const weightInTroyOunces = convertWeightToTroyOunces(newWeight, newUnit);
      const amount = preciseFinancialCalc(weightInTroyOunces, newRate);

      const amountDifference = amount - operation.amount;

      // Validate company balance
      if (manager.company.remainWeight < weightDifference) {
        throw new ApiError(
          422,
          "Insufficient remaining weight for this operation."
        );
      }

      // Update the sell operation
      const updatedOperation = await SellOperation.findOneAndUpdate(
        { _id: id, company: manager.company._id, deletedAt: null },
        {
          weight: newWeight,
          rate: newRate,
          unit: newUnit,
          amount,
        },
        { new: true, session }
      );

      // Update company balances
      await Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: {
            usdBalance: amountDifference,
            remainWeight: -weightDifference,
          },
        },
        { session }
      );

      res.status(200).json({
        success: true,
        code: 200,
        message: `Sold successfully ${weight}${unit}`,
        data: updatedOperation,
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Update sell operation error:", error);
    if (error instanceof ApiError) {
      error = new ApiError(error.statusCode, error.message);
    } else {
      error = new ApiError(500, "Failed to update sell operation");
    }
    next(error);
  }
};

// Delete a specific sell
export const deleteSellOperation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    validateIdParam(req);

    await session.withTransaction(async () => {
      const manager = await checkUserAuthorization(req, session);
      const operation = await SellOperation.findOne({
        _id: id,
        company: manager.company._id,
        deletedAt: null,
      }).session(session);

      if (!operation) {
        throw new ApiError(404, "Sell operation not found");
      }

      // Restore company balances
      const weightInGrams = convertWeightToGrams(
        operation.weight,
        operation.unit
      );
      await Company.findByIdAndUpdate(
        manager.company._id,
        {
          $inc: {
            usdBalance: -operation.amount,
            remainWeight: weightInGrams,
          },
        },
        { session }
      );

      // Soft delete the sell operation
      await SellOperation.findByIdAndUpdate(
        id,
        {
          deletedAt: new Date(),
          deletedBy: manager._id,
        },
        { session }
      );

      res.status(200).json({
        success: true,
        code: 200,
        message: "Sell operation deleted successfully",
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Delete sell operation error:", error);
    if (error instanceof ApiError) {
      error = new ApiError(error.statusCode, error.message);
    } else {
      error = new ApiError(500, "Failed to delete sell operation");
    }
    next(error);
  }
};
