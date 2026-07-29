import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

/* ---------------------------------------------------------
   Config guard
   Email is an enhancement on top of the database notification system,
   not a replacement for it — same posture as push.service.js. If
   SMTP_EMAIL / SMTP_PASSWORD aren't set (local dev, or before the env
   vars are added on Render), sendEmail() no-ops instead of throwing, and
   everything else (in-app bell, browser push) keeps working.
   --------------------------------------------------------- */
let warnedOnce = false;

const isConfigured = () => {
  if (env.smtp.email && env.smtp.password) return true;
  if (!warnedOnce) {
    console.warn(
      "[email] SMTP_EMAIL/SMTP_PASSWORD not set — outgoing email is disabled. " +
        "In-app and push notifications are unaffected. Set SMTP_EMAIL, SMTP_PASSWORD " +
        "(a Google App Password, not your Gmail password), and EMAIL_FROM to enable it.",
    );
    warnedOnce = true;
  }
  return false;
};

/* ---------------------------------------------------------
   Transport
   Created lazily and cached — createTransport() is cheap and doesn't
   touch the network itself, but there's no reason to redo it per send.
   --------------------------------------------------------- */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: env.smtp.email,
      pass: env.smtp.password,
    },
  });

  return transporter;
};

/**
 * Low-level send. Never throws — a failed email must never fail or roll
 * back the action that triggered it (registration, a project update,
 * etc.), same contract as sendPushForNotification. Callers that need to
 * know whether it actually went out can check the resolved boolean.
 *
 * @param {{ to: string, subject: string, html: string, text?: string, replyTo?: string }} message
 * @returns {Promise<boolean>} true if Gmail SMTP accepted the message
 */
export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to || !subject || !html) {
    console.error("[email] sendEmail called with missing to/subject/html — skipping");
    return false;
  }
  if (!isConfigured()) return false;

  try {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err.message || err);
    return false;
  }
};
