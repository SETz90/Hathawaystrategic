import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const emailPreferencesSchema = z
  .object({
    messages: z.boolean().optional(),
    files: z.boolean().optional(),
    projectUpdates: z.boolean().optional(),
    projectCompleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one preference to update",
  });

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data;
  next();
};
