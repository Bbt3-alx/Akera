import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "./errorHandler.js";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new ApiError(
        401,
        "Authorization header missing or malformed",
        "AUTH_HEADER_INVALID",
      ),
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(
      new ApiError(
        401,
        "No token provided, authorization denied",
        "TOKEN_MISSING",
      ),
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.sub;

    if (!userId) {
      return next(new ApiError(401, "Invalid token payload", "TOKEN_INVALID"));
    }

    const user = await User.findById(userId).select("_id isActive");
    if (!user) {
      return next(
        new ApiError(403, "Invalid token. Unauthorized.", "TOKEN_UNAUTHORIZED"),
      );
    }

    if (user.isActive === false) {
      return next(new ApiError(403, "User account is inactive", "USER_INACTIVE"));
    }

    req.user = {
      id: decoded.sub,
    };

    next();
  } catch (error) {
    console.log("Error verifying token:", error.message);
    return next(new ApiError(401, "Invalid or expired token", "TOKEN_INVALID"));
  }
};

export default verifyToken;
