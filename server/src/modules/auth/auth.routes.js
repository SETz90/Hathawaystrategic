import { Router } from "express";
import * as controller from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  emailPreferencesSchema,
} from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  controller.register,
);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword,
);
router.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  controller.verifyEmail,
);
router.get("/me", requireAuth, controller.me);
router.patch(
  "/email-preferences",
  requireAuth,
  validate(emailPreferencesSchema),
  controller.updateEmailPreferences,
);

export default router;
