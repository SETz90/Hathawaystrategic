import { verifyAccessToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authenticated");
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Account not found or deactivated");
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
});

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
