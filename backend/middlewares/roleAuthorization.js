const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied. User role not found.",
      });
    }

    // Check if the user has at list one of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Insufficient permissions",
      });
    }
    next();
  };
};

export default authorizeRoles;
