export const validatePhone = (phone) => /^\+?[1-9]\d{1,14}$/.test(phone);
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validTransitions = {
  "in progress": ["shipped", "on hold"],
  shipped: ["delivered", "on hold"],
  "on hold": ["in progress", "shipped"],
  canceled: [],
};

export function validateStatusTransition(oldStatus, newStatus) {
  return validTransitions[oldStatus]?.includes(newStatus);
}
