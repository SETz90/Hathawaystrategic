/* =========================================================
   HATHAWAY STRATEGIC — ROUTE GUARDS
   Works with the current auth-client.js

   requireAuth()              -> Protect dashboard pages
   redirectIfAuthenticated()  -> Redirect logged-in users away
                                 from login/register pages
   ========================================================= */

import {
  requireAuthOrRedirect,
  getCurrentUser,
  isAuthenticated,
} from "./auth-client.js";

function dashboardPathForRole(role) {
  return role === "ADMIN" ? "admin-dashboard.html" : "client-dashboard.html";
}

function safeNextUrl(fallback = "client-dashboard.html") {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  // Only allow same-origin relative paths
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}

/**
 * Protects pages that require authentication.
 */
export function requireAuth({ role, onReady } = {}) {
  requireAuthOrRedirect({ role });

  const run = () => {
    const user = getCurrentUser();

    if (user) {
      onReady?.(user);
    }
  };

  // User already available
  if (isAuthenticated()) {
    run();
    return;
  }

  // Wait for auth bootstrap
  document.addEventListener("auth:ready", run, { once: true });
}

/**
 * Redirect logged-in users away from login/register pages, sending each
 * role to its own dashboard (unless a same-origin ?next= override is set).
 */
export function redirectIfAuthenticated() {
  const redirect = () => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      window.location.href = safeNextUrl(dashboardPathForRole(user?.role));
    }
  };

  if (isAuthenticated()) {
    redirect();
  } else {
    document.addEventListener("auth:ready", redirect, { once: true });
  }
}

export { safeNextUrl as getNextUrl, dashboardPathForRole };
