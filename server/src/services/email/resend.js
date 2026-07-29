import { env } from "../../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

/* ---------------------------------------------------------
   Config guard
   Email is an enhancement on top of the database notification system,
   not a replacement for it — same posture as push.service.js. If
   RESEND_API_KEY isn't set (local dev, or before the env var is added
   on Render), sendEmail() no-ops instead of throwing, and everything
   else (in-app bell, browser push) keeps working.
   --------------------------------------------------------- */
let warnedOnce = false;

const isConfigured = () => {
  if (env.resend.apiKey) return true;
  if (!warnedOnce) {
    console.warn(
      "[email] RESEND_API_KEY not set — outgoing email is disabled. " +
        "In-app and push notifications are unaffected. Set RESEND_API_KEY (and EMAIL_FROM) to enable it.",
    );
    warnedOnce = true;
  }
  return false;
};

/**
 * Low-level send. Never throws — a failed email must never fail or roll
 * back the action that triggered it (registration, a project update,
 * etc.), same contract as sendPushForNotification. Callers that need to
 * know whether it actually went out can check the resolved boolean.
 *
 * @param {{ to: string, subject: string, html: string, text?: string, replyTo?: string }} message
 * @returns {Promise<boolean>} true if Resend accepted the message
 */
export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to || !subject || !html) {
    console.error("[email] sendEmail called with missing to/subject/html — skipping");
    return false;
  }
  if (!isConfigured()) return false;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resend.from,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend rejected message (${res.status}):`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err.message || err);
    return false;
  }
};
