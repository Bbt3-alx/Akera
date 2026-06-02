import { ApiError } from "../middlewares/errorHandler.js";

const validateSignupInput = (email, password, profile = {}, next) => {
  if (!email || !password || !profile.firstname || !profile.lastname || !profile.phone) {
    next(new ApiError(422, "Missing required fields.", "VALIDATION_ERROR"));
    return false;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    next(new ApiError(422, "Invalid email format", "VALIDATION_ERROR"));
    return false;
  }

  return true;
};

export default validateSignupInput;
