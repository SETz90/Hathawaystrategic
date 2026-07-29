/* =========================================================
   HATHAWAY STRATEGIC — BROWSER PUSH NOTIFICATIONS
   Talks to /api/notifications/{vapid-key,subscribe,unsubscribe}
   via the shared apiFetch() layer (same pattern as notifications.js).
   Registers /service-worker.js at the site root and manages the
   PushManager subscription. This is an enhancement layered on top
   of the existing database notification system — nothing here is
   required for the in-app bell/dropdown/center to keep working.

   Expects (optional, wired by initPushSettingsToggle()):
   #pushNotifToggleBtn, #pushNotifStatus
   ========================================================= */

import { apiFetch, ApiError } from "./api-client.js";

const SERVICE_WORKER_URL = "/service-worker.js";

function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// PushManager.subscribe() wants the VAPID public key as a Uint8Array,
// but the server hands it over as a URL-safe base64 string.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let registrationPromise = null;

async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: "/" })
      .catch((err) => {
        console.error("Failed to register service worker:", err);
        registrationPromise = null;
        return null;
      });
  }
  return registrationPromise;
}

/**
 * Current state, for deciding what the settings UI should show:
 * "unsupported" | "denied" | "subscribed" | "available"
 */
export async function getPushState() {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  if (Notification.permission === "granted") {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL).catch(() => null);
    const subscription = await registration?.pushManager.getSubscription().catch(() => null);
    if (subscription) return "subscribed";
  }

  return "available";
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };
  }

  try {
    const { data } = await apiFetch("/api/notifications/vapid-key");
    if (!data?.publicKey) {
      // Server has no VAPID keys configured — nothing to subscribe to.
      return { ok: false, reason: "unconfigured" };
    }

    const registration = await registerServiceWorker();
    if (!registration) return { ok: false, reason: "unsupported" };

    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await apiFetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription.toJSON()),
    });

    return { ok: true };
  } catch (err) {
    console.error("Failed to enable push notifications:", err instanceof ApiError ? err.message : err);
    return { ok: false, reason: "error" };
  }
}

export async function disablePushNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL).catch(() => null);
    const subscription = await registration?.pushManager.getSubscription().catch(() => null);

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      await apiFetch("/api/notifications/unsubscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return { ok: true };
  } catch (err) {
    console.error("Failed to disable push notifications:", err instanceof ApiError ? err.message : err);
    return { ok: false };
  }
}

/* ---------------------------------------------------------
   SETTINGS UI
   A single button that toggles between "Allow Notifications" and
   "Notifications Enabled" (click to turn off), plus a status line
   for the unsupported/blocked cases the spec calls out.
   --------------------------------------------------------- */

const STATUS_COPY = {
  unsupported: "Your browser doesn't support push notifications.",
  denied: "Notifications are blocked. Enable them in your browser's site settings to turn this on.",
  subscribed: "Browser notifications are on for this device.",
  available: "Get notified on this device even when Hathaway Strategic isn't open.",
};

async function renderPushToggle(button, statusEl) {
  const state = await getPushState();

  if (statusEl) statusEl.textContent = STATUS_COPY[state] || "";

  if (state === "unsupported" || state === "denied") {
    button.disabled = state === "unsupported";
    button.textContent = "Allow Notifications";
    button.classList.remove("is-active");
    return;
  }

  if (state === "subscribed") {
    button.disabled = false;
    button.textContent = "Disable Notifications";
    button.classList.add("is-active");
    return;
  }

  button.disabled = false;
  button.textContent = "Allow Notifications";
  button.classList.remove("is-active");
}

export function initPushSettingsToggle() {
  const button = document.getElementById("pushNotifToggleBtn");
  const statusEl = document.getElementById("pushNotifStatus");
  if (!button) return;

  renderPushToggle(button, statusEl);

  button.addEventListener("click", async () => {
    button.disabled = true;
    const wasEnabled = button.classList.contains("is-active");

    const result = wasEnabled ? await disablePushNotifications() : await enablePushNotifications();

    if (!result.ok && statusEl && !wasEnabled) {
      statusEl.textContent =
        result.reason === "denied"
          ? STATUS_COPY.denied
          : result.reason === "unsupported"
            ? STATUS_COPY.unsupported
            : result.reason === "unconfigured"
              ? "Notifications aren't set up on this server yet."
              : "Couldn't enable notifications. Please try again.";
    }

    await renderPushToggle(button, statusEl);
  });
}
