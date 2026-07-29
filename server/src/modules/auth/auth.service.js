import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../utils/jwt.js";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from "../../services/email/index.js";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const buildAccessToken = (user) =>
  signAccessToken({ sub: user.id, role: user.role });

const issueRefreshToken = async (userId, meta = {}) => {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return token;
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  emailPreferences: {
    messages: user.emailNotifyMessages,
    files: user.emailNotifyFiles,
    projectUpdates: user.emailNotifyProjectUpdates,
    projectCompleted: user.emailNotifyProjectCompleted,
  },
});

export const registerUser = async (
  { email, password, firstName, lastName },
  meta,
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: "CLIENT",
      emailVerifyToken,
      emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Fire-and-forget: a slow/failed email must never block or fail registration.
  sendWelcomeEmail(user).catch((err) => console.error("Failed to send welcome email:", err));
  sendVerificationEmail(user, emailVerifyToken).catch((err) =>
    console.error("Failed to send verification email:", err),
  );

  const accessToken = buildAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, meta);

  return { user: publicUser(user), accessToken, refreshToken };
};

export const loginUser = async ({ email, password }, meta) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no user" and "wrong password" — don't leak which one
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const accessToken = buildAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, meta);

  return { user: publicUser(user), accessToken, refreshToken };
};

export const refreshSession = async (incomingToken, meta) => {
  if (!incomingToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  const tokenHash = hashToken(incomingToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    // Reuse of a revoked/expired token is a strong signal of theft —
    // revoke the whole family for this user as a precaution.
    if (stored?.userId) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      });
    }
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (!stored.user.isActive) {
    throw new ApiError(401, "Account deactivated");
  }

  // Rotate: revoke the old token, issue a new one
  const newToken = generateRefreshToken();
  const newTokenHash = hashToken(newToken);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, replacedBy: newTokenHash },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: stored.userId,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
  ]);

  const accessToken = buildAccessToken(stored.user);

  return {
    user: publicUser(stored.user),
    accessToken,
    refreshToken: newToken,
  };
};

export const logoutUser = async (incomingToken) => {
  if (!incomingToken) return;
  const tokenHash = hashToken(incomingToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
};

export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success regardless of whether the user exists,
  // to avoid leaking which emails are registered
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  sendPasswordResetEmail(user, token).catch((err) =>
    console.error("Failed to send password reset email:", err),
  );
};

export const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
  });

  if (
    !user ||
    !user.passwordResetExpiry ||
    user.passwordResetExpiry < new Date()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    }),
    // Invalidate all existing sessions on password change
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true },
    }),
  ]);
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");
  return publicUser(user);
};

export const verifyEmail = async (token) => {
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });

  if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
    throw new ApiError(400, "Invalid or expired verification link");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
  });

  return publicUser(updated);
};

export const updateEmailPreferences = async (userId, preferences) => {
  const data = {};
  if ("messages" in preferences) data.emailNotifyMessages = preferences.messages;
  if ("files" in preferences) data.emailNotifyFiles = preferences.files;
  if ("projectUpdates" in preferences) data.emailNotifyProjectUpdates = preferences.projectUpdates;
  if ("projectCompleted" in preferences) data.emailNotifyProjectCompleted = preferences.projectCompleted;

  const user = await prisma.user.update({ where: { id: userId }, data });
  return publicUser(user);
};
