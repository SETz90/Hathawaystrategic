/* =========================================================
   HATHAWAY STRATEGIC — API CLIENT (lowest layer)
   Owns: the in-memory access token, the generic fetch wrapper,
   and token refresh. Nothing here knows about "users" or UI —
   that's auth-client.js's job. Kept separate so any future
   module (CMS, CRM, projects...) can reuse apiFetch() without
   pulling in auth-page-specific code.
   ========================================================= */

export const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://hathawaystrategic.onrender.com";

export class ApiError extends Error {
  constructor(message, status, fieldErrors = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Access token lives in a closure variable only — never localStorage/sessionStorage.
// An XSS payload can read storage APIs but not this module's private scope.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function buildHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

/**
 * Hits POST /auth/refresh using the httpOnly refresh cookie.
 * On success, updates the in-memory access token and broadcasts the
 * refreshed user via a DOM event — auth-client.js listens for this so
 * api-client.js never has to import auth-client.js (no circular deps).
 */
let refreshPromise = null;

export async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
      });
      const body = await parseJsonSafe(res);

      if (!res.ok) {
        clearAccessToken();
        document.dispatchEvent(
          new CustomEvent("hathaway:auth-changed", { detail: { user: null } }),
        );
        return { ok: false, user: null };
      }

      setAccessToken(body.data.accessToken);
      document.dispatchEvent(
        new CustomEvent("hathaway:auth-changed", {
          detail: { user: body.data.user },
        }),
      );
      return { ok: true, user: body.data.user };
    } catch {
      clearAccessToken();
      document.dispatchEvent(
        new CustomEvent("hathaway:auth-changed", { detail: { user: null } }),
      );
      return { ok: false, user: null };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Generic authenticated fetch. Attaches the access token, parses JSON,
 * throws ApiError on failure, and — for any endpoint other than the auth
 * endpoints themselves — retries exactly once after a silent refresh if
 * the server returns 401. This is what every future module (projects,
 * files, invoices...) should call instead of raw fetch().
 */
export async function apiFetch(path, options = {}) {
  const isAuthEndpoint = path.startsWith("/auth/");
  const url = `${API_BASE}${path}`;

  const doFetch = () =>
    fetch(url, {
      credentials: "include",
      headers: buildHeaders(options.headers),
      ...options,
    });

  let res = await doFetch();

  if (res.status === 401 && !isAuthEndpoint) {
    const { ok } = await refreshSession();
    if (ok) res = await doFetch();
  }

  const body = await parseJsonSafe(res);

  if (!res.ok) {
    throw new ApiError(
      body?.message || "Something went wrong. Please try again.",
      res.status,
      body?.details || null,
    );
  }

  return body;
}
