import { Router } from "express";
import * as controller from "./notifications.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

// Notifications are always personal — no role restriction here beyond
// being logged in; ownership is enforced per-row in the service layer.
router.use(requireAuth);

router.get("/", controller.list);
router.get("/unread", controller.unreadCount);
router.get("/vapid-key", controller.vapidPublicKey);

router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);

router.post("/subscribe", controller.subscribe);
router.delete("/unsubscribe", controller.unsubscribe);

router.delete("/", controller.clearAll);
router.delete("/:id", controller.remove);

export default router;
