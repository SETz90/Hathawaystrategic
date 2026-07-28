import { z } from "zod";

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "ALL"]).optional(),
});

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
  }
  req.query = result.data;
  next();
};
