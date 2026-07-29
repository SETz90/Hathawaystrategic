import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { isProd, env } from "../../config/env.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth",
  maxAge: REFRESH_COOKIE_MAX_AGE,
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
};

const requestMeta = (req) => ({
  userAgent: req.headers["user-agent"],
  ipAddress: req.ip,
});

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
};

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(
    req.body,
    requestMeta(req),
  );
  setRefreshCookie(res, refreshToken);
  res
    .status(201)
    .json(new ApiResponse(201, { user, accessToken }, "Account created"));
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body,
    requestMeta(req),
  );
  setRefreshCookie(res, refreshToken);
  res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, "Logged in"));
});

export const refresh = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refreshSession(
    incoming,
    requestMeta(req),
  );
  setRefreshCookie(res, refreshToken);
  res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, "Session refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logoutUser(incoming);
  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, null, "Logged out"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "If that email exists, a reset link has been sent",
      ),
    );
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated. Please log in again."));
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json(new ApiResponse(200, { user }));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  res.status(200).json(new ApiResponse(200, { user }, "Email verified"));
});

export const updateEmailPreferences = asyncHandler(async (req, res) => {
  const user = await authService.updateEmailPreferences(req.user.id, req.body);
  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Email preferences updated"));
});
