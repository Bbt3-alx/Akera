import rateLimit from "express-rate-limit";

export const transactionPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many transaction PIN attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
