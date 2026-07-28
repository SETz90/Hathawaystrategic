import { Router } from "express";
import * as controller from "./messages.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate, createMessageSchema } from "./messages.validation.js";

const router = Router();

router.use(requireAuth);

// Clients see only conversations for their own projects; admins see everything
// (optionally filtered by ?projectId= or ?clientId=)
router.get("/", controller.listConversations);
router.get("/:conversationId", controller.getMessages);

router.post("/", validate(createMessageSchema), controller.create);
router.patch("/:messageId/read", controller.markRead);
router.delete("/:messageId", requireRole("ADMIN"), controller.remove);

export default router;
