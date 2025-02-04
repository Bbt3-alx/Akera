const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Access denied. User role not found.",
      });
    }

    // Check if the user has at list one of the allowed roles
    const userRoles = [];
    req.user.roles.forEach((r) => {
      if (allowedRoles.includes(r)) {
        userRoles.push(r);
      }
    });
    if (userRoles.length === 0) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: `Access denied. Insufficient permissions`,
      });
    }
    next();
  };
};

export default authorizeRoles;
