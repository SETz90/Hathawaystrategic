import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

const milestoneOrder = { orderBy: { order: "asc" } };

/** Recomputes progress from milestone completion ratio when the project has milestones. */
const recomputeProgress = async (projectId) => {
  const milestones = await prisma.milestone.findMany({ where: { projectId } });
  if (milestones.length === 0) return; // leave manually-set progress alone

  const completed = milestones.filter((m) => m.completed).length;
  const progress = Math.round((completed / milestones.length) * 100);

  await prisma.project.update({ where: { id: projectId }, data: { progress } });
};

const assertOwnsOrAdmin = (project, user) => {
  if (!project) throw new ApiError(404, "Project not found");
  if (user.role !== "ADMIN" && project.clientId !== user.id) {
    throw new ApiError(404, "Project not found");
  }
};

export const listProjectsForUser = async (user, { clientId } = {}) => {
  const where =
    user.role === "ADMIN"
      ? clientId
        ? { clientId }
        : {}
      : { clientId: user.id };

  return prisma.project.findMany({
    where,
    include: { milestones: milestoneOrder },
    orderBy: { updatedAt: "desc" },
  });
};

export const getProjectForUser = async (user, projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { milestones: milestoneOrder },
  });
  assertOwnsOrAdmin(project, user);
  return project;
};

export const createProject = async (data) => {
  const client = await prisma.user.findUnique({ where: { id: data.clientId } });
  if (!client) throw new ApiError(404, "Client not found");

  return prisma.project.create({
    data,
    include: { milestones: milestoneOrder },
  });
};

export const updateProject = async (projectId, data) => {
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new ApiError(404, "Project not found");

  return prisma.project.update({
    where: { id: projectId },
    data,
    include: { milestones: milestoneOrder },
  });
};

export const deleteProject = async (projectId) => {
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new ApiError(404, "Project not found");
  await prisma.project.delete({ where: { id: projectId } });
};

export const addMilestone = async (projectId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, "Project not found");

  const milestone = await prisma.milestone.create({ data: { ...data, projectId } });
  await recomputeProgress(projectId);
  return milestone;
};

export const updateMilestone = async (user, milestoneId, data) => {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });
  if (!milestone) throw new ApiError(404, "Milestone not found");
  assertOwnsOrAdmin(milestone.project, user);

  // Clients may only toggle completion; full edits are admin-only
  const payload =
    user.role === "ADMIN" ? data : { completed: data.completed };

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: payload,
  });
  await recomputeProgress(milestone.projectId);
  return updated;
};

export const deleteMilestone = async (milestoneId) => {
  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) throw new ApiError(404, "Milestone not found");
  await prisma.milestone.delete({ where: { id: milestoneId } });
  await recomputeProgress(milestone.projectId);
};
