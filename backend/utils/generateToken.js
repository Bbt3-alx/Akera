import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId, userRole) => {
  const token = jwt.sign(
    { id: userId, role: userRole },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 60 * 60 * 1000,
  });

  return token;
};
