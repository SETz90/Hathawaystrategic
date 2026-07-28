import { z } from "zod";

const statusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]);
const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  order: z.number().int().min(0).optional(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  order: z.number().int().min(0).optional(),
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
