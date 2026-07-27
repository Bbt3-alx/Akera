import rateLimit from "express-rate-limit";

export const invitationLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    code: 429,
    message: "Too many invitation lookup attempts. Please try again later.",
    errorCode: "INVITATION_LOOKUP_RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
