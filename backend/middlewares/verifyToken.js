import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "./errorHandler.js";

const extractBearerToken = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.get?.("authorization") || req.headers.authorization;

  if (!authHeader || !/^Bearer\b/i.test(authHeader.trim())) {
    return next(
      new ApiError(
        401,
        "Authorization header missing or malformed",
        "AUTH_HEADER_INVALID",
      ),
    );
  }

  const token = extractBearerToken(authHeader);

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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.sub;

    if (!userId) {
      return next(new ApiError(401, "Invalid token payload", "TOKEN_INVALID"));
    }

    const user = await User.findById(userId)
      .select("_id email isActive tokenVersion")
      .lean();

    if (!user) {
      return next(
        new ApiError(403, "Invalid token. Unauthorized.", "TOKEN_UNAUTHORIZED"),
      );
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      return next(
        new ApiError(
          401,
          "Token has been revoked. Please log in again",
          "TOKEN_REVOKED",
        ),
      );
    }

    if (user.isActive === false) {
      return next(new ApiError(403, "User account is inactive", "USER_INACTIVE"));
    }

    req.user = {
      id: payload.sub,
      email: user.email,
    };

    next();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error verifying token:", error);
    }
    return next(new ApiError(401, "Invalid or expired token", "TOKEN_INVALID"));
  }
};

export default verifyToken;
