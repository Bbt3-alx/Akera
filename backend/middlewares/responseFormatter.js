export const standardizeResponse = ({
  res,
  success = true,
  code = 200,
  message = "",
  data = null,
  pagination = null,
  headers = {},
}) => {
  // Set custom headers
  Object.entries(headers).forEach(([key, value]) => {
    res.set(key, value);
  });

  // Standardize response
  const response = {
    success: code < 400,
    code,
    message,
    data,
    ...(pagination && { pagination }),
  };

  // Cache control for GET requests
  // if (res.req.method === "GET" && code < 200) {
  //   res.set("Cache-Contral", "public, max-age=300");
  // }

  return res.status(code).json(response);
};

// Success response helper
export const successResponse = (res, data, options = {}) => {
  return standardizeResponse({
    res,
    success: true,
    data,
    code: options.code || 200,
    message: options.message || "Operation successful",
    pagination: options.pagination || null,
  });
};

// Error response helper
export const errorResponse = (res, error) => {
  return standardizeResponse({
    res,
    success: false,
    code: error.code || 500,
    message: error.message || "Internal server error",
    data: error.data || null,
  });
};
