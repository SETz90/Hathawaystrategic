import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as notificationsService from "./notifications.service.js";
import * as pushService from "./push.service.js";

const VALID_FILTERS = new Set(["all", "unread", "messages", "projects", "files"]);

export const list = asyncHandler(async (req, res) => {
  const filter = VALID_FILTERS.has(req.query.filter) ? req.query.filter : "all";
  const notifications = await notificationsService.listForUser(req.user.id, { filter });
  res.status(200).json(new ApiResponse(200, { notifications }));
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationsService.getUnreadCount(req.user.id);
  res.status(200).json(new ApiResponse(200, { count }));
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationsService.markRead(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, { notification }, "Notification marked as read"));
});

export const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationsService.markAllRead(req.user.id);
  res.status(200).json(new ApiResponse(200, { count }, "All notifications marked as read"));
});

export const remove = asyncHandler(async (req, res) => {
  await notificationsService.remove(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, "Notification deleted"));
});

export const clearAll = asyncHandler(async (req, res) => {
  const count = await notificationsService.clearAllForUser(req.user.id);
  res.status(200).json(new ApiResponse(200, { count }, "All notifications cleared"));
});

/* ---------------------------------------------------------
   BROWSER PUSH (Phase 3.5.1)
   --------------------------------------------------------- */

export const vapidPublicKey = asyncHandler(async (req, res) => {
  const key = pushService.getPublicVapidKey();
  res.status(200).json(new ApiResponse(200, { publicKey: key, configured: !!key }));
});

// requireAuth already guarantees req.user is the authenticated caller, so a
// subscription is always saved under the id from the verified token — there
// is no userId in the request body a client could use to subscribe someone else.
export const subscribe = asyncHandler(async (req, res) => {
  await pushService.saveSubscription(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, null, "Push subscription saved"));
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await pushService.removeSubscription(req.user.id, req.body?.endpoint);
  res.status(200).json(new ApiResponse(200, null, "Push subscription removed"));
});
