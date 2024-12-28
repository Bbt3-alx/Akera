import jwt from "jsonwebtoken";
/*
export const validateToken = (req, res, next) => {
  //  checks for the presence of a token in a cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      status: false,
      message: `Unautorized, no token provided`,
    });
  }
  try {
    // verifies the token's validity using the secret key
    // and decodes it to extract the userId.
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodeToken) {
      return res
        .status(401)
        .json({ status: false, message: "unautorized, invalide token" });
    }
    req.userId = decodeToken;
    next();
  } catch (error) {
    console.log("Error verifying token:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
*/

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

    // Attach user data to the request object
    req.user = decoded;
    console.log("Decoded user: ", req.user);
    // Proceed to the next middleware
    next();
  } catch (error) {
    console.error("Error verifying token:", error.message); // For debugging

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default verifyToken;
