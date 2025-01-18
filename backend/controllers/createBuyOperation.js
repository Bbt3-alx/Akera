import mongoose from "mongoose";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import BuyOperation from "../models/BuyOperation.js";
import getKarat from "../utils/getKarat.js";
import { isValidObjectId } from "mongoose";

// Create a new buy operation
export const createBuyOperation = async (req, res) => {
  const {
    gold, // An array of objects for managing multiples gold bare.
    partnerId,
    paymentStatus,
    amountPaid,
    currency,
  } = req.body;

  if (!gold || !gold.length || !partnerId || !currency) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing." });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, unauthorized" });
    }

    // Check if manager has company
    if (!manager.company) {
      return res.status(401).json({
        success: false,
        message: "You cannot make any operation, create a company first.",
      });
    }

    // Check if valid partner
    const partner = await Partner.findById(partnerId);
    if (!partner || !manager.company.partners.includes(partnerId)) {
      return res.status(404).json({
        success: false,
        message: "This operation cannot be initiated, partner not found.",
      });
    }

    // Calculating the total amount and validating densities
    let totalAmount = 0;
    const goldData = [];

    for (const op of gold) {
      const { base, weight, w_weight, situation } = op;

      if (!weight || !w_weight || !base) {
        return res.status(400).json({
          success: false,
          message: "Required fields missing for gold insertion.",
        });
      }

      // Calculate the gold density and get the corresponding Karat
      const density = (weight / w_weight).toFixed(2);
      const karat = getKarat(density);

      // Ensure karat is valid
      if (karat < 10) {
        return res.status(400).json({
          success: false,
          message: "Error: invalid karat, check your weight and water weight.",
        });
      }

      // Calculate the amount for this operation
      let amount;
      if (currency === "FCFA") {
        amount = (base / 24) * karat * weight;
      } else if (currency === "GNF" || currency === "USD") {
        amount = (base / 22) * karat * weight;
      }

      // Push data for this gold insertion
      goldData.push({
        base,
        weight,
        w_weight,
        density,
        karat,
        value: amount.toFixed(0),
        situation,
      });

      // Add to total amount
      totalAmount += parseFloat(amount.toFixed(0));
    }

    // Create new BuyOperation with all gold insertions
    const newBuyOperation = new BuyOperation({
      currency,
      golds: goldData,
      amount: totalAmount,
      amountPaid,
      paymentStatus,
      partner: partnerId,
      company: manager.company._id,
    });

    const savedOperation = await newBuyOperation.save();

    // Update partner and company balances
    partner.balance += totalAmount;
    partner.operations.push(savedOperation._id);
    await partner.save();

    manager.company.operations.push(savedOperation._id);
    await manager.company.save();

    res
      .status(201)
      .json({ success: true, BuyOperationDetails: savedOperation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieves all the buy operations
export const getAllOperations = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    if (!manager.company) {
      return res
        .status(200)
        .json({ success: true, message: "You don't have any company yet." });
    }

    const operations = await BuyOperation.find({
      company: manager.company._id,
    }).sort({ date: -1 });

    if (operations.lenght === 0) {
      return res
        .status(204)
        .json({ success: true, message: "There are no operations yet." });
    }

    res.status(200).json({ success: true, buyOperations: operations });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get a buy operation by it's id
export const getOperation = async (req, res) => {
  const { operationId } = req.params;
  if (!isValidObjectId(operationId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid operation ID format." });
  }
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    if (!manager.company) {
      return res
        .status(200)
        .json({ success: true, message: "You don't have any company yet." });
    }

    const operation = await BuyOperation.findOne({
      _id: operationId,
      company: manager.company._id,
    });
    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found." });
    }

    res.status(200).json({ success: true, operation: operation });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update an operation
export const updateOperation = async (req, res) => {
  const { operationId } = req.params;
  const {
    golds, // An array of objects for managing multiples gold bare.
    partnerId,
    paymentStatus,
    amountPaid,
    status,
    currency,
    situation,
  } = req.body;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const operation = await BuyOperation.findOne({
      _id: operationId,
      company: manager.company._id,
      partner: partnerId,
    });

    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found." });
    }

    let totalAmount = 0;
    let goldData = [];

    if (golds) {
      for (const gold of golds) {
        const { weight, w_weight, base, situation } = gold;

        const density = weight / w_weight;
        const karat = getKarat(density);

        if (karat < 10) {
          return res.status(400).json({
            sucess: false,
            message: "Got an invalid karat, check your water or water weight.",
          });
        }

        // Formulas to get gold value
        const forFcfa = (base / 24) * karat * weight;
        const forUsdAndGnf = (base / 22) * karat * weight;

        const amount =
          currency === "FCFA"
            ? forFcfa
            : currency === undefined || currency === null
            ? operation.currency === "FCFA"
              ? forFcfa
              : forUsdAndGnf
            : forUsdAndGnf;

        totalAmount += parseFloat(amount.toFixed(0));

        goldData.push({
          weight,
          w_weight,
          base,
          value: amount.toFixed(0),
          situation,
        });
      }
    }

    // Check if the partner has been change
    if (partnerId) {
      const partner = await Partner.findById(partnerId);
      if (!partner || !manager.company.partners.includes(partner._id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid partner." });
      }
    }
    const updatedOperation = await BuyOperation.findByIdAndUpdate(
      operationId,
      {
        golds: goldData,
        amount: totalAmount,
        status,
        paymentStatus,
        amountPaid,
        partner: partnerId,
        situation,
      },
      { new: true }
    );

    // Calculate the difference between the updated amount and the previous one.
    const difference = updatedOperation.amount - operation.amount;

    console.log(difference);
    // Update partner balance accordinlly
    const partner = await Partner.findById(partnerId);
    partner.balance += difference;
    await partner.save();

    res.status(200).json({
      success: true,
      message: `Operation with ID: ${operationId} updated successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete an operation
export const deleteBuyOperation = async (req, res) => {
  const { operationId } = req.params;

  if (!operationId) {
    return res
      .status(400)
      .json({ success: false, message: "Operation ID is required." });
  }

  if (!isValidObjectId(operationId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid operation ID." });
  }

  // Start a mongoose transaction session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const manager = await User.findById(req.user.id)
      .populate("company")
      .session(session);
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ success: false, message: "Operation failed, unauthorized." });
    }

    // Get operation before delation
    const operation = await BuyOperation.findById(operationId)
      .populate("partner")
      .session(session);
    if (!operation) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Operation not found." });
    }

    if (operation.company.toString() !== manager.company._id.toString()) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ success: false, message: "access denied. Unauthorized" });
    }

    const partner = await Partner.findById(operation.partner._id).session(
      session
    );
    if (!partner) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Partner not found." });
    }

    // Update partner balance
    partner.balance -= operation.amount;
    partner.operations = partner.operations.filter(
      (op) => op.toString() !== operationId
    );
    await partner.save({ session });

    const deletedOperation = await BuyOperation.findByIdAndDelete(
      operationId
    ).session(session);
    if (!deletedOperation) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Failed to delete operation" });
    }

    // Update company operations
    manager.company.operations = manager.company.operations.filter(
      (op) => op.toString() !== operationId
    );

    await manager.company.save({ session });

    // Validate the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Operation with ID ${operation._id} deleted successfully.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
