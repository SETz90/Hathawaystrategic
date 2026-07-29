/* =========================================================
   HATHAWAY STRATEGIC — SERVICE WORKER
   Scope is the site root ("/"), so a subscription made from
   either dashboard keeps working no matter which page is open
   (or none) when a push arrives. Only handles push delivery +
   click routing — it does not cache or intercept fetch(), so it
   won't interfere with normal page loading or the API calls
   made from api-client.js.
   ========================================================= */

const DEFAULT_TITLE = "Hathaway Strategic";
const DEFAULT_URL = "/client-dashboard.html#notifications";

self.addEventListener("install", () => {
  // Activate this version immediately instead of waiting for old tabs
  // to close, so a redeployed worker starts handling push right away.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || DEFAULT_TITLE;
  const options = {
    body: payload.body || "You have a new notification.",
    icon: payload.icon || undefined,
    badge: payload.badge || undefined,
    tag: payload.tag || undefined,
    data: {
      url: payload.url || DEFAULT_URL,
      notificationId: payload.notificationId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || DEFAULT_URL,
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // If Hathaway Strategic is already open in some tab, focus it and
      // navigate that tab instead of piling up a new one.
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(targetUrl);
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
