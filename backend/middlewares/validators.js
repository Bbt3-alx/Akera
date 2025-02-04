import { isValidObjectId } from "mongoose";
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

export const validateCompanyUpdate = async (req, res, next) => {
  const allowedFields = ["name", "address", "contact", "balance"];
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
