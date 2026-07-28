/* =========================================================
   HATHAWAY STRATEGIC — API CLIENT (networking layer)
   Single source of truth for: API_BASE_URL, the in-memory
   access token, refreshSession(), and apiFetch(). Nothing here
   knows about "users", forms, or UI — that's auth-client.js's
   job, and it imports this module rather than duplicating any
   of it. Every future module (Projects, Files, Messaging...)
   should call apiFetch() from here too.
   ========================================================= */

export const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `http://${window.location.hostname}:4000`
    : "https://hathawaystrategic.onrender.com";

// Credential endpoints where a 401 means "this request itself failed" —
// retrying after a silent refresh would be meaningless (e.g. a bad
// login) or would recurse (refresh calling refresh). Any other path,
// including /api/auth/me, gets the refresh-and-retry treatment.
const NO_RETRY_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    // Alias kept for callers (e.g. registration form) that read fieldErrors
    this.fieldErrors = details;
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
 * Hits POST /api/auth/refresh using the httpOnly refresh cookie and
 * updates the in-memory access token. Broadcasts the result via a DOM
 * event so any interested UI (nav, dashboard) can react without every
 * module needing a direct import of auth-client.js.
 */
let refreshPromise = null;

export async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
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
 * throws ApiError on failure, and — for any endpoint other than the
 * credential endpoints themselves — retries exactly once after a silent
 * refresh if the server returns 401. This is what every module (auth,
 * projects, files, invoices...) should call instead of raw fetch().
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const doFetch = () => {
    const headers = buildHeaders(options.headers);
    // Let the browser set "multipart/form-data; boundary=..." itself
    if (isFormData) delete headers["Content-Type"];

    return fetch(url, {
      credentials: "include",
      ...options,
      headers,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !NO_RETRY_PATHS.has(path)) {
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
