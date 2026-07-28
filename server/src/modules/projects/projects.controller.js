import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as projectsService from "./projects.service.js";

export const list = asyncHandler(async (req, res) => {
  const projects = await projectsService.listProjectsForUser(req.user, {
    clientId: req.query.clientId,
  });
  res.status(200).json(new ApiResponse(200, { projects }));
});

export const getOne = asyncHandler(async (req, res) => {
  const project = await projectsService.getProjectForUser(req.user, req.params.id);
  res.status(200).json(new ApiResponse(200, { project }));
});

export const create = asyncHandler(async (req, res) => {
  const project = await projectsService.createProject(req.body);
  res.status(201).json(new ApiResponse(201, { project }, "Project created"));
});

export const update = asyncHandler(async (req, res) => {
  const project = await projectsService.updateProject(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, { project }, "Project updated"));
});

export const remove = asyncHandler(async (req, res) => {
  await projectsService.deleteProject(req.params.id);
  res.status(200).json(new ApiResponse(200, null, "Project deleted"));
});

export const addMilestone = asyncHandler(async (req, res) => {
  const milestone = await projectsService.addMilestone(req.params.id, req.body);
  res.status(201).json(new ApiResponse(201, { milestone }, "Milestone added"));
});

export const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await projectsService.updateMilestone(
    req.user,
    req.params.milestoneId,
    req.body,
  );
  res.status(200).json(new ApiResponse(200, { milestone }, "Milestone updated"));
});

export const removeMilestone = asyncHandler(async (req, res) => {
  await projectsService.deleteMilestone(req.params.milestoneId);
  res.status(200).json(new ApiResponse(200, null, "Milestone deleted"));
});
