import { ApiError } from "../utils/ApiError.js";
import { isProd } from "../config/env.js";

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : "Internal server error";

  if (!isApiError) {
    // Log unexpected errors for debugging; never leak internals to the client
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: isApiError ? err.details : undefined,
    stack: !isProd && !isApiError ? err.stack : undefined,
  });
};
