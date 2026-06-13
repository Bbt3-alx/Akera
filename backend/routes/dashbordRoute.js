import express from "express";

const router = express.Router();

const legacyDashboardRouteDisabled = (req, res) => {
  res.status(410).json({
    success: false,
    code: 410,
    message:
      "Legacy dashboard route disabled. Use the modern dashboard endpoint when available.",
  });
};

router.all("/", legacyDashboardRouteDisabled);

export default router;
