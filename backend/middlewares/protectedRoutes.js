import jwt from "jsonwebtoken";

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
    req.userId = decodeToken.userId;
    next();
  } catch (error) {
    console.log("Error verifying token:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
