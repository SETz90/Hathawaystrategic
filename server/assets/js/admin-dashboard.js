/* =========================================================
   HATHAWAY STRATEGIC — ADMIN DASHBOARD (CRM) LOGIC
   Page-specific script for admin-dashboard.html. Reuses the same
   networking layer (api-client.js) and auth layer (auth-client.js)
   as every other page — no duplicated fetch/token logic. Talks to
   the existing Projects/Files/Messages APIs plus the new
   /api/clients and /api/admin/overview endpoints.
   ========================================================= */

import { requireAuthOrRedirect, logout, getCurrentUser } from "./auth-client.js";
import { apiFetch, ApiError, API_BASE_URL, getAccessToken, refreshSession } from "./api-client.js";
import {
  initNotificationBell,
  initNotificationCenter,
  loadNotificationCenter,
  startNotificationPolling,
} from "./notifications.js";
import { initPushSettingsToggle } from "./push-notifications.js";

requireAuthOrRedirect({ role: "ADMIN" });

document.addEventListener(
  "auth:ready",
  () => {
    const user = getCurrentUser();
    if (!user) return;

    renderWelcomeCard(user);
    renderSettingsCard(user);

    loadOverview();
    loadClients().then(() => {
      populateClientPickers();
      loadProjects();
    });
    renderFilesUploadBar();
    loadFiles();
    loadConversations({ selectFirst: true });
    initMessageComposer();
    initConversationSearch();
    startMessagesPolling();
    initNotificationBell();
    initNotificationCenter();
    loadNotificationCenter();
    startNotificationPolling();
    initPushSettingsToggle();
    initEmailPreferences();

    initSectionNav();
    initMobileToggle();
    initLogout();
    initModals();
    initProjectForm();
    initClientFilters();
    initProjectFilter();
    initFileFilters();
    initDropzone();

    // A clicked push notification (from service-worker.js) lands on
    // admin-dashboard.html#notifications — open that section on load,
    // same as clicking the nav button by hand. Runs after initSectionNav()
    // so the nav buttons' click listeners already exist.
    openSectionFromHash();
  },
  { once: true },
);

/* ---------------------------------------------------------
   SHARED HELPERS
   --------------------------------------------------------- */
function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDateInputValue(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function initials(first, last) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

const STATUS_LABELS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

const FILE_ICONS = {
  "application/pdf": "picture_as_pdf",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "text/csv": "table_chart",
};
const iconFor = (mimeType) => FILE_ICONS[mimeType] || "description";

function logErr(label, err) {
  console.error(label, err instanceof ApiError ? err.message : err);
}

/* ---------------------------------------------------------
   MODALS
   --------------------------------------------------------- */
function openModal(id) {
  document.getElementById(id)?.classList.add("is-active");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("is-active");
}

function initModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".admin-modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("is-active");
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".admin-modal-overlay.is-active").forEach((o) => o.classList.remove("is-active"));
    }
  });
}

/* ---------------------------------------------------------
   WELCOME / SETTINGS
   --------------------------------------------------------- */
function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function renderWelcomeCard(user) {
  const nameEl = document.getElementById("dashUserName");
  const emailEl = document.getElementById("dashUserEmail");
  const avatarEl = document.getElementById("dashUserAvatar");
  const greetingEl = document.getElementById("dashGreeting");
  if (nameEl) nameEl.textContent = user.firstName;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = initials(user.firstName, user.lastName);
  if (greetingEl) greetingEl.textContent = timeOfDayGreeting();
}

function renderSettingsCard(user) {
  const fields = { settingsFirstName: user.firstName, settingsLastName: user.lastName, settingsEmail: user.email };
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  const joined = document.getElementById("settingsJoined");
  if (joined) joined.value = formatDate(new Date().toISOString()); // fallback until /me returns createdAt
  apiFetch("/api/auth/me")
    .then(({ data }) => {
      if (joined && data.user?.createdAt) joined.value = formatDate(data.user.createdAt);
      applyEmailPreferences(data.user?.emailPreferences);
    })
    .catch(() => {});
}

/* ---------------------------------------------------------
   EMAIL PREFERENCES (Phase 3.6)
   --------------------------------------------------------- */
function applyEmailPreferences(prefs = {}) {
  document.querySelectorAll("#emailPrefList input[data-email-pref]").forEach((input) => {
    const key = input.dataset.emailPref;
    input.checked = prefs[key] !== false; // default to on when unknown
  });
}

function initEmailPreferences() {
  const saveBtn = document.getElementById("emailPrefSaveBtn");
  const status = document.getElementById("emailPrefStatus");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const payload = {};
    document.querySelectorAll("#emailPrefList input[data-email-pref]").forEach((input) => {
      payload[input.dataset.emailPref] = input.checked;
    });

    saveBtn.disabled = true;
    const original = saveBtn.textContent;
    saveBtn.textContent = "Saving…";
    try {
      await apiFetch("/api/auth/email-preferences", { method: "PATCH", body: JSON.stringify(payload) });
      if (status) status.textContent = "Preferences saved.";
    } catch (err) {
      if (status) status.textContent = err.message || "Couldn't save preferences.";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = original;
      if (status) setTimeout(() => (status.textContent = ""), 3000);
    }
  });
}

/* ---------------------------------------------------------
   OVERVIEW
   --------------------------------------------------------- */
const KPI_LABELS = [
  ["clientsCount", "Clients", "group"],
  ["projectsCount", "Projects", "work"],
  ["activeProjectsCount", "Active Projects", "bolt"],
  ["completedProjectsCount", "Completed Projects", "task_alt"],
  ["filesCount", "Files Uploaded", "folder"],
  ["unreadMessagesCount", "Unread Messages", "chat_bubble"],
];

const ACTIVITY_ICONS = { file: "upload_file", message: "chat_bubble", project: "work" };

function activityRow(event) {
  return `
    <div class="admin-activity-row">
      <div class="admin-activity-icon">
        <span class="material-symbols-outlined">${ACTIVITY_ICONS[event.type] || "history"}</span>
      </div>
      <div>
        <div class="admin-activity-text">${escapeHtml(event.text)}</div>
        <div class="admin-activity-time">${formatDateTime(event.timestamp) || ""}</div>
      </div>
    </div>`;
}

async function loadOverview() {
  const grid = document.getElementById("overviewStatGrid");
  const activityContainer = document.getElementById("activityContainer");

  try {
    const { data } = await apiFetch("/api/admin/overview");
    const kpis = data.kpis || {};
    const activity = data.recentActivity || [];

    if (grid) {
      grid.innerHTML = KPI_LABELS.map(
        ([key, label, icon]) => `
        <div class="dash-card dash-stat-card">
          <div class="dash-stat-icon"><span class="material-symbols-outlined">${icon}</span></div>
          <span class="dash-stat-label">${label}</span>
          <span class="dash-stat-value">${kpis[key] ?? 0}</span>
        </div>`,
      ).join("");
    }

    if (activityContainer) {
      activityContainer.innerHTML = activity.length
        ? `<div class="admin-activity-list">${activity.map(activityRow).join("")}</div>`
        : `<div class="dash-empty-state">
             <div class="dash-empty-icon"><span class="material-symbols-outlined">history</span></div>
             <h3>Nothing here yet</h3>
             <p>Client activity — uploads, messages, and project updates — will show up here.</p>
           </div>`;
    }

    const unread = kpis.unreadMessagesCount || 0;
    const navBadge = document.getElementById("navUnreadCount");
    if (navBadge) {
      navBadge.textContent = unread;
      navBadge.style.display = unread > 0 ? "inline-block" : "none";
    }
  } catch (err) {
    logErr("Failed to load overview:", err);
    if (activityContainer) {
      activityContainer.innerHTML = `<div class="dash-empty-state">
        <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
        <h3>Couldn't load overview</h3>
        <p>Something went wrong on our end. Please refresh to try again.</p>
      </div>`;
    }
  }
}

/* ---------------------------------------------------------
   CLIENTS
   --------------------------------------------------------- */
let clientsCache = []; // last-loaded (filtered) client list, used by the table
let allClientsCache = []; // status=ALL snapshot, used for name lookups & pickers
let clientSearchDebounce = null;

function clientStatusBadge(client) {
  if (client.deletedAt) return `<span class="dash-status-badge status-disabled">Deleted</span>`;
  return client.isActive
    ? `<span class="dash-status-badge status-active">Active</span>`
    : `<span class="dash-status-badge status-disabled">Disabled</span>`;
}

function clientRow(client) {
  return `
    <tr data-client-id="${client.id}" class="${client.isActive && !client.deletedAt ? "" : "is-disabled"}">
      <td>
        <div class="admin-client-cell">
          <div class="admin-client-avatar">${initials(client.firstName, client.lastName)}</div>
          <div>
            <div class="admin-client-name">${escapeHtml(client.firstName)} ${escapeHtml(client.lastName)}</div>
            <div class="admin-client-email">${escapeHtml(client.email)}</div>
          </div>
        </div>
      </td>
      <td>${client.projectCount ?? 0}</td>
      <td>${clientStatusBadge(client)}</td>
      <td>${formatDate(client.createdAt) || "—"}</td>
      <td>
        <div class="admin-row-actions">
          <button type="button" class="dash-file-btn" data-client-view title="View profile">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          ${
            client.deletedAt
              ? ""
              : client.isActive
                ? `<button type="button" class="dash-file-btn" data-client-deactivate title="Disable account">
                     <span class="material-symbols-outlined">block</span>
                   </button>`
                : `<button type="button" class="dash-file-btn" data-client-activate title="Activate account">
                     <span class="material-symbols-outlined">check_circle</span>
                   </button>`
          }
          ${
            client.deletedAt
              ? ""
              : `<button type="button" class="dash-file-btn dash-file-delete" data-client-delete title="Delete client">
                   <span class="material-symbols-outlined">delete</span>
                 </button>`
          }
        </div>
      </td>
    </tr>`;
}

function renderClientsTable(clients) {
  const container = document.getElementById("clientsTableContainer");
  if (!container) return;

  if (!clients.length) {
    container.innerHTML = `
      <div class="dash-empty-state">
        <div class="dash-empty-icon"><span class="material-symbols-outlined">group</span></div>
        <h3>No clients found</h3>
        <p>Try a different search, or check the status filter.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Projects</th>
          <th>Status</th>
          <th>Joined</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${clients.map(clientRow).join("")}</tbody>
    </table>`;
}

async function loadClients({ search, status } = {}) {
  const container = document.getElementById("clientsTableContainer");
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();

    const { data } = await apiFetch(`/api/clients${qs ? `?${qs}` : ""}`);
    clientsCache = data.clients || [];
    renderClientsTable(clientsCache);

    // Keep the "all clients" snapshot (for pickers/name lookups) fresh only
    // on unfiltered loads, so we don't lose deleted/disabled clients from the map.
    if (!search && !status) allClientsCache = clientsCache;
  } catch (err) {
    logErr("Failed to load clients:", err);
    if (container) {
      container.innerHTML = `<div class="dash-empty-state">
        <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
        <h3>Couldn't load clients</h3>
        <p>Something went wrong on our end. Please refresh to try again.</p>
      </div>`;
    }
  }
}

function initClientFilters() {
  const searchInput = document.getElementById("clientSearchInput");
  const statusSelect = document.getElementById("clientStatusFilter");

  const runSearch = () => {
    loadClients({ search: searchInput?.value.trim(), status: statusSelect?.value || undefined });
  };

  searchInput?.addEventListener("input", () => {
    clearTimeout(clientSearchDebounce);
    clientSearchDebounce = setTimeout(runSearch, 300);
  });
  statusSelect?.addEventListener("change", runSearch);
}

function clientNameById(clientId) {
  const c = allClientsCache.find((cl) => cl.id === clientId);
  return c ? `${c.firstName} ${c.lastName}` : "Unknown Client";
}

function populateClientPickers() {
  // Only assignable (active, non-deleted) clients can be picked for new work
  const assignable = allClientsCache.filter((c) => c.isActive && !c.deletedAt);

  const projectFormSelect = document.getElementById("projectFormClient");
  if (projectFormSelect) {
    projectFormSelect.innerHTML = assignable.length
      ? assignable.map((c) => `<option value="${c.id}">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</option>`).join("")
      : `<option value="" disabled selected>No active clients available</option>`;
  }

  const projectClientFilter = document.getElementById("projectClientFilter");
  if (projectClientFilter) {
    projectClientFilter.innerHTML =
      `<option value="">All clients</option>` +
      allClientsCache.map((c) => `<option value="${c.id}">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</option>`).join("");
  }
}

function initProjectFilter() {
  document.getElementById("projectClientFilter")?.addEventListener("change", (e) => {
    loadProjects({ clientId: e.target.value || undefined });
  });
}

/* -- Client detail modal -- */
function clientModalContent(profile) {
  const { client, projects, files, conversations } = profile;
  const name = `${client.firstName} ${client.lastName}`;

  return `
    <div class="admin-client-header">
      <div class="dash-avatar">${initials(client.firstName, client.lastName)}</div>
      <div style="flex:1; min-width:180px">
        <h2 class="admin-modal-title" style="margin:0">${escapeHtml(name)}</h2>
        <div class="admin-client-email">${escapeHtml(client.email)}</div>
      </div>
      ${clientStatusBadge(client)}
    </div>

    <div class="admin-row-actions" style="justify-content:flex-start; margin-bottom:1.5rem">
      ${
        client.isActive
          ? `<button type="button" class="admin-btn-ghost" data-modal-deactivate="${client.id}">Disable Account</button>`
          : `<button type="button" class="admin-btn-ghost" data-modal-activate="${client.id}">Activate Account</button>`
      }
      ${!client.deletedAt ? `<button type="button" class="admin-btn-danger" data-modal-delete="${client.id}">Delete Client</button>` : ""}
    </div>

    <div class="admin-client-subsection">
      <h4>Projects (${projects.length})</h4>
      <div class="admin-mini-list">
        ${
          projects.length
            ? projects
                .map(
                  (p) => `
              <div class="admin-mini-row">
                <span><strong>${escapeHtml(p.name)}</strong> — ${STATUS_LABELS[p.status]}</span>
                <span>${p.progress}%</span>
              </div>`,
                )
                .join("")
            : `<p style="font-family:var(--font-sans); font-size:0.82rem; color:var(--text-muted)">No projects yet.</p>`
        }
      </div>
    </div>

    <div class="admin-client-subsection">
      <h4>Files (${files.length})</h4>
      <div class="admin-mini-list">
        ${
          files.length
            ? files
                .slice(0, 8)
                .map(
                  (f) => `
              <div class="admin-mini-row">
                <span><strong>${escapeHtml(f.filename)}</strong> — ${escapeHtml(f.project?.name || "")}</span>
                <span>${formatBytes(f.size)}</span>
              </div>`,
                )
                .join("")
            : `<p style="font-family:var(--font-sans); font-size:0.82rem; color:var(--text-muted)">No files uploaded yet.</p>`
        }
      </div>
    </div>

    <div class="admin-client-subsection">
      <h4>Conversations (${conversations.length})</h4>
      <div class="admin-mini-list">
        ${
          conversations.length
            ? conversations
                .map(
                  (c) => `
              <div class="admin-mini-row">
                <span><strong>${escapeHtml(c.project?.name || "Project")}</strong></span>
                <span>${c._count.messages} message${c._count.messages === 1 ? "" : "s"}</span>
              </div>`,
                )
                .join("")
            : `<p style="font-family:var(--font-sans); font-size:0.82rem; color:var(--text-muted)">No conversations yet.</p>`
        }
      </div>
    </div>`;
}

async function openClientModal(clientId) {
  openModal("clientModalOverlay");
  const body = document.getElementById("clientModalBody");
  if (body) {
    body.innerHTML = `<div class="dash-empty-state">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">hourglass_top</span></div>
      <h3>Loading client…</h3>
    </div>`;
  }
  try {
    const { data } = await apiFetch(`/api/clients/${clientId}`);
    if (body) body.innerHTML = clientModalContent(data);
  } catch (err) {
    logErr("Failed to load client profile:", err);
    if (body) {
      body.innerHTML = `<div class="dash-empty-state">
        <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
        <h3>Couldn't load this client</h3>
        <p>Something went wrong on our end. Please try again.</p>
      </div>`;
    }
  }
}

async function refreshClientsAfterChange() {
  const search = document.getElementById("clientSearchInput")?.value.trim();
  const status = document.getElementById("clientStatusFilter")?.value || undefined;
  await loadClients({ search, status });
  // Refresh the unfiltered snapshot too so pickers/name lookups stay accurate
  await loadClients();
  populateClientPickers();
}

document.addEventListener("click", async (e) => {
  const viewBtn = e.target.closest("[data-client-view]");
  const activateBtn = e.target.closest("[data-client-activate]");
  const deactivateBtn = e.target.closest("[data-client-deactivate]");
  const deleteBtn = e.target.closest("[data-client-delete]");
  const row = e.target.closest("[data-client-id]");
  if (!row) return;
  const clientId = row.dataset.clientId;

  if (viewBtn) return openClientModal(clientId);

  if (activateBtn) {
    try {
      await apiFetch(`/api/clients/${clientId}/activate`, { method: "PATCH" });
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to activate client:", err);
    }
  }

  if (deactivateBtn) {
    try {
      await apiFetch(`/api/clients/${clientId}/deactivate`, { method: "PATCH" });
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to deactivate client:", err);
    }
  }

  if (deleteBtn) {
    if (!confirm("Delete this client? Their account will be deactivated and hidden from lists. This can be reversed by support if needed.")) return;
    try {
      await apiFetch(`/api/clients/${clientId}`, { method: "DELETE" });
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to delete client:", err);
    }
  }
});

// Actions triggered from inside the client detail modal
document.addEventListener("click", async (e) => {
  const activateBtn = e.target.closest("[data-modal-activate]");
  const deactivateBtn = e.target.closest("[data-modal-deactivate]");
  const deleteBtn = e.target.closest("[data-modal-delete]");

  if (activateBtn) {
    try {
      await apiFetch(`/api/clients/${activateBtn.dataset.modalActivate}/activate`, { method: "PATCH" });
      await openClientModal(activateBtn.dataset.modalActivate);
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to activate client:", err);
    }
  }

  if (deactivateBtn) {
    try {
      await apiFetch(`/api/clients/${deactivateBtn.dataset.modalDeactivate}/deactivate`, { method: "PATCH" });
      await openClientModal(deactivateBtn.dataset.modalDeactivate);
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to deactivate client:", err);
    }
  }

  if (deleteBtn) {
    if (!confirm("Delete this client? Their account will be deactivated and hidden from lists.")) return;
    try {
      await apiFetch(`/api/clients/${deleteBtn.dataset.modalDelete}`, { method: "DELETE" });
      closeModal("clientModalOverlay");
      await refreshClientsAfterChange();
    } catch (err) {
      logErr("Failed to delete client:", err);
    }
  }
});

/* ---------------------------------------------------------
   PROJECTS + MILESTONES
   --------------------------------------------------------- */
function milestoneRow(milestone, projectId, index, total) {
  const icon = milestone.completed ? "check_circle" : "radio_button_unchecked";
  return `
    <div class="dash-milestone-row ${milestone.completed ? "is-complete" : ""}" data-milestone-id="${milestone.id}" data-milestone-order="${milestone.order}">
      <label class="dash-milestone-label" data-milestone-toggle>
        <span class="material-symbols-outlined">${icon}</span>
        <span>${escapeHtml(milestone.title)}</span>
      </label>
      <div class="admin-milestone-actions">
        <button type="button" class="admin-mini-btn" data-milestone-up ${index === 0 ? "disabled" : ""} title="Move up">
          <span class="material-symbols-outlined">keyboard_arrow_up</span>
        </button>
        <button type="button" class="admin-mini-btn" data-milestone-down ${index === total - 1 ? "disabled" : ""} title="Move down">
          <span class="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
        <button type="button" class="admin-mini-btn is-danger" data-milestone-delete title="Delete milestone">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>`;
}

function projectCard(project) {
  const due = formatDate(project.dueDate);
  const start = formatDate(project.startDate);
  const milestones = project.milestones || [];
  const clientName = clientNameById(project.clientId);

  return `
    <article class="dash-project-card" data-project-id="${project.id}" data-client-id="${project.clientId}">
      <div class="dash-project-top">
        <div class="dash-project-name-group">
          <span class="dash-project-name">${escapeHtml(project.name)}</span>
          <span class="dash-project-client">${escapeHtml(clientName)}</span>
        </div>
        <div class="dash-project-badges">
          <span class="dash-status-badge status-${project.status.toLowerCase()}">${STATUS_LABELS[project.status]}</span>
          <span class="dash-status-badge priority-badge">${project.priority} Priority</span>
        </div>
      </div>
      ${project.description ? `<p class="dash-project-desc">${escapeHtml(project.description)}</p>` : ""}
      <div class="dash-progress-track"><div class="dash-progress-fill" style="width:${project.progress}%"></div></div>
      <p class="dash-progress-label">${project.progress}% complete</p>
      <div class="dash-project-meta">
        ${start ? `<span>Started <strong>${start}</strong></span>` : ""}
        ${due ? `<span>Due <strong>${due}</strong></span>` : ""}
        <span style="margin-left:auto" class="dash-project-actions">
          <button type="button" class="admin-mini-btn" data-project-edit title="Edit project">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button type="button" class="admin-mini-btn is-danger" data-project-delete title="Delete project">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </span>
      </div>
      <div class="dash-milestones">
        ${milestones.map((m, i) => milestoneRow(m, project.id, i, milestones.length)).join("")}
        <form class="admin-milestone-add" data-milestone-add-form>
          <input type="text" placeholder="Add a milestone…" maxlength="160" required />
          <input type="date" />
          <button type="submit">Add</button>
        </form>
      </div>
    </article>`;
}

function emptyProjectsState() {
  return `<div class="dash-card"><div class="dash-empty-state">
    <div class="dash-empty-icon"><span class="material-symbols-outlined">work</span></div>
    <h3>No projects yet</h3>
    <p>Create the first project for a client to get started.</p>
  </div></div>`;
}

let projectsCache = [];

async function loadProjects({ clientId } = {}) {
  const container = document.getElementById("projectsContainer");
  if (!container) return;
  try {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    const qs = params.toString();
    const { data } = await apiFetch(`/api/projects${qs ? `?${qs}` : ""}`);
    projectsCache = data.projects || [];
    container.innerHTML = projectsCache.length ? projectsCache.map(projectCard).join("") : emptyProjectsState();
  } catch (err) {
    logErr("Failed to load projects:", err);
    container.innerHTML = `<div class="dash-card"><div class="dash-empty-state">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
      <h3>Couldn't load projects</h3>
      <p>Something went wrong on our end. Please refresh to try again.</p>
    </div></div>`;
  }
}

/* -- Project create/edit modal -- */
function initProjectForm() {
  const openBtn = document.getElementById("openCreateProjectBtn");
  const form = document.getElementById("projectForm");
  const title = document.getElementById("projectModalTitle");
  const errorEl = document.getElementById("projectFormError");
  const submitBtn = document.getElementById("projectFormSubmit");
  if (!form) return;

  openBtn?.addEventListener("click", () => {
    form.reset();
    document.getElementById("projectFormId").value = "";
    title.textContent = "New Project";
    errorEl.textContent = "";
    populateClientPickers();
    openModal("projectModalOverlay");
  });

  // Sidebar CTA (Phase 4.2) reuses the same open flow as the Projects tab button.
  document.getElementById("sidebarNewProjectBtn")?.addEventListener("click", () => openBtn?.click());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const id = document.getElementById("projectFormId").value;
    const payload = {
      name: document.getElementById("projectFormName").value.trim(),
      description: document.getElementById("projectFormDescription").value.trim() || undefined,
      status: document.getElementById("projectFormStatus").value,
      priority: document.getElementById("projectFormPriority").value,
      startDate: document.getElementById("projectFormStart").value || undefined,
      dueDate: document.getElementById("projectFormDue").value || undefined,
    };
    if (!id) payload.clientId = document.getElementById("projectFormClient").value;

    submitBtn.disabled = true;
    try {
      if (id) {
        await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        if (!payload.clientId) throw new ApiError("Please select a client", 400);
        await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      }
      closeModal("projectModalOverlay");
      await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
      await loadOverview();
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function openEditProjectModal(project) {
  document.getElementById("projectModalTitle").textContent = "Edit Project";
  document.getElementById("projectFormError").textContent = "";
  document.getElementById("projectFormId").value = project.id;
  document.getElementById("projectFormName").value = project.name;
  document.getElementById("projectFormDescription").value = project.description || "";
  document.getElementById("projectFormStatus").value = project.status;
  document.getElementById("projectFormPriority").value = project.priority;
  document.getElementById("projectFormStart").value = toDateInputValue(project.startDate);
  document.getElementById("projectFormDue").value = toDateInputValue(project.dueDate);
  openModal("projectModalOverlay");
}

document.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-project-edit]");
  const deleteBtn = e.target.closest("[data-project-delete]");
  const upBtn = e.target.closest("[data-milestone-up]");
  const downBtn = e.target.closest("[data-milestone-down]");
  const deleteMilestoneBtn = e.target.closest("[data-milestone-delete]");
  const card = e.target.closest("[data-project-id]");
  if (!card) return;
  const projectId = card.dataset.projectId;

  if (editBtn) {
    const project = projectsCache.find((p) => p.id === projectId);
    if (project) openEditProjectModal(project);
    return;
  }

  if (deleteBtn) {
    if (!confirm("Delete this project? This also removes its milestones, files, and messages. This cannot be undone.")) return;
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
      await loadOverview();
    } catch (err) {
      logErr("Failed to delete project:", err);
    }
    return;
  }

  const milestoneRowEl = e.target.closest("[data-milestone-id]");

  if (upBtn || downBtn) {
    const milestoneId = milestoneRowEl.dataset.milestoneId;
    const project = projectsCache.find((p) => p.id === projectId);
    const milestones = project?.milestones || [];
    const idx = milestones.findIndex((m) => m.id === milestoneId);
    const swapIdx = upBtn ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= milestones.length) return;

    const a = milestones[idx];
    const b = milestones[swapIdx];
    try {
      await Promise.all([
        apiFetch(`/api/projects/${projectId}/milestones/${a.id}`, { method: "PATCH", body: JSON.stringify({ order: b.order }) }),
        apiFetch(`/api/projects/${projectId}/milestones/${b.id}`, { method: "PATCH", body: JSON.stringify({ order: a.order }) }),
      ]);
      await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
    } catch (err) {
      logErr("Failed to reorder milestone:", err);
    }
    return;
  }

  if (deleteMilestoneBtn) {
    const milestoneId = milestoneRowEl.dataset.milestoneId;
    if (!confirm("Delete this milestone?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" });
      await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
    } catch (err) {
      logErr("Failed to delete milestone:", err);
    }
    return;
  }

  // Toggle completion (clicking the label, same UX as the client dashboard)
  if (milestoneRowEl && e.target.closest("[data-milestone-toggle]")) {
    const milestoneId = milestoneRowEl.dataset.milestoneId;
    const willComplete = !milestoneRowEl.classList.contains("is-complete");
    try {
      await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: willComplete }),
      });
      await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
    } catch (err) {
      logErr("Failed to update milestone:", err);
    }
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-milestone-add-form]");
  if (!form) return;
  e.preventDefault();

  const card = form.closest("[data-project-id]");
  const projectId = card?.dataset.projectId;
  const [titleInput, dateInput] = form.querySelectorAll("input");
  const title = titleInput.value.trim();
  if (!title || !projectId) return;

  try {
    await apiFetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify({ title, ...(dateInput.value ? { dueDate: dateInput.value } : {}) }),
    });
    await loadProjects({ clientId: document.getElementById("projectClientFilter")?.value || undefined });
  } catch (err) {
    logErr("Failed to add milestone:", err);
  }
});

/* ---------------------------------------------------------
   FILES
   --------------------------------------------------------- */
function fileRow(file) {
  return `
    <div class="dash-file-row" data-file-id="${file.id}">
      <div class="dash-file-icon"><span class="material-symbols-outlined">${iconFor(file.mimeType)}</span></div>
      <div class="dash-file-info">
        <div class="dash-file-name">${escapeHtml(file.filename)}</div>
        <div class="dash-file-meta">
          <span>${escapeHtml(file.project?.name || "")}</span>
          <span>${formatBytes(file.size)}</span>
          <span>${formatDate(file.createdAt)}</span>
          ${file.category ? `<span>${escapeHtml(file.category)}</span>` : ""}
        </div>
      </div>
      <div class="dash-file-actions">
        <button type="button" class="dash-file-btn" data-file-download title="Download">
          <span class="material-symbols-outlined">download</span>
        </button>
        <button type="button" class="dash-file-btn dash-file-delete" data-file-remove title="Delete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>`;
}

function emptyFilesState() {
  return `<div class="dash-card"><div class="dash-empty-state">
    <div class="dash-empty-icon"><span class="material-symbols-outlined">folder</span></div>
    <h3>No files match this view</h3>
    <p>Upload a file below, or clear the filters above.</p>
  </div></div>`;
}

async function loadFiles({ projectId, category } = {}) {
  const container = document.getElementById("filesContainer");
  if (!container) return;
  try {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const qs = params.toString();
    const { data } = await apiFetch(`/api/files${qs ? `?${qs}` : ""}`);
    let files = data.files || [];
    if (category) {
      const needle = category.toLowerCase();
      files = files.filter((f) => (f.category || "").toLowerCase().includes(needle));
    }
    container.innerHTML = files.length ? files.map(fileRow).join("") : emptyFilesState();
  } catch (err) {
    logErr("Failed to load files:", err);
    container.innerHTML = `<div class="dash-card"><div class="dash-empty-state">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
      <h3>Couldn't load files</h3>
      <p>Something went wrong on our end. Please refresh to try again.</p>
    </div></div>`;
  }
}

function currentFileFilters() {
  return {
    projectId: document.getElementById("fileProjectFilter")?.value || undefined,
    category: document.getElementById("fileCategoryFilter")?.value.trim() || undefined,
  };
}

function initFileFilters() {
  const projectSelect = document.getElementById("fileProjectFilter");
  const categoryInput = document.getElementById("fileCategoryFilter");
  let debounceTimer = null;

  projectSelect?.addEventListener("change", () => loadFiles(currentFileFilters()));
  categoryInput?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadFiles(currentFileFilters()), 300);
  });
}

async function populateFileProjectFilter() {
  const select = document.getElementById("fileProjectFilter");
  if (!select) return;
  try {
    const { data } = await apiFetch("/api/projects");
    const projects = data.projects || [];
    select.innerHTML =
      `<option value="">All projects</option>` +
      projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  } catch {
    // Filter just won't have options; the file list still loads unfiltered
  }
}

async function renderFilesUploadBar() {
  const bar = document.getElementById("filesUploadBar");
  if (!bar) return;

  await populateFileProjectFilter();

  let projects = [];
  try {
    const { data } = await apiFetch("/api/projects");
    projects = data.projects || [];
  } catch {
    // dropzone still renders; upload will just be disabled without a project
  }

  bar.innerHTML = `
    <div class="dash-card admin-dropzone" id="fileDropzone" tabindex="0" role="button" aria-label="Upload a file">
      <span class="material-symbols-outlined">upload_file</span>
      <p><strong>Drag & drop</strong> a file here, or click to browse</p>
      <input type="file" id="fileUploadInput" hidden />
      <div class="admin-dropzone-controls" onclick="event.stopPropagation()">
        <select id="fileUploadProject" ${projects.length ? "" : "disabled"}>
          ${
            projects.length
              ? projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")
              : `<option value="" disabled selected>No projects available</option>`
          }
        </select>
        <input type="text" id="fileUploadCategory" placeholder="Category (optional)" />
      </div>
    </div>`;
}

async function uploadFile(file) {
  const projectSelect = document.getElementById("fileUploadProject");
  const categoryInput = document.getElementById("fileUploadCategory");
  const dropzone = document.getElementById("fileDropzone");
  const projectId = projectSelect?.value;
  if (!file || !projectId) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectId", projectId);
  const category = categoryInput?.value.trim();
  if (category) formData.append("category", category);

  dropzone?.classList.add("is-dragover");
  try {
    await apiFetch("/api/files", { method: "POST", body: formData });
    await loadFiles(currentFileFilters());
    await loadOverview();
  } catch (err) {
    logErr("Failed to upload file:", err);
  } finally {
    dropzone?.classList.remove("is-dragover");
  }
}

function initDropzone() {
  document.addEventListener("click", (e) => {
    const zone = e.target.closest("#fileDropzone");
    if (!zone) return;
    document.getElementById("fileUploadInput")?.click();
  });

  document.addEventListener("change", (e) => {
    if (e.target.id !== "fileUploadInput") return;
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  });

  document.addEventListener("dragover", (e) => {
    const zone = e.target.closest("#fileDropzone");
    if (!zone) return;
    e.preventDefault();
    zone.classList.add("is-dragover");
  });
  document.addEventListener("dragleave", (e) => {
    const zone = e.target.closest("#fileDropzone");
    if (!zone) return;
    zone.classList.remove("is-dragover");
  });
  document.addEventListener("drop", (e) => {
    const zone = e.target.closest("#fileDropzone");
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove("is-dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  });
}

document.addEventListener("click", async (e) => {
  const downloadBtn = e.target.closest("[data-file-download]");
  const removeBtn = e.target.closest("[data-file-remove]");
  const row = e.target.closest("[data-file-id]");
  if (!row) return;
  const fileId = row.dataset.fileId;
  const filename = row.querySelector(".dash-file-name")?.textContent || "download";

  if (downloadBtn) {
    downloadBtn.disabled = true;
    try {
      await downloadFile(fileId, filename);
    } catch (err) {
      console.error("Failed to download file:", err);
    } finally {
      downloadBtn.disabled = false;
    }
  }

  if (removeBtn) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/files/${fileId}`, { method: "DELETE" });
      await loadFiles(currentFileFilters());
      await loadOverview();
    } catch (err) {
      logErr("Failed to delete file:", err);
    }
  }
});

async function downloadFile(fileId, filename) {
  const doFetch = () =>
    fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      credentials: "include",
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });

  let res = await doFetch();
  if (res.status === 401) {
    const { ok } = await refreshSession();
    if (ok) res = await doFetch();
  }
  if (!res.ok) throw new Error(`Download failed (${res.status})`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   MESSAGES
   --------------------------------------------------------- */
let conversationsCache = [];
let activeConversationId = null;
let activeConversationProjectId = null;
let conversationSearchTerm = "";

// Short, relative-feeling timestamp for the conversation list ("2m ago",
// "Yesterday", or a plain date once it's more than a week old).
function formatRelativeTime(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Label used above a run of messages sent on the same day ("Today",
// "Yesterday", or a full date for anything older).
function messageDateLabel(iso) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// Two-letter avatar initials from a project or person's name.
function initialsFrom(str = "") {
  const parts = String(str).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Material icon that best represents a file's mime type in attachment chips.
function iconForMimeType(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "movie";
  if (mimeType === "application/pdf") return "picture_as_pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "table_chart";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "slideshow";
  if (mimeType.includes("word") || mimeType.includes("document")) return "description";
  return "draft";
}

function conversationItem(conversation) {
  const clientName = clientNameById(conversation.project?.clientId);
  const preview = conversation.lastMessage?.body || "No messages yet";
  const time = conversation.lastMessage ? formatRelativeTime(conversation.lastMessage.createdAt) : "";
  return `
    <button type="button" class="dash-conversation-item ${conversation.id === activeConversationId ? "is-active" : ""}"
      data-conversation-id="${conversation.id}" data-project-id="${conversation.project?.id || ""}">
      <span class="ds-avatar" aria-hidden="true">${escapeHtml(initialsFrom(conversation.project?.name || "?"))}</span>
      <span class="dash-conv-item-body">
        <span class="dash-conversation-name">
          <span class="dash-conv-item-title">${escapeHtml(conversation.project?.name || "Project")}</span>
          ${time ? `<span class="dash-conv-item-time">${escapeHtml(time)}</span>` : ""}
        </span>
        <span class="dash-conversation-preview-row">
          <span class="dash-conversation-preview">${escapeHtml(clientName)} — ${escapeHtml(preview)}</span>
          ${conversation.unreadCount ? `<span class="dash-unread-dot">${conversation.unreadCount}</span>` : ""}
        </span>
      </span>
    </button>`;
}

function filteredConversations() {
  if (!conversationSearchTerm) return conversationsCache;
  const needle = conversationSearchTerm.toLowerCase();
  return conversationsCache.filter((c) => {
    const clientName = clientNameById(c.project?.clientId).toLowerCase();
    const projectName = (c.project?.name || "").toLowerCase();
    return clientName.includes(needle) || projectName.includes(needle);
  });
}

async function loadConversations({ selectFirst = false } = {}) {
  const list = document.getElementById("conversationsList");
  if (!list) return;
  try {
    const { data } = await apiFetch("/api/messages");
    conversationsCache = data.conversations || [];
    const visible = filteredConversations();
    list.innerHTML = visible.length
      ? visible.map(conversationItem).join("")
      : `<div class="dash-empty-state" style="padding:2rem 1rem">
           <div class="dash-empty-icon"><span class="material-symbols-outlined">chat_bubble</span></div>
           <h3>No conversations</h3>
         </div>`;

    if (selectFirst && !activeConversationId && visible.length) {
      selectConversation(visible[0].id, visible[0].project?.id);
    }
  } catch (err) {
    logErr("Failed to load conversations:", err);
    list.innerHTML = `<div class="dash-empty-state" style="padding:2rem 1rem">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
      <h3>Couldn't load conversations</h3>
    </div>`;
  }
}

function initConversationSearch() {
  const input = document.getElementById("conversationSearchInput");
  input?.addEventListener("input", () => {
    conversationSearchTerm = input.value.trim();
    const list = document.getElementById("conversationsList");
    const visible = filteredConversations();
    if (list) {
      list.innerHTML = visible.length
        ? visible.map(conversationItem).join("")
        : `<div class="dash-empty-state" style="padding:2rem 1rem">
             <div class="dash-empty-icon"><span class="material-symbols-outlined">search_off</span></div>
             <h3>No matches</h3>
           </div>`;
    }
  });
}

function attachmentMarkup(attachment) {
  if (!attachment) return "";
  return `
    <div class="dash-message-attachment">
      <span class="material-symbols-outlined">${iconForMimeType(attachment.mimeType)}</span>
      <span class="dash-message-attachment-info">
        <span class="dash-message-attachment-name">${escapeHtml(attachment.filename)}</span>
        ${
          typeof attachment.size === "number"
            ? `<span class="dash-message-attachment-size">${escapeHtml(formatBytes(attachment.size))}</span>`
            : ""
        }
      </span>
    </div>`;
}

function messageBubble(message, currentUserId) {
  const isOwn = message.senderId ? message.senderId === currentUserId : message.sender?.id === currentUserId;
  const senderName = `${message.sender.firstName} ${message.sender.lastName}`;

  const bubble = `
    <div class="dash-message-bubble ${isOwn ? "is-own" : "is-other"}">
      <div class="dash-message-text">${escapeHtml(message.body)}</div>
      ${attachmentMarkup(message.attachment)}
      <div class="dash-message-meta">${isOwn ? "You" : escapeHtml(senderName)} · ${formatDateTime(message.createdAt)}</div>
    </div>`;

  if (isOwn) {
    return `<div class="dash-message-row is-own">${bubble}</div>`;
  }
  return `
    <div class="dash-message-row is-other">
      <span class="ds-avatar ds-avatar-sm" aria-hidden="true">${escapeHtml(initialsFrom(senderName))}</span>
      ${bubble}
    </div>`;
}

// Groups messages by calendar day and interleaves a date-divider between
// each run, so the thread reads like a modern chat app instead of one
// continuous scroll.
function messagesWithDateDividers(messages, currentUserId) {
  let lastDay = null;
  return messages
    .map((m) => {
      const day = new Date(m.createdAt).toDateString();
      const divider =
        day !== lastDay
          ? `<div class="dash-msg-date-divider"><span>${escapeHtml(messageDateLabel(m.createdAt))}</span></div>`
          : "";
      lastDay = day;
      return divider + messageBubble(m, currentUserId);
    })
    .join("");
}

function hideAttachmentPreview() {
  const preview = document.getElementById("messageAttachPreview");
  if (preview) preview.hidden = true;
}

function showAttachmentPreview(filename) {
  const preview = document.getElementById("messageAttachPreview");
  const name = document.getElementById("messageAttachPreviewName");
  if (!preview || !name) return;
  name.textContent = filename;
  preview.hidden = false;
}

async function populateAttachmentOptions(projectId) {
  const select = document.getElementById("messageAttachSelect");
  if (!select || !projectId) return;
  select.classList.remove("has-value");
  hideAttachmentPreview();
  try {
    const { data } = await apiFetch(`/api/files?projectId=${projectId}`);
    const files = data.files || [];
    select.innerHTML =
      `<option value="">Attach</option>` +
      files.map((f) => `<option value="${f.id}">${escapeHtml(f.filename)}</option>`).join("");
  } catch {
    select.innerHTML = `<option value="">Attach</option>`;
  }
}

async function selectConversation(conversationId, projectId) {
  activeConversationId = conversationId;
  activeConversationProjectId = projectId;

  document.querySelectorAll("[data-conversation-id]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.conversationId === conversationId);
  });
  document.getElementById("messageComposerForm")?.classList.remove("is-hidden");

  await Promise.all([loadMessages(conversationId), populateAttachmentOptions(projectId)]);
}

function threadHeaderMarkup(conv) {
  const clientName = clientNameById(conv.project?.clientId);
  return `
    <div class="dash-thread-header-inner">
      <span class="ds-avatar ds-avatar-lg" aria-hidden="true">${escapeHtml(initialsFrom(conv.project?.name || "?"))}</span>
      <span class="dash-thread-header-text">
        <span class="dash-thread-title">${escapeHtml(conv.project?.name || "Conversation")}</span>
        <span class="dash-thread-subtitle">${escapeHtml(clientName)}</span>
      </span>
    </div>`;
}

async function loadMessages(conversationId) {
  const body = document.getElementById("messageThreadBody");
  const header = document.getElementById("messageThreadHeader");
  if (!body) return;

  const conv = conversationsCache.find((c) => c.id === conversationId);
  if (header) header.innerHTML = conv ? threadHeaderMarkup(conv) : "Conversation";

  try {
    const { data } = await apiFetch(`/api/messages/${conversationId}`);
    const messages = data.messages || [];
    const user = getCurrentUser();

    body.innerHTML = messages.length
      ? messagesWithDateDividers(messages, user?.id)
      : `<div class="dash-empty-state">
           <div class="dash-empty-icon"><span class="material-symbols-outlined">chat_bubble</span></div>
           <h3>No messages yet</h3>
           <p>Start the conversation with this client below.</p>
         </div>`;
    body.scrollTop = body.scrollHeight;

    await loadConversations();
    await loadOverview();
  } catch (err) {
    logErr("Failed to load messages:", err);
    body.innerHTML = `<div class="dash-empty-state">
      <div class="dash-empty-icon"><span class="material-symbols-outlined">error</span></div>
      <h3>Couldn't load messages</h3>
    </div>`;
  }
}

// Grows the composer textarea with its content (capped by the CSS
// max-height, which switches to an internal scrollbar beyond that).
function autoGrowTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function initMessageComposer() {
  const form = document.getElementById("messageComposerForm");
  const input = document.getElementById("messageComposerInput");
  const attachSelect = document.getElementById("messageAttachSelect");
  const attachClear = document.getElementById("messageAttachClear");
  const sendBtn = document.getElementById("messageComposerSend");
  if (!form || !input) return;

  const syncSendState = () => {
    if (sendBtn) sendBtn.disabled = !input.value.trim();
  };

  input.addEventListener("input", () => {
    autoGrowTextarea(input);
    syncSendState();
  });

  // Enter sends the message; Shift+Enter inserts a newline like every
  // other modern chat composer.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  attachSelect?.addEventListener("change", () => {
    const selected = attachSelect.options[attachSelect.selectedIndex];
    attachSelect.classList.toggle("has-value", !!attachSelect.value);
    if (attachSelect.value && selected) {
      showAttachmentPreview(selected.textContent);
    } else {
      hideAttachmentPreview();
    }
  });

  attachClear?.addEventListener("click", () => {
    if (attachSelect) {
      attachSelect.value = "";
      attachSelect.classList.remove("has-value");
    }
    hideAttachmentPreview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !activeConversationProjectId) return;

    const attachmentId = attachSelect?.value || undefined;
    if (sendBtn) sendBtn.disabled = true;

    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ projectId: activeConversationProjectId, body: text, ...(attachmentId ? { attachmentId } : {}) }),
      });
      input.value = "";
      autoGrowTextarea(input);
      if (attachSelect) {
        attachSelect.value = "";
        attachSelect.classList.remove("has-value");
      }
      hideAttachmentPreview();
      await loadMessages(activeConversationId);
    } catch (err) {
      logErr("Failed to send message:", err);
    } finally {
      syncSendState();
    }
  });
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-conversation-id]");
  if (!item) return;
  selectConversation(item.dataset.conversationId, item.dataset.projectId);
});

function startMessagesPolling() {
  setInterval(() => {
    loadConversations();
    if (activeConversationId) loadMessages(activeConversationId);
  }, 10000);
}

/* ---------------------------------------------------------
   SECTION SWITCHING / MOBILE / LOGOUT
   --------------------------------------------------------- */
function initSectionNav() {
  const navButtons = document.querySelectorAll("[data-dash-nav]");
  const sections = document.querySelectorAll("[data-dash-section]");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.dashNav;
      navButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
      sections.forEach((s) => s.classList.toggle("is-active", s.dataset.dashSection === target));
      document.getElementById("dashSidebar")?.classList.remove("is-open");
    });
  });
}

function openSectionFromHash() {
  const target = window.location.hash.replace("#", "");
  if (!target) return;
  document.querySelector(`[data-dash-nav="${target}"]`)?.click();
}

function initMobileToggle() {
  const toggleBtn = document.getElementById("dashMobileToggle");
  const sidebar = document.getElementById("dashSidebar");
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove("is-open");
    }
  });
}

function initLogout() {
  document.querySelectorAll("[data-logout-btn]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await logout();
      } finally {
        window.location.href = "login.html";
      }
    });
  });
}
