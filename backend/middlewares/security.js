import { body, query, param } from "express-validator";

export const customerSanitization = [
  body("email").normalizeEmail(),
  body("phone").trim().escape(),
  param("id").trim().escape(),
];

export const xssProtection = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};
