import express from "express";

const router = express.Router();

const legacyPartnerRouteDisabled = (req, res) => {
  res.status(410).json({
    success: false,
    code: 410,
    message: "Legacy partner route disabled. Use company memberships instead.",
  });
};

for (const path of [
  "/",
  "/new",
  "/:id",
  "/:id/update/",
  "/:id/balance",
  "/:id/remove",
  "/:id/restore",
]) {
  router.all(path, legacyPartnerRouteDisabled);
}

export default router;
