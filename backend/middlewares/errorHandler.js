export class ApiError extends Error {
  constructor(statusCode, message, errorCode, details, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    ((this.details = details), (this.isOperational = isOperational));
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  // Mongo CastError
  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.isOperational = true;
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "unique_field";

    err.statusCode = 409;
    err.message = `${field} already exists`;
    err.isOperational = true;
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";

  if (process.env.NODE_ENV === "development") {
    console.error("ERROR:", {
      path: req.originalUrl,
      method: req.method,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    code: statusCode,
    message,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    ...(err.details && { details: err.details }),
  });
};

// Async error handler wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
