import Company from "../models/Company.js";
import Partner from "../models/Partner.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import BuyOperation from "../models/BuyOperation.js";
import { validatePhone, validateEmail } from "../utils/validators.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import mongoose, { isValidObjectId } from "mongoose";

// CREATE A PARTNER
export const addPartner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phone, email, balance, currency } = req.body;
    const errors = [];

    // validation
    if (!name?.trim()) errors.push("Name is required");
    if (!phone && !email) errors.push("Phone or email is required");
    if (phone && !validatePhone(phone)) errors.push("Invalid phone format");
    if (email && !validateEmail(email)) errors.push("Invalid email format");

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        errors,
      });
    }

    // Authorization check
    const manager = await User.findById(req.user.id)
      .select("company role")
      .session(session);
    if (!manager?.company) {
      return res.status(403).json({
        success: true,
        code: 403,
        message: "You must have a company to add partners",
      });
    }

    // Check existing partner
    const existingPartner = await Partner.findOne({
      $or: [{ phone }, { email }],
    }).session(session);

    if (existingPartner) {
      if (existingPartner.companies.includes(manager.company)) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          code: 409,
          message: "Partner already exists in your company",
        });
      }

      // Add company to existing partner
      existingPartner.companies.push(manager.company);
      await existingPartner.save({ session });

      // Add partner to company
      await Company.findByIdAndUpdate(
        manager.company,
        { $addToSet: { partners: existingPartner._id } },
        { session }
      );

      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        code: 200,
        data: existingPartner.toObject({ virtuals: true }),
      });
    }

    // Create new oartner
    const newPartner = new Partner({
      name,
      phone,
      email,
      balance,
      currency,
      companies: [manager.company],
      createdBy: req.user.id,
    });

    const savedPartner = await newPartner.save({ session });

    // Link to company
    await Company.findByIdAndUpdate(
      manager.company,
      { $addTpSet: { partners: savedPartner._id } },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      code: 201,
      data: savedPartner.toObject({ virtuals: true }),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Partner creation error:", error.message);
    res
      .status(500)
      .json({ success: false, code: 500, message: "Failed to create partner" });
  } finally {
    session.endSession();
  }
};

// GET PARTNERS (Paginated)
export const getPartners = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).select("company").lean();
    if (!manager?.company) {
      return res
        .status(403)
        .json({ success: false, code: 403, message: "Company not found" });
    }

    const query = {
      companies: manager.company,
      deletedAt: null,
    };

    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, "i") },
        { phone: new RegExp(req.query.search, "i") },
        { email: new RegExp(req.query.search, "i") },
      ];
    }

    const [partners, total] = await Promise.all([
      Partner.find(query)
        .select("-__v -createdAt -UpdatedAt")
        .skip((req.pagination.page - 1) * req.pagination.limit)
        .limit(req.pagination.limit)
        .lean(),
      Partner.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      code: 200,
      pagination: {
        page: req.pagination.limit,
        total,
        totalPages: Math.ceil(total / req.pagination.limit),
      },
      data: partners,
    });
  } catch (error) {
    console.error("Get partners error:", error);
    res
      .status(500)
      .json({ success: false, code: 500, message: "Failed to fetch partners" });
  }
};

// UPDATE A PARTNER
export const updatePartner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phone, email, balance, currency } = req.body;
    const manager = await User.findById(req.user.id)
      .select("company")
      .session(session);

    // Validate partner belongs to company
    const partner = await Partner.findOne({
      _id: req.params.id,
      companies: manager.company,
      deletedat: null,
    }).session(session);

    if (!partner) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Partner not found" });
    }

    // Validate contact info

    if (phone && !validatePhone(phone)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, code: 400, message: "invalid phone format" });
    }

    if (email && !validateEmail(email)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, code: 400, message: "Invalid email format" });
    }

    // Check if updated contact infos does exist
    const existingPartner = await Partner.findOne({
      _id: { $ne: req.params.id },
      deletedAt: null,
    });

    if (existingPartner?.phone.toString().trim() === phone?.trim()) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        code: 409,
        message: "This phone number is not available.",
      });
    }

    if (existingPartner?.email.trim() === email?.trim()) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        code: 409,
        message: "This email is not available.",
      });
    }

    // Update fields
    if (name) partner.name = name;
    if (phone) partner.phone = phone;
    if (email) partner.email = email;
    if (balance) partner.balance = balance;
    if (currency) partner.currency = currency;

    const updatedPartner = await partner.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      data: updatedPartner.toObject({ virtuals: true }),
    });
  } catch (error) {
    console.log("Update partner error:", error);
    res
      .status(500)
      .json({ success: false, code: 500, message: "Failed to update partner" });
  } finally {
    session.endSession();
  }
};

// GET A PARTNER BALANCE
export const getPartnerBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: partnerId } = req.params;

    // Validate partner ID format
    if (!isValidObjectId(partnerId)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid partner ID format",
      });
    }

    const [manager, partner] = await Promise.all([
      User.findById(req.user.id).select("company").session(session),
      Partner.findById(partnerId)
        .select("balance companies currency")
        .session(session),
    ]);

    // Authorization checks
    if (!manager?.company) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Company association requiered",
      });
    }

    if (!partner?.companies.includes(manager.company)) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Partner not found in your company",
      });
    }
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      code: 200,
      data: {
        balance: partner.balance,
        currency: partner.currency,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Balance check error:", error);
    return res.status(500).json({
      success: true,
      code: 500,
      messsge: "Failed to retrieve balance",
    });
  } finally {
    session.endSession();
  }
};

// SOFT DELETE PARTNER
export const removePartner = async (req, res) => {
  const session = await mongoose.startSession();
  const transactionOptions = {
    readPreference: "primary",
    readConcern: { level: "local" },
    writeConcern: { w: "majority" },
    maxCommitTimeMS: 1000,
  };

  try {
    await session.withTransaction(async () => {
      const { id: partnerId } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Invalid partner ID format",
        });
      }

      const [manager, partner] = await Promise.all([
        User.findById(req.user.id).select("company").session(session),
        Partner.findOne({
          _id: partnerId,
          deletedAt: null,
        }).session(session),
      ]);

      // Authorization checks
      if (!manager?.company) {
        throw new Error("Company association required");
      }

      if (!partner?.companies.includes(manager.company)) {
        throw new Error("Partner not found in your company");
      }

      // Update company
      await Company.findByIdAndUpdate(
        manager.company,
        { $pull: { partners: partnerId } },
        { session }
      );

      // Update partner
      partner.companies = partner.companies.filter(
        (c) => c.toString() !== manager.company.toString()
      );

      if (partner.companies.length === 0) {
        partner.deletedAt = new Date();
        partner.deletedBy = req.user.id;
      }

      await partner.save({ session });

      // Archive transactions
      await Transaction.updateMany(
        { company: manager.company, partner: partnerId },
        { $set: { archived: true } },
        { session }
      );
    }, transactionOptions);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Partner relationship removed successfully",
    });
  } catch (error) {
    console.error("Partner removal error:", error);
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      code: statusCode,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// GET PARTNER DETAILS
export const getPartner = async (req, res) => {
  try {
    const { id: partnerId } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid partner ID format",
      });
    }

    const manager = await User.findById(req.user.id).select("company").lean();

    const partner = await Partner.findOne({
      _id: partnerId,
      companies: manager?.company,
      deletedAt: null,
    }).select("-__v -createdAt -updatedAt");

    if (!partner) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      data: partner,
    });
  } catch (error) {
    console.error("Partner fetch error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch partner details",
    });
  }
};

// RESTORE PARTNER
export const restorePartner = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id: partnerId } = req.params;

      // Find soft-deleted partner
      const partner = await Partner.findOne({
        _id: partnerId,
        deletedAt: { $ne: null },
      }).session(session);

      if (!partner) {
        throw new Error("No soft-deleted partner found");
      }

      // Restore partner
      partner.deletedAt = null;
      partner.deletedBy = null;
      partner.restorationHistory.push({
        restoredAt: new Date(),
        restoredBy: req.user.id,
      });

      await partner.save({ session });

      // Optional: Restore archived transactions
      await Transaction.updateMany(
        { partner: partnerId, archived: true },
        { $set: { archived: false } },
        { session }
      );
    });

    res.status(200).json({
      success: true,
      code: 200,
      message: "Partner restored successfully",
    });
  } catch (error) {
    console.error("Restore partner error:", error);
    const statusCode = error.message.includes("found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      code: statusCode,
      message: error.message,
    });
  } finally {
    await session.endSession();
  }
};
