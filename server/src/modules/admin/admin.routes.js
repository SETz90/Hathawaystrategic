import { Router } from "express";
import * as controller from "./admin.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/overview", controller.overview);

export default router;
