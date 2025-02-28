import mongoose from "mongoose";
import Company from "../models/Company.js";
import SellOperation from "../models/SellOperation.js";
import {
  convertWeightToTroyOunces,
  convertWeightToGrams,
} from "../utils/weightConversion.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";

// Create sell operation
export const createSellOperation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { weight, rate, unit } = req.body;

    // Validate input
    if (!weight || !rate || !unit) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Weight, rate and unit are required.",
      });
    }

    const manager = await checkUserAuthorization(req, session);
    let weightInTroyOunces = convertWeightToTroyOunces(weight, unit);
    const amount = parseFloat(weightInTroyOunces * rate).toFixed(2);

    // Validate company balance
    if (manager.company.remainWeight < weightInTroyOunces * 31.1035) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Not enough gold to sell.",
      });
    }

    // Create new sell operation
    const newSell = await SellOperation.create(
      [
        {
          rate,
          weight,
          amount,
          unit,
          company: manager.company._id,
        },
      ],
      { session }
    );

    // Update company balances
    await Company.findByIdAndUpdate(
      manager.company._id,
      {
        $inc: {
          usdBalance: amount,
          remainWeight: -(weightInTroyOunces * 31.1035),
        },
      },
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      code: 201,
      message: `${weight} ${unit} sold successfully.`,
      data: newSell[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create sell operation error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to create sell operation",
    });
  } finally {
    session.endSession();
  }
};

// Retrieves all the sell operations
export const getSellOperations = async (req, res) => {
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
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve sell operations" });
  }
};

export const getSellOperation = async (req, res) => {
  const { id } = req.params;

  try {
    const manager = await checkUserAuthorization(req);
    const operation = await SellOperation.findOne({
      _id: id,
      company: manager.company._id,
    })
      .select("-__v -updatedAt")
      .lean();

    if (!operation) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Sell operation not found.",
      });
    }

    res.status(200).json({ success: true, code: 200, data: operation });
  } catch (error) {
    console.error("Get sell operation error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve sell operation",
    });
  }
};

// Update a sell operations
export const updateSellOperation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { rate, weight, unit } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid sell operation ID.",
      });
    }

    const manager = await checkUserAuthorization(req, session);
    const operation = await SellOperation.findOne({
      _id: id,
      company: manager.company._id,
      deletedAt: null,
    }).session(session);

    if (!operation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Sell operation not found",
      });
    }

    const newWeight = weight || operation.weight;
    const newRate = rate || operation.rate;
    const newUnit = unit || operation.unit;

    // Convert weights to grams for consistent calculation
    const weightInGrams = convertWeightToGrams(newWeight, newUnit);
    const previousWeightInGrams = convertWeightToGrams(
      operation.weight,
      operation.unit
    );

    const weightDifference = weightInGrams - previousWeightInGrams;

    const weightInTroyOunces = convertWeightToTroyOunces(newWeight, newUnit);
    const amount = parseFloat(newRate) * weightInTroyOunces;
    const amountDifference = amount - operation.amount;

    // Validate company balance
    if (manager.company.remainWeight < weightDifference) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Insufficient remaining weight for this operation.",
      });
    }

    // Update the sell operation
    const updatedOperation = await SellOperation.findByIdAndUpdate(
      id,
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

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      message: `${weight} ${unit} sold successfully.`,
      data: updatedOperation,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update sell operation error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update sell operation " });
  } finally {
    session.endSession();
  }
};

// Delete a specific sell
export const deleteSellOperation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid sell operation ID",
      });
    }

    const manager = await checkUserAuthorization(req, session);
    const operation = await SellOperation.findOne({
      _id: id,
      company: manager.company._id,
      deletedAt: null,
    }).session(session);

    if (!operation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Sell operation not found",
      });
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

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      message: "Sell operation deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete sell operation error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete sell operation",
    });
  } finally {
    session.endSession();
  }
};
