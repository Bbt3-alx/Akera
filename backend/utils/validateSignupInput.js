const validateSignupInput = (email, password, name, roles) => {
  const validRoles = ["partner", "manager", "admin"]; // Predefined valid roles

  if (!email || !password || !name) {
    throw new Error("Missing required fields");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Invalid email format");
  }

  if (roles && Array.isArray(roles)) {
    roles.forEach((role) => {
      if (!validRoles.includes(role)) {
        throw new Error(` ${role} is not a valid roles.`);
      }
    });
  }

  if (roles.includes("admin")) {
    throw new Error("Cannot assign admin role during signup.");
  }
};

export default validateSignupInput;
