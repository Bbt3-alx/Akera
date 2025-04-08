import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";

export const requiredCompany = async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("company");

  if (!user?.company) {
    throw new ApiError(403, "Company account required", "NO_COMPANY");
  }
  req.company = user.company;
  next();
};
