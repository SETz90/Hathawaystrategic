import { Router } from "express";
import * as controller from "./clients.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateQuery, listClientsQuerySchema } from "./clients.validation.js";

const router = Router();

// Entire module is admin-only — this is CRM tooling for the Hathaway Strategic team
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", validateQuery(listClientsQuerySchema), controller.list);
router.get("/:id", controller.getOne);

router.patch("/:id/activate", controller.activate);
router.patch("/:id/deactivate", controller.deactivate);
router.patch("/:id/restore", controller.restore);
router.delete("/:id", controller.remove);

export default router;
