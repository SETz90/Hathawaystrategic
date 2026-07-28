import { Router } from "express";
import * as controller from "./projects.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import {
  validate,
  createProjectSchema,
  updateProjectSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from "./projects.validation.js";

const router = Router();

router.use(requireAuth);

// Clients see their own projects; admins see everything (optionally filtered by ?clientId=)
router.get("/", controller.list);
router.get("/:id", controller.getOne);

router.post("/", requireRole("ADMIN"), validate(createProjectSchema), controller.create);
router.patch("/:id", requireRole("ADMIN"), validate(updateProjectSchema), controller.update);
router.delete("/:id", requireRole("ADMIN"), controller.remove);

router.post(
  "/:id/milestones",
  requireRole("ADMIN"),
  validate(createMilestoneSchema),
  controller.addMilestone,
);
// Clients may toggle their own milestone's "completed" flag; admins may edit fully
router.patch(
  "/:id/milestones/:milestoneId",
  validate(updateMilestoneSchema),
  controller.updateMilestone,
);
router.delete(
  "/:id/milestones/:milestoneId",
  requireRole("ADMIN"),
  controller.removeMilestone,
);

export default router;
