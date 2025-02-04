import jwt from "jsonwebtoken";
import User from "../models/User.js";

const verifyToken = async (req, res, next) => {
  // Retrieve the Authorization header
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: 401,
      message: "Authorization header missing or malformed",
    });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 401,
      message: "No token provided, authorization denied",
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // Attach the user data to the request object (id and role)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Invalid token. Unauthorized.",
      });
    }
    // Proceed to the next middleware
    next();
  } catch (error) {
    console.log("Error verifying token:", error.message);
    return res.status(401).json({
      success: false,
      code: 401,
      message: "Invalid or expired token",
    });
  }
};

export default verifyToken;
