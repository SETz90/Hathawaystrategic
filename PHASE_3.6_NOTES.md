# Phase 3.6 — Email Integration (Gmail SMTP)

Email is now the third notification channel alongside in-app and browser push,
following the exact "optional, no-op if unconfigured" posture already used by
`push.service.js` for VAPID — nothing about push or in-app notifications changed.

Originally built on Resend, but Resend requires a verified custom domain to
send to arbitrary recipients in production, and this project currently only
has the `hathawaystrategic.netlify.app` domain (no custom domain purchased
yet). The provider layer was swapped to Gmail SMTP via Nodemailer instead;
nothing above the provider layer changed — see "What changed" below.

## 1. Install / environment

One new npm dependency was added: `nodemailer` (see `server/package.json`).
Run `npm install` in `server/` to pull it in and update the lockfile.

`smtp.js` connects to `smtp.gmail.com` on port 465 (implicit TLS) using
Nodemailer's `createTransport`.

Add to your `.env` (and to Render's environment variables):

```
SMTP_EMAIL=hathawaystrategic@gmail.com
SMTP_PASSWORD=your_google_app_password
EMAIL_FROM="Hathaway Strategic <hathawaystrategic@gmail.com>"
```

**`SMTP_PASSWORD` must be a Google App Password, not the Gmail account
password.** App Passwords require 2-Step Verification to be turned on for
the Google account first, then can be generated at
https://myaccount.google.com/apppasswords. A regular Gmail password will be
rejected by Google's SMTP servers.

**`EMAIL_FROM` should use the same address as `SMTP_EMAIL`** (or a verified
"Send As" alias configured in that Gmail account's settings) — Gmail's SMTP
servers generally reject or silently rewrite a `From` address that doesn't
belong to the authenticated account, unlike Resend which allowed any
`EMAIL_FROM` once a domain was verified.

If `SMTP_EMAIL` or `SMTP_PASSWORD` is left blank, `sendEmail()` no-ops with a
single startup warning — the app runs fine without it, same as push.

Links inside emails are built from the existing `CLIENT_URL` env var — no new
URL variable was introduced.

## What changed vs. the original Resend version

Only the provider layer:

- `server/src/services/email/resend.js` removed, replaced by
  `server/src/services/email/smtp.js` (Nodemailer over Gmail SMTP instead of
  the Resend REST API).
- `env.js`: `env.resend` → `env.smtp` (`SMTP_EMAIL` / `SMTP_PASSWORD` /
  `EMAIL_FROM` instead of `RESEND_API_KEY` / `EMAIL_FROM`).
- `email/index.js`: one import line now points at `./smtp.js` instead of
  `./resend.js`. Its exported functions (`sendWelcomeEmail`,
  `sendVerificationEmail`, `sendPasswordResetEmail`,
  `sendProjectAssignedEmail`, `sendProjectStatusUpdatedEmail`,
  `sendProjectCompletedEmail`, `sendNewMessageEmail`,
  `sendFileUploadedEmail`) are unchanged, so `auth.service.js`,
  `projects.service.js`, `files.service.js`, and `messages.service.js`
  needed no changes at all.
- `.env.example` and this file updated to match.

Everything else — templates, `layout.js`, preference logic, the fire-and-
forget "never throws" contract, the new auth endpoints, and the frontend
toggles — is exactly as it was.

## 2. Database migration

Four boolean columns were added to `User` in `schema.prisma`:
`emailNotifyMessages`, `emailNotifyFiles`, `emailNotifyProjectUpdates`,
`emailNotifyProjectCompleted` (all default `true`). Run:

```
npx prisma migrate dev --name add_email_preferences
```

(I didn't hand-write a migration file since your local migration history
isn't in the zip — `migrate dev` will generate the right one against your
actual schema state.)

## 3. What's new

**`server/src/services/email/`** — the centralized email service:
- `smtp.js` — low-level `sendEmail()` (Nodemailer over Gmail SMTP), never throws
- `layout.js` — shared branded HTML wrapper (dark/gold, matches site tokens) + plain-text fallback
- `templates/` — welcome, emailVerification, passwordReset, newProject, newMessage, fileUpload, projectStatusUpdate, projectCompleted
- `index.js` — exports the specialized senders every module calls:
  `sendWelcomeEmail`, `sendVerificationEmail`, `sendPasswordResetEmail`,
  `sendProjectAssignedEmail`, `sendProjectStatusUpdatedEmail`,
  `sendProjectCompletedEmail`, `sendNewMessageEmail`, `sendFileUploadedEmail`

**Preferences**: `sendNewMessageEmail`, `sendFileUploadedEmail`,
`sendProjectAssignedEmail`, and `sendProjectStatusUpdatedEmail` respect the
recipient's preference flags; `sendProjectCompletedEmail` respects
`emailNotifyProjectCompleted`. Welcome, verification, and password-reset are
transactional and always sent.

**New endpoints** (`auth` module):
- `POST /api/auth/verify-email` `{ token }` — consumes the link from the
  verification email (there was no endpoint for this before; the token was
  generated but never consumable). `login.html?verify=<token>` calls it
  automatically on page load.
- `PATCH /api/auth/email-preferences` (auth required) — updates the caller's
  own preference flags. `GET /api/auth/me` now also returns
  `emailPreferences` and `createdAt`.

**Integration points** (all fire-and-forget, matching the existing
`sendPushForNotification` pattern — an email failure never fails or rolls
back the action that triggered it):
- `auth.service.js`: `registerUser` → welcome + verification email; `requestPasswordReset` → reset email
- `projects.service.js`: `createProject` → project-assigned email; `updateProject` → status-updated email, or completed email if the new status is `COMPLETED`
- `files.service.js`: `createFile` → file-uploaded email to whichever side gets the in-app notification (client or admins)
- `messages.service.js`: `createMessage` → new-message email, same recipient logic as above

**Frontend**: both `admin-dashboard.html` and `client-dashboard.html` settings
tabs now have an "Email Notifications" card with 4 toggles wired to
`PATCH /api/auth/email-preferences` (`admin-dashboard.js` / `dashboard.js`).
`login.html` handles `?verify=<token>` on load.

## 4. Known limitations / things worth a second pass

- Email CTA links route to a dashboard *section* (`#projects`, `#files`,
  `#messages`), not a specific record — the dashboards only support
  section-level hash routing today (see `openSectionFromHash()`), so this
  matches existing push-notification link behavior rather than inventing
  new routing.
- If someone clicks the verification link while still logged in from a
  recent registration, `redirectIfAuthenticated()` on `login.html` will send
  them straight to their dashboard before the "Email verified" banner has a
  chance to render — verification still succeeds, they just won't see the
  confirmation message in that specific case.
- All new/edited `.js` files pass `node --check`; I couldn't run the app
  end-to-end (no DB connection, no `node_modules`, no network in this
  environment), so please smoke-test registration → verification →
  password reset → a project status change → a message → a file upload once
  it's running against your dev database.
