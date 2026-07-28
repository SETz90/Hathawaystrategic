/* =========================================================
   HATHAWAY STRATEGIC — AUTH CLIENT
   Shared across every page. Owns only authentication concerns:
   login, register, logout, current-user state, and route guards.
   All networking (base URL, access token storage, refreshSession,
   apiFetch) lives in api-client.js and is imported, not duplicated.
   ========================================================= */

import {
  apiFetch,
  refreshSession,
  getAccessToken,
  clearAccessToken,
  ApiError,
} from "./api-client.js";

const REMEMBER_KEY = "hathaway_remember";
const SESSION_ACTIVE_KEY = "hathaway_session_active";

let currentUser = null;

const listeners = new Set();

function notifyAuthChange() {
  listeners.forEach((cb) =>
    cb({ user: currentUser, isAuthenticated: !!currentUser }),
  );
}

/** Subscribe to auth state changes (e.g. to update nav UI). Returns an unsubscribe fn. */
export function onAuthChange(callback) {
  listeners.add(callback);
  // Fire immediately with current state so late subscribers don't miss it
  callback({ user: currentUser, isAuthenticated: !!currentUser });
  return () => listeners.delete(callback);
}

export function getCurrentUser() {
  return currentUser;
}

export function isAuthenticated() {
  return !!currentUser;
}

export class AuthError extends Error {
  constructor(message, fieldErrors = null) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

function toAuthError(err) {
  if (err instanceof ApiError) {
    return new AuthError(err.message, err.fieldErrors);
  }
  return new AuthError(
    err?.message || "Something went wrong. Please try again.",
  );
}

/**
 * Attempts to restore a session using the refresh cookie via the shared
 * networking layer. Deduplicated at the api-client level, so concurrent
 * callers here just await the same underlying promise.
 */
async function silentRefresh() {
  const { ok, user } = await refreshSession();
  currentUser = ok ? user : null;
  notifyAuthChange();
  return ok;
}

export async function register({
  email,
  password,
  firstName,
  lastName,
  rememberMe = false,
}) {
  let body;
  try {
    body = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  } catch (err) {
    throw toAuthError(err);
  }

  currentUser = body.data.user;

  if (rememberMe) {
    localStorage.setItem(REMEMBER_KEY, "1");
  }
  sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");

  notifyAuthChange();
  return currentUser;
}

export async function login({ email, password, rememberMe = false }) {
  let body;
  try {
    body = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    throw toAuthError(err);
  }

  currentUser = body.data.user;

  if (rememberMe) {
    localStorage.setItem(REMEMBER_KEY, "1");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
  sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");

  notifyAuthChange();
  return currentUser;
}

export async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort — clear local state regardless of network outcome
  } finally {
    clearAccessToken();
    currentUser = null;

    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);

    notifyAuthChange();

    document.dispatchEvent(
      new CustomEvent("auth:ready", { detail: { user: null } }),
    );
  }
}

export async function forgotPassword(email) {
  try {
    await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function resetPassword(token, password) {
  try {
    await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  } catch (err) {
    throw toAuthError(err);
  }
}

export async function fetchCurrentUser() {
  let body;
  try {
    body = await apiFetch("/api/auth/me");
  } catch (err) {
    throw toAuthError(err);
  }
  currentUser = body.data.user;
  notifyAuthChange();
  return currentUser;
}

/**
 * Call this once per page load (bottom of the file does it automatically).
 * Tries to silently restore a session from the refresh cookie so a page
 * reload doesn't look logged-out for a beat before flashing the real state.
 */
async function bootstrap() {
  const refreshed = await silentRefresh();

  if (!refreshed) {
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  }

  document.dispatchEvent(
    new CustomEvent("auth:ready", {
      detail: { user: currentUser },
    }),
  );
}
bootstrap();

/**
 * Guard for protected pages. Usage at the top of a protected page's own
 * script block:
 *
 *   import { requireAuthOrRedirect } from "./auth-client.js";
 *   requireAuthOrRedirect({ role: "CLIENT" }); // role optional
 *
 * Waits for the silent-refresh bootstrap to finish before deciding,
 * so it doesn't redirect a valid session away just because the refresh
 * request hadn't resolved yet.
 */
export function requireAuthOrRedirect({
  role,
  redirectTo = "login.html",
} = {}) {
  const decide = () => {
    if (!currentUser) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `${redirectTo}?next=${next}`;
      return;
    }
    if (role && currentUser.role !== role) {
      window.location.href = "index.html";
    }
  };

  if (document.readyState !== "loading" && getAccessToken() !== null) {
    decide();
  } else {
    document.addEventListener("auth:ready", decide, { once: true });
  }
}
