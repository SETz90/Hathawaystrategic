import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { notifyUser, notifyAdmins } from "../notifications/notifications.service.js";
import { sendNewMessageEmail } from "../../services/email/index.js";

const projectSelect = { id: true, name: true, clientId: true };
const senderSelect = { id: true, firstName: true, lastName: true, role: true };
const attachmentSelect = { id: true, filename: true, mimeType: true, size: true };

const assertOwnsOrAdmin = (project, user) => {
  if (!project) throw new ApiError(404, "Project not found");
  if (user.role !== "ADMIN" && project.clientId !== user.id) {
    throw new ApiError(404, "Project not found");
  }
};

/** Finds the project's conversation, creating it on first access (1 conversation per project). */
const ensureConversationForProject = async (projectId) => {
  return prisma.conversation.upsert({
    where: { projectId },
    update: {},
    create: { projectId },
  });
};

/** Returns the list of projects a user is allowed to see conversations for. */
const listProjectsInScope = async (user, { projectId, clientId } = {}) => {
  if (user.role === "ADMIN") {
    return prisma.project.findMany({
      where: {
        ...(projectId ? { id: projectId } : {}),
        ...(clientId ? { clientId } : {}),
      },
      select: projectSelect,
    });
  }
  return prisma.project.findMany({
    where: { clientId: user.id, ...(projectId ? { id: projectId } : {}) },
    select: projectSelect,
  });
};

export const listConversationsForUser = async (user, { projectId, clientId } = {}) => {
  const projects = await listProjectsInScope(user, { projectId, clientId });
  if (projects.length === 0) return [];

  // Every in-scope project gets a conversation thread, even before a first message is sent
  await Promise.all(projects.map((p) => ensureConversationForProject(p.id)));

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const conversations = await prisma.conversation.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    conversations.map(async (conversation) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, body: true, senderId: true, createdAt: true, read: true },
        }),
        prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: user.id },
            read: false,
          },
        }),
      ]);

      return {
        id: conversation.id,
        project: projectById.get(conversation.projectId),
        lastMessage,
        unreadCount,
        updatedAt: conversation.updatedAt,
      };
    }),
  );
};

const getConversationOrThrow = async (conversationId) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { project: { select: projectSelect } },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
};

export const getMessagesForUser = async (user, conversationId) => {
  const conversation = await getConversationOrThrow(conversationId);
  assertOwnsOrAdmin(conversation.project, user);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: senderSelect }, attachment: { select: attachmentSelect } },
  });

  // Opening a conversation marks the other party's messages as read
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: user.id }, read: false },
    data: { read: true },
  });

  return messages;
};

export const createMessage = async (user, { projectId, body, attachmentId }) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectSelect,
  });
  assertOwnsOrAdmin(project, user);

  if (attachmentId) {
    const attachment = await prisma.file.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.projectId !== projectId) {
      throw new ApiError(400, "Attachment must belong to the same project");
    }
  }

  const conversation = await ensureConversationForProject(projectId);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body,
      attachmentId: attachmentId || null,
    },
    include: { sender: { select: senderSelect }, attachment: { select: attachmentSelect } },
  });

  // Bump conversation.updatedAt so it resurfaces to the top of the list
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Clients notify every admin; an admin's reply notifies just that project's client
  const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
  const notifyPayload = {
    type: "NEW_MESSAGE",
    title: "New Message",
    message: `${message.sender.firstName} ${message.sender.lastName} sent a message about ${project.name}: ${preview}`,
    relatedEntityType: "CONVERSATION",
    relatedEntityId: conversation.id,
  };
  if (user.role === "ADMIN") {
    await notifyUser({ userId: project.clientId, ...notifyPayload });
  } else {
    await notifyAdmins(notifyPayload);
  }

  // Fire-and-forget: email is a side channel, never allowed to fail sending a message
  const senderName = `${message.sender.firstName} ${message.sender.lastName}`;
  const emailPayload = { senderName, projectName: project.name, preview };
  const sendMessagePromise =
    user.role === "ADMIN"
      ? sendNewMessageEmail({ userId: project.clientId }, emailPayload)
      : sendNewMessageEmail({ admins: true, excludeUserId: user.id }, emailPayload);
  sendMessagePromise.catch((err) => console.error("Failed to send new-message email:", err));

  return message;
};

export const markMessageRead = async (user, messageId) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: { include: { project: { select: projectSelect } } } },
  });
  if (!message) throw new ApiError(404, "Message not found");
  assertOwnsOrAdmin(message.conversation.project, user);

  return prisma.message.update({
    where: { id: messageId },
    data: { read: true },
    include: { sender: { select: senderSelect }, attachment: { select: attachmentSelect } },
  });
};

export const deleteMessage = async (messageId) => {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new ApiError(404, "Message not found");
  await prisma.message.delete({ where: { id: messageId } });
};
