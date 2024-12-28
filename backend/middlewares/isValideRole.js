const isValidRole = (req, res, next) => {
  const valideRoles = ["admin", "manager", "partner"];
  const { role } = req.body;
  if (!valideRoles.includes(role)) {
    return res.status(401).json({
      success: false,
      message: "Access denied, invalide role",
    });
  }
  next();
};

export default isValidRole;
