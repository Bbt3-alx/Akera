import sanitize from "express-mongo-sanitize";

export const sanitizeInput = sanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitizing request key ${key} from IP ${req.ip}`);
  },
});
