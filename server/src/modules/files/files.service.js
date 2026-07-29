import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { UPLOAD_DIR } from "../../lib/uploadStorage.js";
import { notifyUser, notifyAdmins } from "../notifications/notifications.service.js";
import { sendFileUploadedEmail } from "../../services/email/index.js";

const fileSelect = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  category: true,
  projectId: true,
  createdAt: true,
  project: { select: { id: true, name: true, clientId: true } },
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
};

const assertOwnsOrAdmin = (file, user) => {
  if (!file) throw new ApiError(404, "File not found");
  if (user.role !== "ADMIN" && file.project.clientId !== user.id) {
    throw new ApiError(404, "File not found");
  }
};

export const listFilesForUser = async (user, { projectId } = {}) => {
  const where =
    user.role === "ADMIN"
      ? projectId
        ? { projectId }
        : {}
      : { project: { clientId: user.id }, ...(projectId ? { projectId } : {}) };

  return prisma.file.findMany({
    where,
    select: fileSelect,
    orderBy: { createdAt: "desc" },
  });
};

// storedName is only needed internally (download/delete), never returned to clients directly
export const getFileForUser = async (user, fileId) => {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { ...fileSelect, storedName: true },
  });
  assertOwnsOrAdmin(file, user);
  return file;
};

export const createFile = async (user, { projectId, category }, uploadedFile) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    // Don't leave an orphaned file on disk if the project turned out invalid
    await fs.unlink(uploadedFile.path).catch(() => {});
    throw new ApiError(404, "Project not found");
  }

  const file = await prisma.file.create({
    data: {
      filename: uploadedFile.originalname,
      storedName: uploadedFile.filename,
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      category: category || null,
      projectId,
      uploadedById: user.id,
    },
    select: fileSelect,
  });

  const notifyPayload = {
    type: "FILE_UPLOADED",
    title: "File Uploaded",
    message: `${file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : "Someone"} uploaded ${file.filename} to ${project.name}`,
    relatedEntityType: "FILE",
    relatedEntityId: file.id,
  };
  if (user.role === "ADMIN") {
    await notifyUser({ userId: project.clientId, ...notifyPayload });
  } else {
    await notifyAdmins(notifyPayload);
  }

  // Fire-and-forget: email is a side channel, never allowed to fail the upload
  const uploaderName = file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : "Someone";
  const emailPayload = { projectName: project.name, filename: file.filename, uploaderName };
  const sendFilePromise =
    user.role === "ADMIN"
      ? sendFileUploadedEmail({ userId: project.clientId }, emailPayload)
      : sendFileUploadedEmail({ admins: true }, emailPayload);
  sendFilePromise.catch((err) => console.error("Failed to send file-uploaded email:", err));

  return file;
};

export const deleteFile = async (fileId) => {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new ApiError(404, "File not found");

  await fs.unlink(path.join(UPLOAD_DIR, file.storedName)).catch(() => {
    // Metadata row is the source of truth; a missing disk file shouldn't block deletion
  });
  await prisma.file.delete({ where: { id: fileId } });
};
