export class ApiError extends Error {
  constructor(statusCode, message, details, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    (this.details = details), (this.isOperational = isOperational);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";

  if (process.env.VITE_NODE_ENV === "development") {
    console.error(`[${new Date().toISOString()}] ERROR:`, {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack,
    });
  }

  // Sepecial handling for MongoDB errors
  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code == 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.statusCode = 409;
    err.message = `${field} already exists`;
  }

  res.status(statusCode).json({
    success: false,
    code: statusCode,
    message,
    ...(process.env.VITE_NODE_ENV === "development" && { stack: err.stack }),
    ...(err.details && { details: err.details }),
  });
};

// Async error handler wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
