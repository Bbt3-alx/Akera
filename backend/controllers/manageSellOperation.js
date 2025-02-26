import SellOperation from "../models/SellOperation.js";
import {
  convertWeightToTroyOunces,
  convertWeightToGrams,
} from "../utils/weightConversion.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";

// Create sell operation
export const createSellOperation = async (req, res) => {
  const { weight, rate, unit } = req.body;

  try {
    let weightInTroyOunces = convertWeightToTroyOunces(weight, unit);

    let manager;
    try {
      manager = await checkUserAuthorization(req);
    } catch (error) {
      return res.status(403).json({ success: false, message: error.message });
    }

    const amount = parseFloat(
      (weightInTroyOunces * parseFloat(rate)).toFixed(2)
    );
    const newSell = new SellOperation({
      rate,
      weight,
      amount,
      unit,
      company: manager.company._id,
    });

    const savedSell = await newSell.save();

    // Update company balances
    manager.company.usdBalance += amount;
    manager.company.remainWeight -= weightInTroyOunces * 31.1035; // Convert back to grams
    await manager.company.save();

    res.status(201).json({
      success: true,
      message: `${weight} ${unit} sold successfully.`,
      savedSell,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};

// Retrieves all the sell operations
export const getSellOperations = async (req, res) => {
  try {
    const manager = await checkUserAuthorization(req);

    const sales = await SellOperation.find({ company: manager.company });

    if (sales.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "There are no sell operations yet." });
    }

    res.status(200).json({ success: true, sales });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};

export const getSellOperation = async (req, res) => {
  const { operationId } = req.params;

  try {
    const manager = checkUserAuthorization(req);
    const operation = await SellOperation.findOne({
      _id: operationId,
      company: (await manager).company._id,
    });

    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Sell not found." });
    }

    res.status(200).json({ success: true, sellOperation: operation });
  } catch (error) {
    console.log(error);
    return status(500).json({
      success: false,
      message: "Samething went wrong.",
    });
  }
};
// Update a sell operations
export const updateSellOperation = async (req, res) => {
  const { operationId } = req.params;
  const { rate, weight, unit } = req.body;

  try {
    const manager = await checkUserAuthorization(req);
    const operation = await SellOperation.findById(operationId);

    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Sell operation not found." });
    }

    const newWeight = weight !== undefined ? weight : operation.weight;
    const newRate = rate !== undefined ? rate : operation.rate;
    const newUnit = unit !== undefined ? unit : operation.unit;

    // Convert weights to grams for consistent calculation
    const weightInGrams = convertWeightToGrams(parseFloat(newWeight), newUnit);
    const previousWeightInGrams = convertWeightToGrams(
      operation.weight,
      operation.unit
    );

    // Calculate weight and amount
    const weightDifference = weightInGrams - previousWeightInGrams;
    const weightInTroyOunces = convertWeightToTroyOunces(
      parseFloat(newWeight),
      newUnit
    );
    const amount = parseFloat(newRate) * weightInTroyOunces;
    const amountDifference = amount - operation.amount;

    const updatedSell = await SellOperation.findByIdAndUpdate(
      operationId,
      {
        weight: newWeight,
        rate: newRate,
        unit: newUnit,
        amount,
        company: manager.company._id,
      },
      { new: true }
    );

    // Update the company usd balance and remain weight to be sold.
    manager.company.usdBalance += amountDifference;
    manager.company.remainWeight -= weightDifference;
    manager.company.save();

    res.status(200).json({
      success: true,
      message: `${weight} ${unit} sold successfully.`,
      updatedSell,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};

// Delete a specific sell
export const deleteSellOperation = async (req, res) => {
  const { operationId } = req.params;

  try {
    const manager = await checkUserAuthorization(req);
    const operation = await SellOperation.findOne({
      _id: operationId,
      company: manager.company._id,
    });
    if (!operation) {
      return res
        .status(400)
        .json({ success: false, message: "Sell operation not found." });
    }

    await SellOperation.findByIdAndDelete(operationId);

    // Update company balances
    manager.company.usdBalance -= operation.amount;
    manager.company.remainWeight += convertWeightToGrams(
      operation.weight,
      operation.unit
    ); // Ensure we convert back to grams

    await manager.company.save();

    res.status(200).json({
      success: true,
      message: `Sell with ID ${operationId} deleted successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};
