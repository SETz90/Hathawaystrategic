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
