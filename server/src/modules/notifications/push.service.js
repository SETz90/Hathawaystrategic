import webpush from "web-push";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const LOGO_URL =
  "https://res.cloudinary.com/gmriwzco/image/upload/f_auto,q_auto/logo_gepp36";

/* ---------------------------------------------------------
   VAPID setup
   Push is an enhancement on top of the database notification
   system, not a replacement for it — if no keys are configured
   (e.g. local dev, or before an env var is set on Render), every
   function below just no-ops instead of throwing, and everything
   else (in-app bell, notification center) keeps working.
   --------------------------------------------------------- */
let vapidReady = false;
let warnedOnce = false;

const ensureVapid = () => {
  if (vapidReady) return true;

  const { publicKey, privateKey, subject } = env.vapid;
  if (!publicKey || !privateKey) {
    if (!warnedOnce) {
      console.warn(
        "[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — browser push notifications are disabled. " +
          "In-app notifications are unaffected. Generate a pair with `npx web-push generate-vapid-keys`.",
      );
      warnedOnce = true;
    }
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
};

export const isPushConfigured = () => ensureVapid();

export const getPublicVapidKey = () => env.vapid.publicKey || null;

/* ---------------------------------------------------------
   SUBSCRIPTION MANAGEMENT
   --------------------------------------------------------- */

export const saveSubscription = async (userId, subscription) => {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new ApiError(400, "Invalid push subscription payload");
  }

  // upsert on endpoint: re-subscribing the same browser (e.g. after a
  // permission reset) updates the row in place instead of duplicating it,
  // and re-parents it if it now belongs to a different logged-in user.
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });
};

export const removeSubscription = async (userId, endpoint) => {
  if (!endpoint) return 0;
  const { count } = await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return count;
};

const dropSubscription = async (id) => {
  await prisma.pushSubscription.delete({ where: { id } }).catch(() => {});
};

/* ---------------------------------------------------------
   SENDING
   Deliberately generic copy for notification types that can carry
   sensitive text in the database record (message previews, filenames) —
   the device notification / lock screen should never surface that,
   only the authenticated in-app notification center should.
   --------------------------------------------------------- */
const GENERIC_PUSH_BODY = {
  NEW_MESSAGE: "Your project has received a new message.",
  FILE_UPLOADED: "Your project has received a new asset.",
};

const pushBodyFor = (notification) =>
  GENERIC_PUSH_BODY[notification.type] || notification.message;

const dashboardUrlFor = (role, notification) => {
  const base = role === "ADMIN" ? "/admin-dashboard.html" : "/client-dashboard.html";
  return `${base}#notifications`;
};

const buildPayload = (notification, role) =>
  JSON.stringify({
    title: notification.title || "Hathaway Strategic",
    body: pushBodyFor(notification),
    icon: LOGO_URL,
    badge: LOGO_URL,
    url: dashboardUrlFor(role, notification),
    notificationId: notification.id || null,
    tag: notification.relatedEntityId || notification.type,
  });

const sendToSubscription = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
  } catch (err) {
    // 404/410 = the push service says this subscription is gone for good
    // (user revoked permission, cleared site data, uninstalled, etc).
    // Anything else is a transient/delivery error — log and move on rather
    // than letting one bad device block the others or the caller's flow.
    if (err.statusCode === 404 || err.statusCode === 410) {
      await dropSubscription(subscription.id);
    } else {
      console.error("[push] Failed to send notification:", err.message || err);
    }
  }
};

/**
 * Fire-and-forget: sends a push for one already-created database
 * notification to every device the user has subscribed. Never throws —
 * a push failure must never roll back or fail the action that triggered
 * the underlying notification (a sent message, an uploaded file, etc.).
 */
export const sendPushForNotification = async (userId, notification) => {
  if (!ensureVapid()) return;
  if (!notification) return;

  try {
    const [subscriptions, user] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    if (!subscriptions.length) return;

    const payload = buildPayload(notification, user?.role);
    await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));
  } catch (err) {
    console.error("[push] sendPushForNotification failed:", err.message || err);
  }
};

/**
 * Same as above, batched for many recipients (e.g. notifyAdmins). Each
 * user's own subscriptions/role are looked up independently so this is
 * safe to call with a mixed list, even though today it's always admins.
 */
export const sendPushForNotifications = async (userIds = [], notification) => {
  if (!userIds.length) return;
  await Promise.all(userIds.map((userId) => sendPushForNotification(userId, notification)));
};
