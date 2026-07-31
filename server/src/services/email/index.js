import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "./smtp.js";
import { welcomeEmail } from "./templates/welcome.js";
import { emailVerificationEmail } from "./templates/emailVerification.js";
import { passwordResetEmail } from "./templates/passwordReset.js";
import { newProjectEmail } from "./templates/newProject.js";
import { newMessageEmail } from "./templates/newMessage.js";
import { fileUploadEmail } from "./templates/fileUpload.js";
import { projectStatusUpdateEmail } from "./templates/projectStatusUpdate.js";
import { projectCompletedEmail } from "./templates/projectCompleted.js";

/* ---------------------------------------------------------
   INTERNAL FAN-OUT HELPERS
   Every activity email (as opposed to the transactional welcome/verify/
   reset ones) needs to: look up the recipient(s), respect their per-event
   preference, and never throw. These two helpers own that so each
   sendXEmail() below is a one-liner. Modeled directly on notifyUser /
   notifyAdmins in notifications.service.js.
   --------------------------------------------------------- */

const recipientSelect = {
  id: true,
  email: true,
  firstName: true,
  role: true,
  emailNotifyMessages: true,
  emailNotifyFiles: true,
  emailNotifyProjectUpdates: true,
  emailNotifyProjectCompleted: true,
};

/** Sends to a single user if they exist and haven't opted out of `prefField`. */
const sendToUser = async (userId, prefField, buildTemplate) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: recipientSelect,
    });
    if (!user || user[prefField] === false) return;

    const { subject, html, text } = buildTemplate(user);
    await sendEmail({ to: user.email, subject, html, text });
  } catch (err) {
    console.error(
      `[email] sendToUser(${prefField}) failed:`,
      err.message || err,
    );
  }
};

/** Sends to every admin who hasn't opted out of `prefField`. */
const sendToAdmins = async (
  prefField,
  buildTemplate,
  { excludeUserId } = {},
) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        deletedAt: null,
        [prefField]: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: recipientSelect,
    });
    await Promise.all(
      admins.map(async (admin) => {
        const { subject, html, text } = buildTemplate(admin);
        await sendEmail({ to: admin.email, subject, html, text });
      }),
    );
  } catch (err) {
    console.error(
      `[email] sendToAdmins(${prefField}) failed:`,
      err.message || err,
    );
  }
};

/* ---------------------------------------------------------
   TRANSACTIONAL — always sent, no preference check
   --------------------------------------------------------- */

export const sendWelcomeEmail = async (user) => {
  const { subject, html, text } = welcomeEmail({ firstName: user.firstName });
  await sendEmail({ to: user.email, subject, html, text });
};

export const sendVerificationEmail = async (user, token) => {
  const { subject, html, text } = emailVerificationEmail({
    firstName: user.firstName,
    token,
  });
  await sendEmail({ to: user.email, subject, html, text });
};

export const sendPasswordResetEmail = async (user, token) => {
  const { subject, html, text } = passwordResetEmail({
    firstName: user.firstName,
    token,
  });
  await sendEmail({ to: user.email, subject, html, text });
};

/* ---------------------------------------------------------
   ACTIVITY — preference-aware
   --------------------------------------------------------- */

export const sendProjectAssignedEmail = (
  clientId,
  { projectName, status, priority },
) =>
  sendToUser(clientId, "emailNotifyProjectUpdates", (user) =>
    newProjectEmail({
      firstName: user.firstName,
      projectName,
      status,
      priority,
    }),
  );

export const sendProjectStatusUpdatedEmail = (
  clientId,
  { projectName, oldStatus, newStatus, progress },
) =>
  sendToUser(clientId, "emailNotifyProjectUpdates", (user) =>
    projectStatusUpdateEmail({
      firstName: user.firstName,
      projectName,
      oldStatus,
      newStatus,
      progress,
    }),
  );

export const sendProjectCompletedEmail = (clientId, { projectName }) =>
  sendToUser(clientId, "emailNotifyProjectCompleted", (user) =>
    projectCompletedEmail({ firstName: user.firstName, projectName }),
  );

/** recipient is either { userId } (a specific client) or { admins: true, excludeUserId? }. */
export const sendNewMessageEmail = (
  recipient,
  { senderName, projectName, preview },
) => {
  const buildTemplate = (isAdminRecipient) => (user) =>
    newMessageEmail({
      firstName: user.firstName,
      senderName,
      projectName,
      preview,
      isAdminRecipient,
    });

  if (recipient.admins) {
    return sendToAdmins("emailNotifyMessages", buildTemplate(true), {
      excludeUserId: recipient.excludeUserId,
    });
  }
  return sendToUser(
    recipient.userId,
    "emailNotifyMessages",
    buildTemplate(false),
  );
};

/** recipient is either { userId } (a specific client) or { admins: true, excludeUserId? }. */
export const sendFileUploadedEmail = (
  recipient,
  { projectName, filename, uploaderName },
) => {
  const buildTemplate = (isAdminRecipient) => (user) =>
    fileUploadEmail({
      firstName: user.firstName,
      projectName,
      filename,
      uploaderName,
      isAdminRecipient,
    });

  if (recipient.admins) {
    return sendToAdmins("emailNotifyFiles", buildTemplate(true), {
      excludeUserId: recipient.excludeUserId,
    });
  }
  return sendToUser(recipient.userId, "emailNotifyFiles", buildTemplate(false));
};
