import { z } from "zod";

export const createMessageSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().min(1).max(4000),
  attachmentId: z.string().min(1).optional(),
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
