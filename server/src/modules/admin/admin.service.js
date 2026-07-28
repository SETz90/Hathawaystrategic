import { prisma } from "../../lib/prisma.js";

export const getKpis = async () => {
  const [
    clientsCount,
    projectsCount,
    activeProjectsCount,
    completedProjectsCount,
    filesCount,
    unreadMessagesCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT", deletedAt: null } }),
    prisma.project.count(),
    prisma.project.count({
      where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] } },
    }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.file.count(),
    // Messages sent by clients that no admin has read yet
    prisma.message.count({
      where: { read: false, sender: { role: "CLIENT" } },
    }),
  ]);

  return {
    clientsCount,
    projectsCount,
    activeProjectsCount,
    completedProjectsCount,
    filesCount,
    unreadMessagesCount,
  };
};

/** Merges recent files, messages, and project updates into a single reverse-chronological feed. */
export const getRecentActivity = async (limit = 12) => {
  const [recentFiles, recentMessages, recentProjects] = await Promise.all([
    prisma.file.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        project: { select: { id: true, name: true, clientId: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.message.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        conversation: {
          select: { project: { select: { id: true, name: true } } },
        },
        sender: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.project.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const events = [
    ...recentFiles.map((f) => ({
      type: "file",
      id: f.id,
      timestamp: f.createdAt,
      text: `${f.uploadedBy ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName}` : "Someone"} uploaded ${f.filename}`,
      projectId: f.project?.id,
      projectName: f.project?.name,
    })),
    ...recentMessages.map((m) => ({
      type: "message",
      id: m.id,
      timestamp: m.createdAt,
      text: `${m.sender.firstName} ${m.sender.lastName} sent a message on ${m.conversation.project?.name || "a project"}`,
      projectId: m.conversation.project?.id,
      projectName: m.conversation.project?.name,
    })),
    ...recentProjects.map((p) => ({
      type: "project",
      id: p.id,
      // A project is "created" if its update timestamp still matches creation
      timestamp: p.updatedAt,
      text:
        p.updatedAt.getTime() === p.createdAt.getTime()
          ? `Project "${p.name}" was created`
          : `Project "${p.name}" was updated — now ${p.status.replaceAll("_", " ").toLowerCase()}`,
      projectId: p.id,
      projectName: p.name,
    })),
  ];

  return events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};
