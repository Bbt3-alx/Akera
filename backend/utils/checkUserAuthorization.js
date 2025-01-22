import User from "../models/User.js";

const checkUserAuthorization = async (req) => {
  const manager = await User.findById(req.user.id).populate("company");

  if (!manager || !manager.company) {
    throw new Error("Access denied. Unauthorized.");
  }

  return manager;
};

export default checkUserAuthorization;
