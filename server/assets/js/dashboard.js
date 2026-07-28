/* =========================================================
   HATHAWAY STRATEGIC — CLIENT DASHBOARD LOGIC
   Page-specific: guards the route, renders the welcome card,
   drives section tabs, and handles logout. Data sections
   (Projects/Messages/Files/Invoices) show honest empty states
   since those APIs don't exist yet — this ships clean now and
   just needs an apiFetch() call swapped in per section later.
   ========================================================= */

import {
  requireAuthOrRedirect,
  logout,
  getCurrentUser,
} from "./auth-client.js";
import { apiFetch, ApiError } from "./api-client.js";

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
  },
  { once: true },
);

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
