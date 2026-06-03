import jwt from "jsonwebtoken";

export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m"
    }
  )
};
