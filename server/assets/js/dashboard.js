/* =========================================================
   HATHAWAY STRATEGIC — CLIENT DASHBOARD LOGIC
   Page-specific: guards the route, renders the welcome card,
   drives section tabs, and handles logout. Projects, Files,
   and Messages all load real data via apiFetch(); Invoices
   still shows an honest empty state since that API doesn't
   exist yet.
   ========================================================= */

import {
  requireAuthOrRedirect,
  logout,
  getCurrentUser,
} from "./auth-client.js";
import {
  apiFetch,
  ApiError,
  API_BASE_URL,
  getAccessToken,
  refreshSession,
} from "./api-client.js";
import {
  initNotificationBell,
  initNotificationCenter,
  loadNotificationCenter,
  startNotificationPolling,
} from "./notifications.js";
import { initPushSettingsToggle } from "./push-notifications.js";

// Protect this page
requireAuthOrRedirect();

// Wait until auth has finished checking the session
document.addEventListener(
  "auth:ready",
  () => {
    const user = getCurrentUser();

    if (!user) return;

    renderWelcomeCard(user);
    renderSettingsCard(user);
    loadProjects();
    renderFilesUploadBar();
    loadFiles();
    loadConversations({ selectFirst: true });
    initMessageComposer();
    startMessagesPolling();
    initNotificationBell();
    initNotificationCenter();
    loadNotificationCenter();
    startNotificationPolling();
    initPushSettingsToggle();
    openSectionFromHash();
  },
  { once: true },
);

// A clicked push notification (from service-worker.js) lands on
// client-dashboard.html#notifications — open that section on load,
// same as clicking the nav button by hand.
function openSectionFromHash() {
  const target = window.location.hash.replace("#", "");
  if (!target) return;
  document.querySelector(`[data-dash-nav="${target}"]`)?.click();
}

function initials(user) {
  return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
}

function renderWelcomeCard(user) {
  const nameEl = document.getElementById("dashUserName");
  const emailEl = document.getElementById("dashUserEmail");
  const avatarEl = document.getElementById("dashUserAvatar");
  const verifiedBadge = document.getElementById("dashVerifiedBadge");

  if (nameEl) nameEl.textContent = user.firstName;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = initials(user);

  if (verifiedBadge) {
    verifiedBadge.textContent = user.emailVerified ? "Verified" : "Unverified";
    verifiedBadge.classList.toggle("badge-verified", user.emailVerified);
    verifiedBadge.classList.toggle("badge-unverified", !user.emailVerified);
  }
}

function renderSettingsCard(user) {
  const fields = {
    settingsFirstName: user.firstName,
    settingsLastName: user.lastName,
    settingsEmail: user.email,
  };
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

/* ---------------------------------------------------------
   PROJECTS
   --------------------------------------------------------- */
const STATUS_LABELS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

function escapeHtml(str = "") {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function milestoneRow(milestone) {
  const icon = milestone.completed ? "check_circle" : "radio_button_unchecked";
  return `
    <label class="dash-milestone-row ${milestone.completed ? "is-complete" : ""}" data-milestone-id="${milestone.id}">
      <input type="checkbox" hidden ${milestone.completed ? "checked" : ""} data-milestone-toggle />
      <span class="material-symbols-outlined">${icon}</span>
      <span>${escapeHtml(milestone.title)}</span>
    </label>`;
}

function projectCard(project) {
  const due = formatDate(project.dueDate);
  const start = formatDate(project.startDate);
  const milestones = project.milestones || [];

  return `
    <article class="dash-project-card" data-project-id="${project.id}">
      <div class="dash-project-top">
        <span class="dash-project-name">${escapeHtml(project.name)}</span>
        <div class="dash-project-badges">
          <span class="dash-status-badge status-${project.status.toLowerCase()}">${STATUS_LABELS[project.status]}</span>
          <span class="dash-status-badge priority-badge">${project.priority} Priority</span>
        </div>
      </div>
      ${project.description ? `<p class="dash-project-desc">${escapeHtml(project.description)}</p>` : ""}
      <div class="dash-progress-track">
        <div class="dash-progress-fill" style="width:${project.progress}%"></div>
      </div>
      <p class="dash-progress-label">${project.progress}% complete</p>
      <div class="dash-project-meta">
        ${start ? `<span>Started <strong>${start}</strong></span>` : ""}
        ${due ? `<span>Due <strong>${due}</strong></span>` : ""}
      </div>
      ${
        milestones.length
          ? `<div class="dash-milestones">${milestones.map(milestoneRow).join("")}</div>`
          : ""
      }
    </article>`;
}

function emptyProjectsState() {
  return `
    <div class="dash-card">
      <div class="dash-empty-state">
        <div class="dash-empty-icon">
          <span class="material-symbols-outlined">work</span>
        </div>
        <h3>No active projects</h3>
        <p>
          When we kick off your first engagement, you'll track its status,
          milestones, and deadlines right here.
        </p>
      </div>
    </div>`;
}

function errorProjectsState() {
  return `
    <div class="dash-card">
      <div class="dash-empty-state">
        <div class="dash-empty-icon">
          <span class="material-symbols-outlined">error</span>
        </div>
        <h3>Couldn't load projects</h3>
        <p>Something went wrong on our end. Please refresh to try again.</p>
      </div>
    </div>`;
}

async function loadProjects() {
  const container = document.getElementById("projectsContainer");
  if (!container) return;

  try {
    const { data } = await apiFetch("/api/projects");
    const projects = data.projects || [];
    container.innerHTML = projects.length
      ? projects.map(projectCard).join("")
      : emptyProjectsState();
  } catch (err) {
    console.error("Failed to load projects:", err instanceof ApiError ? err.message : err);
    container.innerHTML = errorProjectsState();
  }
}

// Event delegation: toggle a milestone's completed state when clicked
document.addEventListener("click", async (e) => {
  const row = e.target.closest("[data-milestone-id]");
  if (!row) return;

  const card = row.closest("[data-project-id]");
  const projectId = card?.dataset.projectId;
  const milestoneId = row.dataset.milestoneId;
  if (!projectId || !milestoneId) return;

  const willComplete = !row.classList.contains("is-complete");

  try {
    await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: willComplete }),
    });
    await loadProjects();
  } catch (err) {
    console.error("Failed to update milestone:", err instanceof ApiError ? err.message : err);
  }
});

/* ---------------------------------------------------------
   FILES
   --------------------------------------------------------- */
const FILE_ICONS = {
  "application/pdf": "picture_as_pdf",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "text/csv": "table_chart",
};
const iconFor = (mimeType) => FILE_ICONS[mimeType] || "description";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileRow(file, isAdmin) {
  return `
    <div class="dash-file-row" data-file-id="${file.id}">
      <div class="dash-file-icon">
        <span class="material-symbols-outlined">${iconFor(file.mimeType)}</span>
      </div>
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
        ${
          isAdmin
            ? `<button type="button" class="dash-file-btn dash-file-delete" data-file-remove title="Delete">
                 <span class="material-symbols-outlined">delete</span>
               </button>`
            : ""
        }
      </div>
    </div>`;
}

function emptyFilesState() {
  return `
    <div class="dash-card">
      <div class="dash-empty-state">
        <div class="dash-empty-icon">
          <span class="material-symbols-outlined">folder</span>
        </div>
        <h3>No files yet</h3>
        <p>
          Deliverables, assets, and shared documents from your team will
          be organized here.
        </p>
      </div>
    </div>`;
}

function errorFilesState() {
  return `
    <div class="dash-card">
      <div class="dash-empty-state">
        <div class="dash-empty-icon">
          <span class="material-symbols-outlined">error</span>
        </div>
        <h3>Couldn't load files</h3>
        <p>Something went wrong on our end. Please refresh to try again.</p>
      </div>
    </div>`;
}

async function loadFiles() {
  const container = document.getElementById("filesContainer");
  if (!container) return;

  const user = getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  try {
    const { data } = await apiFetch("/api/files");
    const files = data.files || [];
    container.innerHTML = files.length
      ? files.map((f) => fileRow(f, isAdmin)).join("")
      : emptyFilesState();
  } catch (err) {
    console.error("Failed to load files:", err instanceof ApiError ? err.message : err);
    container.innerHTML = errorFilesState();
  }
}

async function renderFilesUploadBar() {
  const bar = document.getElementById("filesUploadBar");
  if (!bar) return;

  const user = getCurrentUser();
  if (user?.role !== "ADMIN") {
    bar.innerHTML = "";
    return;
  }

  // Admin needs a project to attach the upload to
  let projects = [];
  try {
    const { data } = await apiFetch("/api/projects");
    projects = data.projects || [];
  } catch {
    // If this fails the upload bar just won't have project options; list still loads separately
  }

  bar.innerHTML = `
    <div class="dash-card dash-file-upload-bar">
      <select id="fileUploadProject" class="dash-field" style="max-width:220px">
        ${
          projects.length
            ? projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")
            : `<option value="" disabled selected>No projects available</option>`
        }
      </select>
      <input type="text" id="fileUploadCategory" placeholder="Category (optional)" style="max-width:180px" />
      <input type="file" id="fileUploadInput" hidden />
      <button type="button" id="fileUploadBtn" class="dash-file-upload-btn" ${projects.length ? "" : "disabled"}>
        <span class="material-symbols-outlined">upload</span> Upload File
      </button>
    </div>`;

  const fileInput = document.getElementById("fileUploadInput");
  const uploadBtn = document.getElementById("fileUploadBtn");

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const projectId = document.getElementById("fileUploadProject").value;
    const category = document.getElementById("fileUploadCategory").value.trim();
    if (!projectId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    if (category) formData.append("category", category);

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";

    try {
      await apiFetch("/api/files", { method: "POST", body: formData });
      await loadFiles();
    } catch (err) {
      console.error("Failed to upload file:", err instanceof ApiError ? err.message : err);
    } finally {
      fileInput.value = "";
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<span class="material-symbols-outlined">upload</span> Upload File`;
    }
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
      await loadFiles();
    } catch (err) {
      console.error("Failed to delete file:", err instanceof ApiError ? err.message : err);
    }
  }
});

// The download endpoint returns raw bytes, not JSON, so it goes through a
// direct authenticated fetch (with a single silent-refresh retry on 401)
// rather than apiFetch, which always parses the response as JSON.
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
let activeConversationId = null;
let activeConversationProjectId = null;
let conversationsCache = [];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function conversationPreviewText(conv, currentUserId) {
  if (!conv.lastMessage) return "No messages yet";
  const prefix = conv.lastMessage.senderId === currentUserId ? "You: " : "";
  return `${prefix}${conv.lastMessage.body}`;
}

function conversationItem(conv, currentUserId) {
  return `
    <button
      type="button"
      class="dash-conversation-item ${conv.id === activeConversationId ? "is-active" : ""}"
      data-conversation-id="${conv.id}"
      data-project-id="${conv.project.id}"
    >
      <span class="dash-conversation-name">
        <span>${escapeHtml(conv.project.name)}</span>
        ${conv.unreadCount > 0 ? `<span class="dash-unread-dot">${conv.unreadCount}</span>` : ""}
      </span>
      <span class="dash-conversation-preview">${escapeHtml(conversationPreviewText(conv, currentUserId))}</span>
    </button>`;
}

function emptyConversationsState() {
  return `
    <div class="dash-empty-state" style="padding: 2rem 1rem">
      <div class="dash-empty-icon">
        <span class="material-symbols-outlined">chat_bubble</span>
      </div>
      <h3>No conversations</h3>
      <p>Conversations tied to your projects will show up here.</p>
    </div>`;
}

function errorConversationsState() {
  return `
    <div class="dash-empty-state" style="padding: 2rem 1rem">
      <div class="dash-empty-icon">
        <span class="material-symbols-outlined">error</span>
      </div>
      <h3>Couldn't load conversations</h3>
    </div>`;
}

function renderConversationsList() {
  const container = document.getElementById("conversationsList");
  if (!container) return;
  const user = getCurrentUser();

  container.innerHTML = conversationsCache.length
    ? conversationsCache.map((c) => conversationItem(c, user?.id)).join("")
    : emptyConversationsState();
}

async function loadConversations({ selectFirst = false } = {}) {
  const container = document.getElementById("conversationsList");
  if (!container) return;

  try {
    const { data } = await apiFetch("/api/messages");
    conversationsCache = data.conversations || [];
    renderConversationsList();

    if (selectFirst && !activeConversationId && conversationsCache.length) {
      const first = conversationsCache[0];
      await selectConversation(first.id, first.project.id);
    }
  } catch (err) {
    console.error("Failed to load conversations:", err instanceof ApiError ? err.message : err);
    container.innerHTML = errorConversationsState();
  }
}

function messageBubble(message, currentUserId) {
  const isOwn = message.sender?.id === currentUserId;
  const senderLabel = isOwn
    ? "You"
    : `${message.sender?.firstName || ""} ${message.sender?.lastName || ""}`.trim();

  return `
    <div class="dash-message-bubble ${isOwn ? "is-own" : "is-other"}">
      <div>${escapeHtml(message.body)}</div>
      ${
        message.attachment
          ? `<div class="dash-message-attachment">
               <span class="material-symbols-outlined">attach_file</span>
               ${escapeHtml(message.attachment.filename)}
             </div>`
          : ""
      }
      <div class="dash-message-meta">${escapeHtml(senderLabel)} · ${formatTime(message.createdAt)}</div>
    </div>`;
}

function emptyMessagesState() {
  return `
    <div class="dash-empty-state">
      <div class="dash-empty-icon">
        <span class="material-symbols-outlined">chat_bubble</span>
      </div>
      <h3>No messages yet</h3>
      <p>Send the first message to start the conversation.</p>
    </div>`;
}

function errorMessagesState() {
  return `
    <div class="dash-empty-state">
      <div class="dash-empty-icon">
        <span class="material-symbols-outlined">error</span>
      </div>
      <h3>Couldn't load messages</h3>
      <p>Something went wrong on our end. Please refresh to try again.</p>
    </div>`;
}

// Populates the composer's attachment picker from files already uploaded to
// this project — messaging only ever *references* a File, never uploads one.
async function populateAttachmentOptions(projectId) {
  const select = document.getElementById("messageAttachSelect");
  if (!select) return;

  select.innerHTML = `<option value="">No attachment</option>`;

  try {
    const { data } = await apiFetch(`/api/files?projectId=${projectId}`);
    const files = data.files || [];
    files.forEach((f) => {
      const option = document.createElement("option");
      option.value = f.id;
      option.textContent = f.filename;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load attachment options:", err instanceof ApiError ? err.message : err);
  }
}

async function selectConversation(conversationId, projectId) {
  activeConversationId = conversationId;
  activeConversationProjectId = projectId;

  document.querySelectorAll("[data-conversation-id]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.conversationId === conversationId);
  });

  const form = document.getElementById("messageComposerForm");
  form?.classList.remove("is-hidden");

  await Promise.all([loadMessages(conversationId), populateAttachmentOptions(projectId)]);
}

async function loadMessages(conversationId) {
  const body = document.getElementById("messageThreadBody");
  const header = document.getElementById("messageThreadHeader");
  if (!body) return;

  const conv = conversationsCache.find((c) => c.id === conversationId);
  if (header) header.textContent = conv ? conv.project.name : "Conversation";

  try {
    const { data } = await apiFetch(`/api/messages/${conversationId}`);
    const messages = data.messages || [];
    const user = getCurrentUser();

    body.innerHTML = messages.length
      ? messages.map((m) => messageBubble(m, user?.id)).join("")
      : emptyMessagesState();
    body.scrollTop = body.scrollHeight;

    // Opening the conversation just cleared unread counts server-side
    await loadConversations();
  } catch (err) {
    console.error("Failed to load messages:", err instanceof ApiError ? err.message : err);
    body.innerHTML = errorMessagesState();
  }
}

function initMessageComposer() {
  const form = document.getElementById("messageComposerForm");
  const input = document.getElementById("messageComposerInput");
  const attachSelect = document.getElementById("messageAttachSelect");
  const sendBtn = document.getElementById("messageComposerSend");
  if (!form || !input) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !activeConversationProjectId) return;

    const attachmentId = attachSelect?.value || undefined;

    if (sendBtn) sendBtn.disabled = true;

    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          projectId: activeConversationProjectId,
          body: text,
          ...(attachmentId ? { attachmentId } : {}),
        }),
      });
      input.value = "";
      if (attachSelect) attachSelect.value = "";
      await loadMessages(activeConversationId);
    } catch (err) {
      console.error("Failed to send message:", err instanceof ApiError ? err.message : err);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  });
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-conversation-id]");
  if (!item) return;
  selectConversation(item.dataset.conversationId, item.dataset.projectId);
});

// Polling every 10 seconds keeps the conversation list and any open thread
// fresh without WebSockets. Swapping this for a socket subscription later
// shouldn't require touching loadConversations()/loadMessages() callers.
function startMessagesPolling() {
  setInterval(() => {
    loadConversations();
    if (activeConversationId) loadMessages(activeConversationId);
  }, 10000);
}

/* ---------------------------------------------------------
   SECTION SWITCHING (Overview / Projects / Messages / Files /
   Invoices / Settings / Notifications)
   --------------------------------------------------------- */
function initSectionNav() {
  const navButtons = document.querySelectorAll("[data-dash-nav]");
  const sections = document.querySelectorAll("[data-dash-section]");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.dashNav;

      navButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
      sections.forEach((s) =>
        s.classList.toggle("is-active", s.dataset.dashSection === target),
      );

      // Close mobile nav drawer after selecting a section
      document.getElementById("dashSidebar")?.classList.remove("is-open");
    });
  });
}

/* ---------------------------------------------------------
   MOBILE SIDEBAR TOGGLE
   --------------------------------------------------------- */
function initMobileToggle() {
  const toggleBtn = document.getElementById("dashMobileToggle");
  const sidebar = document.getElementById("dashSidebar");
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", () =>
    sidebar.classList.toggle("is-open"),
  );
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("is-open") &&
      !sidebar.contains(e.target) &&
      e.target !== toggleBtn
    ) {
      sidebar.classList.remove("is-open");
    }
  });
}

/* ---------------------------------------------------------
   LOGOUT
   --------------------------------------------------------- */
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
document.addEventListener("DOMContentLoaded", () => {
  initSectionNav();
  initMobileToggle();
  initLogout();
});
