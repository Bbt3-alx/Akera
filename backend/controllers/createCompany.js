import mongoose, { isValidObjectId } from "mongoose";
import Company from "../models/Company.js";
import BuyOperation from "../models/BuyOperation.js";
import Transaction from "../models/Transaction.js";
import checkUserAuthorization from "../utils/checkUserAuthorization.js";
import { createCompanyForUser } from "../services/company.service.js";

export const createCompany = async (req, res, next) => {
  try {
    const result = await createCompanyForUser({
      userId: req.user.id,
      payload: req.body,
    });

    res.status(201).json({
      success: true,
      code: 201,
      data: result,
    });
  } catch (error) {
    next(error);
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
      status: { $ne: "closed" },
      deletedAt: null,
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
    const query = { deletedAt: null };

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
