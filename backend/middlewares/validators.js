import mongoose, { isValidObjectId } from "mongoose";
import Company from "../models/Company.js";

export const validateCompanyId = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "invalide company ID format.",
    });
  }
  next();
};

// Validate company Update
export const validateCompanyUpdate = async (req, res, next) => {
  const allowedFields = ["name", "address", "contact", "balance", "currency"];
  const invalidFields = Object.keys(req.body).filter(
    (f) => !allowedFields.includes(f)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: `Invalid fields: ${invalidFields.join(", ")}`,
    });
  }

  const existingCompany = await Company.findOne({
    name: req.body.name,
    contact: req.body.contact,
    _id: { $ne: req.params.id },
  });

  if (existingCompany) {
    return res.status(409).json({
      succes: false,
      code: 409,
      message: "There is already a company with this name or contact.",
    });
  }
  next();
};

// Validate Partner ID
export const validatePartnerId = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "Invalid partner ID format",
    });
  }
  next();
};

// Validate Transaction input
export const validateTransactionInput = (req, res, next) => {
  const { amount, description, partnerId } = req.body;
  const errors = [];

  if (!amount || isNaN(amount) || amount <= 0) {
    errors.push("Valid amount requored");
  }
  if (!description?.trim()) errors.push("Description required");
  if (!mongoose.Types.ObjectId.isValid(partnerId)) {
    errors.push("invalid partner ID");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, code: 400, errors });
  }

  next();
};

// Validate buy operation
export const validateBuyOperation = (req, res, next) => {
  const { gold, partnerId } = req.body;
  const errors = [];

  if (!Array.isArray(gold) || gold.length === 0) {
    errors.push("At least one gold item required");
  }
  if (!mongoose.Types.ObjectId.isValid(partnerId)) {
    errors.push("invalid partner ID");
  }
  // if (!validateCurrency(currency)) {
  //   errors.push("Invalid currency");
  // }

  gold.forEach((item, index) => {
    if (!item.base || item.base <= 0)
      errors.push(`Item ${index + 1}: Invalid base price`);
    if (!item.weight || item.weight <= 0)
      errors.push(`Item ${index + 1}: Invalid weight`);
    if (!item.w_weight || item.w_weight >= item.weight)
      errors.push(
        `Item ${index + 1}: Water weight must be less than actual weight`
      );
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      code: 400,
      errors,
    });
  }

  next();
};
