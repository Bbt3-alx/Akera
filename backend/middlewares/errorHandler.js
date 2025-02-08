export const errorHandler = (err, req, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    code: 500,
    message:
      process.env.VITE_NODE_ENV === "development"
        ? err.message
        : "Server error",
  });
};
