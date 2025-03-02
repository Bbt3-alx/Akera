import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";

export const validateCreateSellOperationInput = (data) => {
  const schema = Joi.object({
    weight: Joi.number().positive().precision(4).required(),
    rate: Joi.number().positive().precision(2).required(),
    unit: Joi.string().valid("g", "kg", "ozt").required(),
  });

  const { error, value } = schema.validate(data);
  if (error)
    throw new ApiError(400, `Validation error: ${error.details[0].message}`);
  return value;
};

export const validateUpdateSellOperationInput = (data) => {
  const schema = Joi.object({
    weight: Joi.number().positive().optional(),
    rate: Joi.number().positive().optional(),
    unit: Joi.string().valid("g", "kg", "ozt").optional(),
  }).min(1); // At least one field must be provided

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, `Validation error: ${error.details[0].message}`);
  }
  return value;
};
