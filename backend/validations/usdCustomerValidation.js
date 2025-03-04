import Joi from "joi";
import { ApiError } from "../middlewares/errorHandler.js";

const phoneRegex = /^\+?[0-9]{1, 14}$/;

export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(70).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(phoneRegex).required(),
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(70),
  email: Joi.string().email(),
  phone: Joi.string().pattern(phoneRegex),
}).min(1);
