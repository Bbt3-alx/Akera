import User from "../models/User.js";
import { DollarExchange, UsdCustomer } from "../models/DollarExchange.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import { isValidObjectId } from "mongoose";
import mongoose from "mongoose";

// Create a new customer usd
export const createUsdCustomer = async (req, res) => {
  const { name, phone, email } = req.body;

  if ((!name, !phone, !email)) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: "Missing required fields." });
  }
  try {
    const manager = await checkUserAuthorization(req);

    // Validate email
    if (!/^\S+@\S+\.\S+/.test(email)) {
      return res
        .status(422)
        .json({ success: false, code: 422, message: "Invalid email format." });
    }

    // Check if the customer already exist
    const existingCsutomer = await UsdCustomer.findOne({ email: email });
    if (existingCsutomer && existingCsutomer.includes(manager.company._id)) {
      return res.status(409).json({
        success: false,
        code: 409,
        message: "Customer already exist.",
      });
    }

    // create the neew usd customer
    const newUsdCustomer = new UsdCustomer({
      name,
      phone,
      email,
      companies: manager.company._id,
    });

    await newUsdCustomer.save();

    // Add the new customer to company usd customer list
    manager.company.usdCustomers.push(newUsdCustomer._id);
    await manager.company.save();

    res.status(201).json({
      success: true,
      code: 201,
      message: "USD customer successfully created.",
    });
  } catch (error) {
    console.log(error);
    return resddf
      .status(500)
      .json({ success: false, code: 500, message: "Something went wrong." });
  }
};

// Retrieves all the usd customers
export const getAllUsdCustomers = async (req, res) => {
  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomers = await UsdCustomer.find({
      company: manager.company._id,
    });

    if (usdCustomers.length === 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "You don't have any customer yet.",
      });
    }

    res.status(200).json({ success: true, code: 200, usdCustomers });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Get a specific customer by id
export const getUsdCustomer = async (req, res) => {
  const { usdCustomerId } = req.params;

  if (!isValidObjectId(usdCustomerId)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "Invalid USD customer ID format.",
    });
  }
  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findOne({
      _id: usdCustomerId,
    });

    if (!usdCustomer) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "USD customer not found.",
      });
    }

    if (!usdCustomer.companies.includes(manager.company._id)) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Access denied. unauthorized.",
      });
    }

    res.status(200).json({ success: true, code: 200, usdCustomer });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Update a usd customer
export const updateUsdCustomer = async (req, res) => {
  const { usdCustomerId } = req.params;
  const { name, phone, email } = req.body;

  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findById(usdCustomerId);
    if (!usdCustomer) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "USD customer not found.",
      });
    }

    if (!usdCustomer.companies.includes(manager.company._id)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Access denied. Unauthorized.",
      });
    }
    const updatedUsdCustomer = await UsdCustomer.findByIdAndUpdate(
      usdCustomerId,
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
      message: `USD customer ${updatedUsdCustomer._id} updated successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  }
};

// Soft delete a usd customer
export const softDeleteUsdCustomer = async (req, res) => {
  const { usdCustomerId } = req.params;

  if (!isValidObjectId(usdCustomerId)) {
    return res.status(422).json({
      success: false,
      code: 422,
      message: "Invalid customer ID format.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findOne({
      _id: usdCustomerId,
      deletedAt: null,
    }).session(session);

    if (!usdCustomer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Customer not found or already deleted.",
      });
    }

    console.log(usdCustomer.companies);
    if (!usdCustomer.companies.includes(manager.company._id)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Access denied. Unauthorized.",
      });
    }

    // Check for active transactions
    const activeTransaction = await DollarExchange.countDocuments({
      usdCustomer: usdCustomer._id,
      deletedAt: null,
    });

    if (activeTransaction > 0) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        code: 422,
        message: `Customer has ${activeTransaction} active transactions. Delete transactions first.`,
      });
    }

    // soft delete customer
    usdCustomer.deletedAt = new Date();
    usdCustomer.deletedBy = manager._id;
    await usdCustomer.save({ session });

    // Cascade soft delete related records (optional)
    await DollarExchange.updateMany(
      { usdCustomer: usdCustomer._id },
      {
        $set: { deletedAt: new Date(), deletedBy: manager._id },
        status: "canceled",
      },
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: "Customer and related transactions soft-deleted.",
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  } finally {
    await session.endSession();
  }
};

// Restore soft deleted usd customer
export const restoreUsdCustomer = async (req, res) => {
  const { usdCustomerId } = req.params;

  if (!isValidObjectId(usdCustomerId)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "Invalide USD customer ID.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const manager = await checkUserAuthorization(req);
    const usdCustomer = await UsdCustomer.findOne({
      _id: usdCustomerId,
      deletedAt: { $ne: null },
    }).session(session);

    if (!usdCustomer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Customer not found or already active.",
      });
    }

    if (!usdCustomer.companies.includes(manager.company._id)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Access denied. Unauthorized.",
      });
    }

    // Restore the customer
    usdCustomer.deletedAt = null;
    usdCustomer.restoredBy = null;
    await usdCustomer.save({ session });

    // Restore related transactions (optional)
    await DollarExchange.updateMany(
      { usdCustomer: usdCustomerId },
      {
        $set: {
          deletedAt: null,
          deletedBy: null,
          status: "pending",
        },
      },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      message: "Customer and transactions restored.",
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  } finally {
    await session.endSession();
  }
};
