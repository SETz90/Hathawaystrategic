import { Router } from "express";
import * as controller from "./files.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate, createFileSchema } from "./files.validation.js";
import { uploadSingle } from "../../lib/uploadStorage.js";

const router = Router();

router.use(requireAuth);

// Clients see only files belonging to their own projects; admins see everything
// (optionally filtered by ?projectId=)
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.get("/:id/download", controller.download);

router.post("/", requireRole("ADMIN"), uploadSingle, validate(createFileSchema), controller.create);
router.delete("/:id", requireRole("ADMIN"), controller.remove);

export default router;
