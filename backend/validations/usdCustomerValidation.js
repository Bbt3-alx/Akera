import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";

const phoneRegex = /^\+?[0-9]([\s-]?[0-9]){6,13}$/;
66;
export const validateCustomerCreation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(70).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(phoneRegex).required(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new ApiError(400, "Validation Error", {
      field: error.details[0].path[0],
      message: error.details[0].message,
    });
  }
};

export const validateCustomerUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(70),
    email: Joi.string().email(),
    phone: Joi.string().pattern(phoneRegex),
  }).min(1);

  const { error } = schema.validate(data);
  if (error)
    throw new ApiError(400, "Validation Error", {
      field: error.details[0].path[0],
      message: error.details[0].message,
    });
};
