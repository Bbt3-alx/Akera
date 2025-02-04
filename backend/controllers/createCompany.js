import mongoose, { isValidObjectId } from "mongoose";
import Company from "../models/Company.js";
import BuyOperation from "../models/BuyOperation.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import { validatePhone, validateEmail } from "../utils/validators.js";
import Transaction from "../models/Transaction.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";

export const createCompany = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      name,
      address,
      contact,
      balance,
      currency,
      partners = [],
    } = req.body;

    // Validation
    const errors = [];
    if (!name?.trim()) errors.push("Name is required.");
    if (!address?.trim()) errors.push("Address is required.");
    if (!validatePhone(contact) && !validateEmail(contact)) {
      errors.push("Invalid contact - must be valid phone or email");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, code: 400, errors });
    }
    // Check existing company
    const existingCompany = await Company.findOne({
      $or: [{ name }, { contact }],
    }).session(session);
    if (existingCompany) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        code: 409,
        message: "Company with this name or contact already exists.",
      });
    }

    // Create company
    const newCompany = new Company({
      name,
      address,
      contact,
      balance,
      manager: req.user.id,
      currency,
    });
    const savedCompany = await newCompany.save({ session });

    // Process partners
    const partnerOperations = partners.map(async (partnerData) => {
      const existingPartner = await Partner.findOne({
        $or: [{ phone: partnerData.phone }, { email: partnerData.email }],
      }).session(session);

      if (existingPartner) {
        // Prevent duplication company links
        if (!existingPartner.companies.includes(savedCompany._id)) {
          existingPartner.companies.push(newCompany._id);
          await existingPartner.save({ session });
        }
        return existingPartner._id; // Return the existing partner's ID
      }
      const newPartner = new Partner({
        ...partnerData,
        createdBy: req.user.id,
        companies: [newCompany._id],
      });

      const savedPartner = await newPartner.save({ session });
      return savedPartner._id; // Return the newly created partner's ID
    });

    const partnerIDs = await Promise.all(partnerOperations);
    savedCompany.partners = partnerIDs; // Update with all partners IDs
    await savedCompany.save({ session });

    // Link company to user
    await User.findByIdAndUpdate(
      req.user.id,
      {
        company: savedCompany._id,
      },
      { session, new: true }
    );

    await session.commitTransaction();

    // Sanitize response
    const companyResponse = savedCompany.toObject();
    delete companyResponse.__v;

    res.status(201).json({ success: true, code: 201, data: companyResponse });
  } catch (error) {
    await session.abortTransaction();
    console.log("Company creation error: ", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message:
        process.env.VITE_NODE_ENV === "development"
          ? error.message
          : "Failed to create company",
    });
  } finally {
    session.endSession();
  }
};

export const getCompanyProfile = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: "Invalid ID format." });
  }
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      $or: [{ manager: req.user.id }, { partners: req.user.id }],
    })
      .populate("manager", "name email roles")
      .populate("partners", "name phone email")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Company not found or unauthorized access.",
      });
    }

    // Sanitize output
    delete company.__v;
    delete company.createdAt;
    delete company.updatedAt;

    res.status(200).json({ success: true, code: 200, data: company });
  } catch (error) {
    console.log("Company fetch error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch company details",
    });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const query = { deleteAt: null };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .skip((req.pagination.page - 1) * req.pagination.limit)
        .limit(req.pagination.limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page: req.pagination.page,
        limit: req.pagination.limit,
        totalPages: Math.ceil(total / req.pagination.limit),
        totalItems: total,
      },
      data: companies,
    });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch companies",
    });
  }
};

export const updateCompany = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, session }
    ).lean();

    await session.commitTransaction();
    res.status(200).json({ success: true, code: 200, data: updatedCompany });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const softDeleteCompany = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const manager = await checkUserAuthorization(req);
    const deletedCompany = await Company.findOneAndUpdate(
      {
        _id: req.params.id,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
        deletedBy: manager.id,
        status: "closed",
      },
      { new: true, session }
    );

    if (!deletedCompany) {
      return res.status(422).json({
        success: false,
        code: 422,
        message: "Company not found or already deleted.",
      });
    }
    // Delete related transactions
    await Transaction.updateMany(
      { company: deletedCompany._id },
      {
        deletedAt: new Date(),
        deletedBy: manager.id,
        status: "canceled",
      },
      { new: true, session }
    );

    // Delete related buy operation
    await BuyOperation.updateMany(
      { company: deletedCompany },
      {
        deletedAt: new Date(),
        deletedBy: manager.id,
        status: "canceled",
      },
      { new: true, session }
    );

    await session.commitTransaction();
    res.status(200).json({
      success: false,
      code: 200,
      message: `Company ${deletedCompany._id} deleted successfully.`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res
      .status(500)
      .json({ success: false, code: 500, message: "Internal server error." });
  } finally {
    session.endSession();
  }
};
