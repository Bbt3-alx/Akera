import {
  forgotPassword as forgotPasswordService,
  getAuthenticatedUser,
  loginUser,
  resendVerificationEmail,
  resetPassword as resetPasswordService,
  signupUser,
  verifyEmail as verifyEmailService,
} from "../services/auth.service.js";

export const signup = async (req, res) => {
  const authPayload = await signupUser(req.body);

  res.status(201).json({
    success: true,
    code: 201,
    message: "User created. Verify your email.",
    data: authPayload,
  });
};

export const verifyEmail = async (req, res) => {
  const authPayload = await verifyEmailService(req.body);

  res.status(200).json({
    success: true,
    code: 200,
    message: "Email verified!",
    data: authPayload,
  });
};

export const resendVerification = async (req, res) => {
  const result = await resendVerificationEmail(req.body);

  res.status(200).json({
    success: true,
    code: 200,
    message: result.message,
  });
};

export const login = async (req, res) => {
  const authPayload = await loginUser(req.body);

  res.status(200).json({
    success: true,
    code: 200,
    message: "Logged in successfully",
    data: authPayload,
  });
};

export const getMe = async (req, res) => {
  const data = await getAuthenticatedUser(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    code: 200,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const result = await forgotPasswordService(req.body);

  res.status(200).json({
    success: true,
    code: 200,
    message: result.message,
  });
};

export const resetPassword = async (req, res) => {
  const result = await resetPasswordService(req.params.token, req.body);

  res.status(200).json({
    success: true,
    code: 200,
    message: result.message,
    data: result.data,
  });
};
