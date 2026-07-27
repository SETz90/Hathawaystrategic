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

function safeNextUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  // Only allow same-origin relative paths
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "client-dashboard.html";
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
 * Redirect logged-in users away from login/register pages.
 */
export function redirectIfAuthenticated() {
  const redirect = () => {
    if (isAuthenticated()) {
      window.location.href = safeNextUrl();
    }
  };

  if (isAuthenticated()) {
    redirect();
  } else {
    document.addEventListener("auth:ready", redirect, { once: true });
  }
}

export { safeNextUrl as getNextUrl };
