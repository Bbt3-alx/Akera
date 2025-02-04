import rateLimit from "express-rate-limit";

export const companyCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many company creation attemps, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
