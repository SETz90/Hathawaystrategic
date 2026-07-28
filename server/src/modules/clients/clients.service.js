import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

const clientListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  emailVerified: true,
  deletedAt: true,
  createdAt: true,
  _count: { select: { projects: true } },
};

const clientDetailSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  emailVerified: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

/** Every write in this module operates on Users with role=CLIENT only — never admins. */
const findClientOrThrow = async (clientId) => {
  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client || client.role !== "CLIENT") {
    throw new ApiError(404, "Client not found");
  }
  return client;
};

export const listClients = async ({ search, status } = {}) => {
  const where = {
    role: "CLIENT",
    ...(status === "ACTIVE"
      ? { isActive: true, deletedAt: null }
      : status === "DISABLED"
        ? { isActive: false, deletedAt: null }
        : status === "ALL"
          ? {}
          : { deletedAt: null }), // default: hide soft-deleted clients
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const clients = await prisma.user.findMany({
    where,
    select: clientListSelect,
    orderBy: { createdAt: "desc" },
  });

  return clients.map(({ _count, ...client }) => ({
    ...client,
    projectCount: _count.projects,
  }));
};

export const getClientProfile = async (clientId) => {
  const full = await prisma.user.findUnique({ where: { id: clientId } });
  if (!full || full.role !== "CLIENT") {
    throw new ApiError(404, "Client not found");
  }
  const {
    passwordHash,
    emailVerifyToken,
    emailVerifyExpiry,
    passwordResetToken,
    passwordResetExpiry,
    ...client
  } = full;

  const [projects, files, conversations] = await Promise.all([
    prisma.project.findMany({
      where: { clientId },
      include: { milestones: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.file.findMany({
      where: { project: { clientId } },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        category: true,
        projectId: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.conversation.findMany({
      where: { project: { clientId } },
      select: {
        id: true,
        projectId: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { client, projects, files, conversations };
};

export const setClientActive = async (clientId, isActive) => {
  await findClientOrThrow(clientId);
  return prisma.user.update({
    where: { id: clientId },
    data: { isActive },
    select: clientDetailSelect,
  });
};

/** Soft delete: flips isActive off (blocks login) and stamps deletedAt (hides from default lists). */
export const softDeleteClient = async (clientId) => {
  await findClientOrThrow(clientId);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: clientId },
      data: { isActive: false, deletedAt: new Date() },
    }),
    // Deleting a client shouldn't leave stale sessions valid
    prisma.refreshToken.updateMany({
      where: { userId: clientId, revoked: false },
      data: { revoked: true },
    }),
  ]);
};

export const restoreClient = async (clientId) => {
  await findClientOrThrow(clientId);
  return prisma.user.update({
    where: { id: clientId },
    data: { deletedAt: null },
    select: clientDetailSelect,
  });
};
