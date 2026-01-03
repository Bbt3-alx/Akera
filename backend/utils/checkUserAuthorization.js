import User from "../models/User.js";
import { ApiError } from "../middlewares/errorHandler.js";

const checkUserAuthorization = async (req, session) => {
  const manager = await User.findById(req.user.id)
    .populate("company")
    .session(session);

  console.log("Manager:", manager);
  if (!manager || !manager.company) {
    throw new ApiError(401, "Access denied", "UNAUTHORIZED_USER");
  }

  return manager;
};

export default checkUserAuthorization;
