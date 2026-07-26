/* =========================================================
   HATHAWAY STRATEGIC — AUTH CLIENT
   Shared across every page. Handles:
   - Access token kept in memory only (never localStorage —
     an XSS payload can read localStorage but not a closure
     variable in another script's scope).
   - Silent refresh via httpOnly cookie on page load, so a
     reload doesn't force a re-login.
   - A single in-flight refresh promise so concurrent 401s
     don't fire N parallel refresh requests.
   - apiFetch(): drop-in fetch wrapper that attaches the
     access token and retries once after a silent refresh
     if the server returns 401.
   ========================================================= */

const AUTH_API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000/api/auth"
    : "https://api.hathawaystrategic.com/api/auth";

let accessToken = null;
let currentUser = null;
let refreshPromise = null;

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

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function rawRequest(path, options = {}) {
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    credentials: "include", // send/receive the httpOnly refresh cookie
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const body = await parseJsonSafe(res);
  return { res, body };
}

/**
 * Attempts to get a fresh access token using the refresh cookie.
 * Deduplicated: if a refresh is already in flight, callers await the same promise.
 */
async function silentRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { res, body } = await rawRequest("/refresh", { method: "POST" });
      if (!res.ok) {
        accessToken = null;
        currentUser = null;
        notifyAuthChange();
        return false;
      }
      accessToken = body.data.accessToken;
      currentUser = body.data.user;
      notifyAuthChange();
      return true;
    } catch {
      accessToken = null;
      currentUser = null;
      notifyAuthChange();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Public fetch wrapper for calling the API (auth or otherwise, once other
 * modules like CMS/CRM come online). Attaches the access token, and on a
 * 401 tries exactly one silent refresh + retry before giving up.
 */
export async function apiFetch(url, options = {}) {
  const doFetch = () =>
    fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...options,
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }

  return res;
}

export async function register({ email, password, firstName, lastName }) {
  const { res, body } = await rawRequest("/register", {
    method: "POST",
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  if (!res.ok)
    throw new AuthError(body?.message || "Registration failed", body?.details);

  accessToken = body.data.accessToken;
  currentUser = body.data.user;
  notifyAuthChange();
  return currentUser;
}

export async function login({ email, password }) {
  const { res, body } = await rawRequest("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok)
    throw new AuthError(body?.message || "Login failed", body?.details);

  accessToken = body.data.accessToken;
  currentUser = body.data.user;
  notifyAuthChange();
  return currentUser;
}

export async function logout() {
  try {
    await rawRequest("/logout", { method: "POST" });
  } finally {
    accessToken = null;
    currentUser = null;
    notifyAuthChange();
  }
}

export async function forgotPassword(email) {
  const { res, body } = await rawRequest("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!res.ok)
    throw new AuthError(body?.message || "Request failed", body?.details);
}

export async function resetPassword(token, password) {
  const { res, body } = await rawRequest("/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok)
    throw new AuthError(body?.message || "Reset failed", body?.details);
}

export class AuthError extends Error {
  constructor(message, fieldErrors = null) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Call this once per page load (bottom of the file does it automatically).
 * Tries to silently restore a session from the refresh cookie so a page
 * reload doesn't look logged-out for a beat before flashing the real state.
 */
async function bootstrap() {
  await silentRefresh();
  document.dispatchEvent(
    new CustomEvent("auth:ready", { detail: { user: currentUser } }),
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

  if (document.readyState !== "loading" && accessToken !== null) {
    decide();
  } else {
    document.addEventListener("auth:ready", decide, { once: true });
  }
}
