import User from "../models/User.js";
import { ApiError } from "./errorHandler.js";

export const requireVerifiedUser = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(
        new ApiError(
          401,
          "Authenticated user context missing",
          "AUTH_CONTEXT_MISSING",
        ),
      );
    }

    const user = await User.findById(req.user.id)
      .select("_id isVerified")
      .lean();

    if (!user) {
      return next(
        new ApiError(403, "Invalid token. Unauthorized.", "TOKEN_UNAUTHORIZED"),
      );
    }

    if (!user.isVerified) {
      return next(
        new ApiError(403, "Verify your email first", "EMAIL_NOT_VERIFIED"),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
