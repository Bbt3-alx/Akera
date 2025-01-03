export const isAdminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles.includes("admin")) {
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};
