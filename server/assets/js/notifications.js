/* =========================================================
   HATHAWAY STRATEGIC — NOTIFICATIONS (shared)
   Talks to /api/notifications via the shared apiFetch() layer.
   Imported by both dashboard.js (CLIENT) and admin-dashboard.js
   (ADMIN) — the bell, dropdown, and notification-center markup
   use the same element ids on both pages, so this one module
   drives both without knowing which role it's running under.

   Architecture note (for Phase 3.6+): every read here goes through
   fetchNotifications()/fetchUnreadCount(), and updates are driven by
   startNotificationPolling(). Swapping polling for a WebSocket or SSE
   subscription later only means replacing the body of
   startNotificationPolling() — callers (initNotificationBell(),
   initNotificationCenter()) don't change.
   ========================================================= */

import { apiFetch, ApiError } from "./api-client.js";

const TYPE_ICONS = {
  NEW_MESSAGE: "chat_bubble",
  FILE_UPLOADED: "upload_file",
  PROJECT_CREATED: "work",
  PROJECT_UPDATED: "work",
  PROJECT_STATUS_CHANGED: "sync_alt",
  TASK_ASSIGNED: "assignment_ind",
  DEADLINE_REMINDER: "schedule",
  SYSTEM_ALERT: "warning",
};

const CATEGORY_LABELS = {
  all: "All",
  unread: "Unread",
  messages: "Messages",
  projects: "Projects",
  files: "Files",
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function notificationIcon(type) {
  return TYPE_ICONS[type] || "notifications";
}

function formatRelativeTime(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------------------------------------------------
   API
   --------------------------------------------------------- */

export async function fetchNotifications(filter = "all") {
  const { data } = await apiFetch(`/api/notifications?filter=${encodeURIComponent(filter)}`);
  return data.notifications || [];
}

export async function fetchUnreadCount() {
  const { data } = await apiFetch("/api/notifications/unread");
  return data.count || 0;
}

export async function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "PATCH" });
}

export async function deleteNotification(id) {
  return apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
}

export async function clearAllNotifications() {
  return apiFetch("/api/notifications", { method: "DELETE" });
}

/* ---------------------------------------------------------
   RENDERING
   --------------------------------------------------------- */

function notificationRow(n, { compact = false } = {}) {
  return `
    <div class="notif-row ${n.isRead ? "" : "is-unread"}" data-notif-id="${n.id}">
      <div class="notif-row-icon">
        <span class="material-symbols-outlined">${notificationIcon(n.type)}</span>
      </div>
      <div class="notif-row-body">
        <div class="notif-row-title">${escapeHtml(n.title)}</div>
        <div class="notif-row-message">${escapeHtml(n.message)}</div>
        <div class="notif-row-time">${formatRelativeTime(n.createdAt)}</div>
      </div>
      <div class="notif-row-actions">
        ${!n.isRead ? `<button type="button" class="notif-action-btn" data-notif-mark-read title="Mark as read"><span class="material-symbols-outlined">done</span></button>` : ""}
        ${!compact ? `<button type="button" class="notif-action-btn" data-notif-delete title="Delete"><span class="material-symbols-outlined">close</span></button>` : ""}
      </div>
    </div>`;
}

function emptyNotifState(filter) {
  const label = filter === "all" ? "" : ` ${CATEGORY_LABELS[filter]?.toLowerCase() || ""}`;
  return `
    <div class="dash-empty-state" style="padding: 2rem 1rem">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">notifications</span></div>
      <h3>You're all caught up</h3>
      <p>No${label} notifications right now.</p>
    </div>`;
}

function errorNotifState() {
  return `
    <div class="dash-empty-state" style="padding: 2rem 1rem">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
      <h3>Couldn't load notifications</h3>
    </div>`;
}

/* ---------------------------------------------------------
   BELL + DROPDOWN
   Expects: #notifBellButton, #notifBellBadge, #notifDropdown,
   #notifDropdownList, #notifDropdownViewAll
   --------------------------------------------------------- */

async function refreshBadge() {
  const badge = document.getElementById("notifBellBadge");
  if (!badge) return;
  try {
    const count = await fetchUnreadCount();
    badge.textContent = count > 9 ? "9+" : String(count);
    badge.style.display = count > 0 ? "flex" : "none";
  } catch (err) {
    console.error("Failed to load unread count:", err instanceof ApiError ? err.message : err);
  }
}

async function refreshDropdown() {
  const list = document.getElementById("notifDropdownList");
  if (!list) return;
  try {
    const notifications = (await fetchNotifications("all")).slice(0, 6);
    list.innerHTML = notifications.length
      ? notifications.map((n) => notificationRow(n, { compact: true })).join("")
      : emptyNotifState("all");
  } catch (err) {
    console.error("Failed to load notifications:", err instanceof ApiError ? err.message : err);
    list.innerHTML = errorNotifState();
  }
}

export function initNotificationBell() {
  const button = document.getElementById("notifBellButton");
  const dropdown = document.getElementById("notifDropdown");
  const viewAll = document.getElementById("notifDropdownViewAll");
  if (!button || !dropdown) return;

  refreshBadge();

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("is-open");
    if (isOpen) refreshDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.classList.contains("is-open")) return;
    if (dropdown.contains(e.target) || button.contains(e.target)) return;
    dropdown.classList.remove("is-open");
  });

  dropdown.addEventListener("click", async (e) => {
    const markBtn = e.target.closest("[data-notif-mark-read]");
    const row = e.target.closest("[data-notif-id]");
    if (!row) return;

    if (markBtn) {
      try {
        await markNotificationRead(row.dataset.notifId);
        row.classList.remove("is-unread");
        markBtn.remove();
        refreshBadge();
      } catch (err) {
        console.error("Failed to mark notification read:", err instanceof ApiError ? err.message : err);
      }
    }
  });

  viewAll?.addEventListener("click", (e) => {
    e.preventDefault();
    dropdown.classList.remove("is-open");
    document.querySelector('[data-dash-nav="notifications"]')?.click();
  });
}

/* ---------------------------------------------------------
   NOTIFICATION CENTER (full section)
   Expects: #notificationsContainer, #notifFilterTabs
   (buttons with data-notif-filter), #notifMarkAllReadBtn,
   #notifClearAllBtn
   --------------------------------------------------------- */

let activeNotifFilter = "all";

export async function loadNotificationCenter(filter = activeNotifFilter) {
  activeNotifFilter = filter;
  const container = document.getElementById("notificationsContainer");
  if (!container) return;

  document.querySelectorAll("[data-notif-filter]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.notifFilter === filter);
  });

  try {
    const notifications = await fetchNotifications(filter);
    container.innerHTML = notifications.length
      ? notifications.map((n) => notificationRow(n)).join("")
      : emptyNotifState(filter);
  } catch (err) {
    console.error("Failed to load notifications:", err instanceof ApiError ? err.message : err);
    container.innerHTML = errorNotifState();
  }
}

export function initNotificationCenter() {
  const container = document.getElementById("notificationsContainer");
  const tabs = document.getElementById("notifFilterTabs");
  const markAllBtn = document.getElementById("notifMarkAllReadBtn");
  const clearAllBtn = document.getElementById("notifClearAllBtn");
  if (!container) return;

  tabs?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-notif-filter]");
    if (!btn) return;
    loadNotificationCenter(btn.dataset.notifFilter);
  });

  container.addEventListener("click", async (e) => {
    const row = e.target.closest("[data-notif-id]");
    if (!row) return;
    const id = row.dataset.notifId;

    if (e.target.closest("[data-notif-mark-read]")) {
      try {
        await markNotificationRead(id);
        await loadNotificationCenter();
        refreshBadge();
      } catch (err) {
        console.error("Failed to mark notification read:", err instanceof ApiError ? err.message : err);
      }
    } else if (e.target.closest("[data-notif-delete]")) {
      try {
        await deleteNotification(id);
        await loadNotificationCenter();
        refreshBadge();
      } catch (err) {
        console.error("Failed to delete notification:", err instanceof ApiError ? err.message : err);
      }
    }
  });

  markAllBtn?.addEventListener("click", async () => {
    try {
      await markAllNotificationsRead();
      await loadNotificationCenter();
      refreshBadge();
    } catch (err) {
      console.error("Failed to mark all as read:", err instanceof ApiError ? err.message : err);
    }
  });

  clearAllBtn?.addEventListener("click", async () => {
    if (!confirm("Clear all notifications? This cannot be undone.")) return;
    try {
      await clearAllNotifications();
      await loadNotificationCenter();
      refreshBadge();
    } catch (err) {
      console.error("Failed to clear notifications:", err instanceof ApiError ? err.message : err);
    }
  });
}

/* ---------------------------------------------------------
   POLLING
   Every 10s: always refresh the bell badge (cheap); also refresh
   the dropdown or notification center if either is currently open,
   so unread counts and lists stay live without a page reload.
   --------------------------------------------------------- */
export function startNotificationPolling() {
  setInterval(() => {
    refreshBadge();

    const dropdown = document.getElementById("notifDropdown");
    if (dropdown?.classList.contains("is-open")) refreshDropdown();

    const notifSection = document.querySelector('[data-dash-section="notifications"]');
    if (notifSection?.classList.contains("is-active")) {
      loadNotificationCenter();
    }
  }, 10000);
}
