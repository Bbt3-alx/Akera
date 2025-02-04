export const validatePhone = (phone) => /^\+?[1-9]\d{1,14}$/.test(phone);
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
