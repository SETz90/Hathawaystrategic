import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

/* ---------------------------------------------------------
   Config guard
   Email is an enhancement on top of the database notification system,
   not a replacement for it — same posture as push.service.js. If
   BREVO_SMTP_LOGIN / BREVO_SMTP_KEY aren't set (local dev, or before the
   env vars are added on Render), sendEmail() no-ops instead of throwing,
   and everything else (in-app bell, browser push) keeps working.
   --------------------------------------------------------- */
let warnedOnce = false;

const isConfigured = () => {
  if (env.brevo.login && env.brevo.key) return true;
  if (!warnedOnce) {
    console.warn(
      "[email] BREVO_SMTP_LOGIN/BREVO_SMTP_KEY not set — outgoing email is disabled. " +
        "In-app and push notifications are unaffected. Set BREVO_SMTP_LOGIN, BREVO_SMTP_KEY " +
        "(an SMTP key generated in Brevo, not your account password), and EMAIL_FROM to enable it.",
    );
    warnedOnce = true;
  }
  return false;
};

/* ---------------------------------------------------------
   Transport
   Created lazily and cached — createTransport() is cheap and doesn't
   touch the network itself, but there's no reason to redo it per send.
   Brevo's relay uses STARTTLS on 587 (their documented default), not
   implicit TLS on 465.
   --------------------------------------------------------- */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  console.log("Creating Brevo transporter...");

  transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 465,
    secure: true,
    auth: {
      user: env.brevo.login,
      pass: env.brevo.key,
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
 * @returns {Promise<boolean>} true if Brevo accepted the message
 */
export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to || !subject || !html) {
    console.error(
      "[email] sendEmail called with missing to/subject/html — skipping",
    );
    return false;
  }

  if (!isConfigured()) return false;

  try {
    console.log("Preparing email...");
    console.log("SMTP Login:", env.brevo.login);
    console.log("EMAIL_FROM:", env.brevo.from);

    const transporter = getTransporter();

    console.log("Sending email...");

    const info = await transporter.sendMail({
      from: env.brevo.from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    console.log("Email sent successfully!");
    console.log(info);

    return true;
  } catch (err) {
    console.error("[email] Failed to send:");
    console.error(err);
    return false;
  }
};
