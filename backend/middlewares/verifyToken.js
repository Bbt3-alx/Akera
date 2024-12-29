import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  // Retrieve the Authorization header
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing or malformed",
    });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided, authorization denied",
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // Attach the user data to the request object (id and role)
    console.log("Decoded user: ", req.user);
    // Proceed to the next middleware
    next();
  } catch (error) {
    console.log("Error verifying token:", error.message); // For debugging

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default verifyToken;
