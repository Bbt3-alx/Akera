import ShippingOperation from "../models/ShippingOperation.js";
import BuyOperation from "../models/BuyOperation.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Company from "../models/Company.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";
import { validateStatusTransition } from "../utils/validators.js";

const ERROR_MESSAGES = {
  OPERATION_NOT_FOUND: "Operation not found",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  OPERATION_NOT_QUALIFIED: "Operation not qualified for shipping",
  INVALID_TRANSPORT_FEE: "Transport fee must be a positive number",
};
// Create new shipping operation
export const createShippingOperation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { transport = 150 } = req.body;

    if (isNaN(transport) || transport <= 0) {
      throw new Error(ERROR_MESSAGES.INVALID_TRANSPORT_FEE);
    }

    await session.withTransaction(async () => {
      const [manager, buyOperation] = await Promise.all([
        User.findById(req.user.id).select("company").session(session),
        BuyOperation.findById(id).populate("partner").session(session),
      ]);

      // Authorization checks
      if (!manager?.company || !buyOperation) {
        throw new Error();
      }

      if (buyOperation.company.toString() !== manager.company.toString()) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      }

      if (buyOperation.status !== "pending") {
        throw new Error(ERROR_MESSAGES.OPERATION_NOT_QUALIFIED);
      }

      // Calculate shipping details
      const totalBars = buyOperation.golds.length;
      const totalWeight = buyOperation.golds.reduce(
        (sum, g) => sum + g.weight,
        0
      );
      const totalFees = buyOperation.golds.reduce(
        (sum, g) => sum + g.weight * transport,
        0
      );

      const goldData = buyOperation.golds.map((gold) => ({
        ...gold.toObject(),
        fees: gold.weight * transport,
        partner: buyOperation.partner._id,
      }));

      // Create shipment
      const newShipment = await ShippingOperation.create(
        [
          {
            golds: goldData,
            company: manager.company,
            buyOperation: id,
            totalBars,
            totalWeight,
            totalFees,
            status: "in progress",
          },
        ],
        { session }
      );

      // Update related records
      await Promise.all([
        BuyOperation.findByIdAndUpdate(id, { status: "shipped" }, { session }),
        Company.findByIdAndUpdate(
          manager.company,
          {
            $inc: {
              totalWeightExpedited: totalWeight,
              remainWeight: totalWeight,
              balance: -totalFees,
            },
          },
          { session }
        ),
      ]);

      res.status(201).json({
        success: true,
        code: 201,
        data: newShipment[0],
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Create shipment error:", error);

    let statusCode;

    if (error.message.includes("not found")) {
      statusCode = 404; // Not Found
    } else if (error.message.includes("Unauthorized")) {
      statusCode = 403; // Forbidden
    } else if (error.message.includes("qualified for shipping")) {
      statusCode = 409; // Conflict
    } else {
      statusCode = 400; // Bad Request
    }

    return res
      .status(statusCode)
      .json({ success: false, code: statusCode, message: error.message });
  }
};

// Get Shipment History
export const getShipmentHistory = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).select("company").lean();

    const { page = 1, limit = 10, status } = req.query;
    const filter = { company: manager?.company };

    if (status) filter.status = status;

    const [shipments, total] = await Promise.all([
      ShippingOperation.find(filter)
        .select("-__v -updatedAt")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("buyOperation", "amount currency")
        .lean(),
      ShippingOperation.countDocuments(filter),
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
      data: shipments,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve history",
    });
  }
};

// Get Single Shipment
export const getShipment = async (req, res) => {
  try {
    const shipment = await ShippingOperation.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .select("-__v -updatedAt")
      .populate("buyOperation", "partner amount currency")
      .lean();

    if (!shipment) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Shipment not found.",
      });
    }

    res.status(200).json({ success: true, code: 200, data: shipment });
  } catch (error) {
    console.error("Get shipment error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve shipment",
    });
  }
};

// Update a shipment
export const updateShippingOperation = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { status } = req.body;

    await session.withTransaction(async () => {
      const currentStatus = await ShippingOperation.findOne({
        _id: id,
        company: req.user.company,
      }).session(session);

      if (!currentStatus) {
        throw new Error("Shipment not found");
      }

      // Validate status
      if (!validateStatusTransition(currentStatus.status, status)) {
        throw new Error("Invalid status transition");
      }

      const [shipment, updatedShipment] = await Promise.all([
        ShippingOperation.findOne({
          _id: id,
          company: req.user.company,
        }).session(session),
        ShippingOperation.findOneAndUpdate(
          {
            _id: id,
            company: req.user.company,
          },
          {
            status,
          },
          { new: true }
        ),
      ]);

      if (!shipment || !updatedShipment) {
        throw new Error("Shipment not found");
      }

      res.status(200).json({
        success: true,
        message: `Shipment status changed to ${status}`,
        updatedShipment,
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Update shipment error:", error);
    let statusCode;
    if (error.message.includes("not found")) {
      statusCode = 404;
    } else if (error.message.includes("Invalid")) {
      statusCode = 400;
    } else {
      statusCode = 500;
    }
    return res
      .status(statusCode)
      .json({ success: false, code: statusCode, message: error.message });
  }
};

// Delete a shipment
export const deleteShippingOperation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shipment = await ShippingOperation.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
        deletedAt: null,
      },
      {
        status: "canceled",
        deletedAt: new Date(),
      }
    ).session(session);

    if (!shipment) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found." });
    }

    // Reset buy operation status
    const buyOperation = await BuyOperation.findByIdAndUpdate(
      shipment.buyOperation,
      {
        status: "on hold",
      },
      { session }
    );

    if (!buyOperation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Related buy operation not found",
      });
    }
    // Update company balance
    await Company.findByIdAndUpdate(
      shipment.company,
      {
        $inc: {
          totalWeightExpedited: -shipment.totalWeight,
          remainWeight: -shipment.totalWeight,
          balance: shipment.totalFees,
        },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      code: 200,
      message: `Shipment canceled successfully.`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete shipment error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete shipment",
    });
  } finally {
    session.endSession();
  }
};
