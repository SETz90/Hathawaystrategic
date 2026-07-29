import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendPushForNotification, sendPushForNotifications } from "./push.service.js";

// Maps the frontend's "category" filter tabs (Messages/Projects/Files) onto
// the underlying NotificationType values so new types just need one entry
// added here, not a frontend rewrite.
const CATEGORY_TYPES = {
  messages: ["NEW_MESSAGE"],
  projects: ["PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_STATUS_CHANGED", "TASK_ASSIGNED", "DEADLINE_REMINDER"],
  files: ["FILE_UPLOADED"],
};

export const listForUser = async (userId, { filter } = {}) => {
  const where = { userId };

  if (filter === "unread") {
    where.isRead = false;
  } else if (CATEGORY_TYPES[filter]) {
    where.type = { in: CATEGORY_TYPES[filter] };
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

export const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return count;
};

export const markRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, "Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllRead = async (userId) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return count;
};

export const remove = async (userId, notificationId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, "Notification not found");
  }
  await prisma.notification.delete({ where: { id: notificationId } });
};

export const clearAllForUser = async (userId) => {
  const { count } = await prisma.notification.deleteMany({ where: { userId } });
  return count;
};

/* ---------------------------------------------------------
   TRIGGER HELPERS
   Imported by other modules (messages, files, projects) to fire
   notifications on the events they own. Kept here — not duplicated
   into each module — so notification shape/rules change in one place.
   Never throw: a failed notification should never fail the action
   that triggered it (a sent message, an uploaded file, etc.).
   --------------------------------------------------------- */

export const notifyUser = async ({ userId, type, title, message, relatedEntityType, relatedEntityId }) => {
  let notification;
  try {
    notification = await prisma.notification.create({
      data: { userId, type, title, message, relatedEntityType, relatedEntityId },
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }

  // Database row is the source of truth and is already committed above;
  // push is a best-effort side channel, so it's fired after and never
  // awaited into the caller's error path.
  sendPushForNotification(userId, notification).catch((err) =>
    console.error("Failed to send push notification:", err),
  );

  return notification;
};

export const notifyUsers = async (userIds, { type, title, message, relatedEntityType, relatedEntityId }) => {
  if (!userIds.length) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
      })),
    });
  } catch (err) {
    console.error("Failed to create notifications:", err);
    return;
  }

  // createMany() doesn't return the created rows/ids, and push doesn't need
  // them — every recipient gets the same title/body, only the per-user
  // subscriptions and role (looked up in push.service) differ.
  sendPushForNotifications(userIds, { type, title, message, relatedEntityType, relatedEntityId }).catch((err) =>
    console.error("Failed to send push notifications:", err),
  );
};

export const notifyAdmins = async (payload, { excludeUserId } = {}) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  await notifyUsers(admins.map((a) => a.id), payload);
};
