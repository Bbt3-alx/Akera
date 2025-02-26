import mongoose from "mongoose";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import BuyOperation from "../models/BuyOperation.js";
import getCarat from "../utils/getCarat.js";
import { isValidObjectId } from "mongoose";
import Company from "../models/Company.js";
import { triggerWebhook } from "../services/webhooks.js";
import { transactionOptions } from "../constants/mongoTransactionOptions.js";

// Utility function
function calculateGoldValue(base, carat, weight, currency) {
  const conversionRates = {
    XOF: 24,
    GNF: 22,
    USD: 22,
  };

  return (base / conversionRates[currency]) * carat * weight;
}

// Create a new buy operation
export const createBuyOperation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      gold, // An array of objects for managing multiples gold bare.
      partnerId,
      paymentStatus = "pending",
      amountPaid = 0,
      currency,
    } = req.body;

    const manager = await User.findById(req.user.id)
      .select("company")
      .session(session);

    if (!manager?.company) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Company association required",
      });
    }

    // Validate partner relationship
    const [partner, company] = await Promise.all([
      Partner.findOne({
        _id: partnerId,
        companies: manager.company,
      }).session(session),
      Company.findById(manager.company).session(session),
    ]);

    if (!partner) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Partner not found in your company",
      });
    }

    // Process gold items
    const processedGold = await Promise.all(
      gold.map(async (item) => {
        const density = item.weight / item.w_weight;
        const carat = getCarat(density);

        if (!carat) {
          throw new Error(
            `Invalid carat calculation for item with weight ${item.weight}`
          );
        }

        const value = calculateGoldValue(
          item.base,
          carat,
          item.weight,
          currency
        );

        return {
          ...item,
          density: Number(density.toFixed(2)),
          carat,
          value: Number(value.toFixed(2)),
        };
      })
    );

    const totalAmount = processedGold.reduce(
      (sum, item) => sum + item.value,
      0
    );

    // for (const op of gold) {
    //   const { base, weight, w_weight, situation } = op;

    //   if (!weight || !w_weight || !base) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Required fields missing for gold insertion.",
    //     });
    //   }

    //   // Calculate the gold density and get the corresponding carat
    //   const density = (weight / w_weight).toFixed(2);
    //   const carat = getCarat(density);

    //   // Ensure carat is valid
    //   if (carat < 10) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Error: invalid carat, check your weight and water weight.",
    //     });
    //   }

    //   // Calculate the amount for this operation
    //   let amount;
    //   if (currency === "FCFA") {
    //     amount = (base / 24) * carat * weight;
    //   } else if (currency === "GNF" || currency === "USD") {
    //     amount = (base / 22) * carat * weight;
    //   }

    //   // Push data for this gold insertion
    //   goldData.push({
    //     base,
    //     weight,
    //     w_weight,
    //     density,
    //     carat,
    //     value: amount.toFixed(0),
    //     situation,
    //   });

    //   // Add to total amount
    //   totalAmount += parseFloat(amount.toFixed(0));
    // }

    // Create buy operation
    const newOperation = await BuyOperation.create(
      [
        {
          currency,
          golds: processedGold,
          amount: totalAmount,
          amountPaid,
          paymentStatus,
          partner: partnerId,
          company: manager.company,
        },
      ],
      { session }
    );

    // Update balances
    await Promise.all([
      Partner.findByIdAndUpdate(
        partnerId,
        { $inc: { balance: totalAmount } },
        { session }
      ),

      Company.findByIdAndUpdate(
        manager.company,
        {
          $inc: { balance: -totalAmount },
        },
        { session }
      ),
    ]);

    await session.commitTransaction();

    res.status(201).json({ success: true, code: 201, data: newOperation[0] });
  } catch (error) {
    await session.abortTransaction();
    console.error("Buy operation error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to create buy operation",
    });
  } finally {
    session.endSession();
  }
};

// Get all operations
export const getAllOperations = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).select("company").lean();
    if (!manager?.company) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Company association required",
      });
    }

    const { page = 1, limit = 10, status, currency } = req.query;
    const filter = {
      company: manager.company,
      deletedAt: null,
    };

    if (status) filter.status = status;
    if (currency) filter.currency = currency;

    const [operations, total] = await Promise.all([
      BuyOperation.find(filter)
        .select("-__v -updatedAt")
        .sort("-date")
        .skip((page - 1) * limit)
        .populate("partner", "name balance")
        .lean(),
      BuyOperation.countDocuments(filter),
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
      data: operations,
    });
  } catch (error) {
    console.error("Get operations error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve operations",
    });
  }
};

// Get Operation by ID
export const getOperation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid operation ID",
      });
    }

    const manager = await User.findById(req.user.id).select("company").lean();

    const operation = await BuyOperation.findOne({
      _id: id,
      company: manager?.company,
      deletedAt: null,
    })
      .select("-__v -updatedAt")
      .populate("partner", "name phone")
      .lean();

    if (!operation) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Operation not found" });
    }

    await triggerWebhook("operation.create", {
      id: operation._id,
      amount: operation.amount,
      currency: operation.currency,
      companyId: operation.company,
    });

    res.status(200).json({ success: true, code: 200, data: operation });
  } catch (error) {
    console.error("Get operation error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve operation",
    });
  }
};

// Update Buy Operation
export const updateOperation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { golds, partnerId, paymentStatus, amountPaid, status, currency } =
        req.body;

      // Validate operation ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Invalid operation ID format",
        });
      }

      const [manager, operation] = await Promise.all([
        User.findById(req.user.id).select("company").session(session),
        BuyOperation.findOne({
          _id: id,
          company: req.user.company,
          deletedAt: null,
        }).session(session),
      ]);

      // Authorization checks
      if (!manager?.company || !operation) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Operation not found",
        });
      }

      // Validate partner relationship if changing partner
      if (partnerId && !mongoose.Types.ObjectId.isValid(partnerId)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Invalid partner ID",
        });
      }

      let newPartner;
      if (partnerId) {
        newPartner = await Partner.findOne({
          _id: partnerId,
          companies: manager.company,
        }).session(session);

        if (!newPartner) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            code: 400,
            message: "Invalid partner selection",
          });
        }
      }

      // Process gold updates
      let totalAmount = operation.amount;
      if (golds && Array.isArray(golds)) {
        const processedGold = await Promise.all(
          golds.map(async (item) => {
            const { base, weight, w_weight } = item;

            if (!base || !weight || !w_weight || w_weight >= weight) {
              throw new Error("Invalid gold item parameters");
            }

            const density = weight / w_weight;
            const carat = getCarat(density);
            const value = calculateGoldValue(
              base,
              carat,
              weight,
              currency || operation.currency
            );

            return {
              ...item,
              density: Number(density.toFixed(2)),
              carat,
              value: Number(value.toFixed(2)),
            };
          })
        );

        totalAmount = processedGold.reduce((sum, item) => sum + item.value, 0);
        operation.golds = processedGold;
      }

      // Calculate balance difference
      const amountDifference = totalAmount - operation.amount;

      // Update operation fields
      const updateFields = {
        amount: totalAmount,
        status: status || operation.status,
        paymentStatus: paymentStatus || operation.paymentStatus,
        amountPaid: amountPaid || operation.amountPaid,
        currency: currency || operation.currency,
      };

      if (partnerId) {
        updateFields.partner = partnerId;
      }

      const updatedOperation = await BuyOperation.findByIdAndUpdate(
        id,
        updateFields,
        { new: true, session }
      );

      // Update balances
      await Promise.all([
        Partner.findByIdAndUpdate(
          partnerId || operation.partner,
          { $inc: { balance: amountDifference } },
          { session }
        ),
        Company.findByIdAndUpdate(
          manager.company,
          { $inc: { balance: -amountDifference } },
          { session }
        ),
      ]);

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        code: 200,
        data: updatedOperation,
      });
    }, transactionOptions);
  } catch (error) {
    await session.abortTransaction();
    console.error("Update operation error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update operation",
    });
  } finally {
    session.endSession();
  }
};

// Soft delete buy operation
export const deleteBuyOperation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Invalid operation ID.",
        });
      }

      const [manager, operation] = await Promise.all([
        User.findById(req.user.id).select("company").session(session),
        BuyOperation.findOne({
          _id: id,
          company: req.user.company,
          deletedAt: null,
        }).session(session),
      ]);

      // Authorization checks
      if (!manager?.company || !operation) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Operation not found",
        });
      }

      // Update balance
      const [partner] = await Promise.all([
        Partner.findByIdAndUpdate(
          operation.partner,
          { $inc: { balance: -operation.amount } },
          { new: true, session }
        ),
        Company.findByIdAndUpdate(
          manager.company,
          {
            $inc: { balance: operation.amount },
          },
          { session }
        ),
      ]);

      if (!partner) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Associated partner not found",
        });
      }

      // Soft delete operation
      const deletedOperation = await BuyOperation.findByIdAndUpdate(
        id,
        {
          deletedAt: new Date(),
          deletedBy: req.user.id,
          status: "canceled",
        },
        { new: true, session }
      );

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        code: 200,
        message: "Operation canceled successfully",
        data: deletedOperation,
      });
    }, transactionOptions);
  } catch (error) {
    console.error("Delete operation error:", error);
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to cancel operation",
    });
  } finally {
    session.endSession();
  }
};

// Restore buy operation
export const restoreBuyOperation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid operation ID");
      }

      const [manager, operation] = await Promise.all([
        User.findById(req.user.id).select("company").session(session),
        BuyOperation.findOne({
          _id: id,
          company: req.user.company,
          deletedAt: { $ne: null },
          company: req.user.company,
        }).session(session),
      ]);

      // Authorization checks
      if (!manager?.company || !operation) {
        throw new Error("Operation not found or unauthorized");
      }

      // Check company balance
      const company = await Company.findById(manager.company).session(session);
      if (company.balance < operation.amount) {
        throw new Error("Insufficient company balance to restore operation");
      }

      // Restore balance
      await Promise.all([
        Partner.findByIdAndUpdate(
          operation.partner,
          { $inc: { balance: operation.amount } },
          { new: true, session }
        ),
        Company.findByIdAndUpdate(
          manager.company,
          {
            $inc: { balance: -operation.amount },
          },
          { session }
        ),
      ]);

      // Update operation
      const restoredOperation = await BuyOperation.findByIdAndUpdate(
        id,
        {
          $unset: { deletedAt: 1, deletedBy: 1 },
          $push: {
            restorationHistory: {
              restoredAt: new Date(),
              restoredBy: req.user.id,
            },
          },
          status: "pending",
        },
        { new: true, session }
      );

      if (!restoredOperation) {
        throw new Error("Restoration failed");
      }
    }, transactionOptions);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Operation restored successfully",
    });
  } catch (error) {
    console.error("Restoration", error);

    const statusCode = error.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      code: statusCode,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};
