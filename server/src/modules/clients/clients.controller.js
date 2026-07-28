import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as clientsService from "./clients.service.js";

export const list = asyncHandler(async (req, res) => {
  const clients = await clientsService.listClients({
    search: req.query.search,
    status: req.query.status,
  });
  res.status(200).json(new ApiResponse(200, { clients }));
});

export const getOne = asyncHandler(async (req, res) => {
  const profile = await clientsService.getClientProfile(req.params.id);
  res.status(200).json(new ApiResponse(200, profile));
});

export const activate = asyncHandler(async (req, res) => {
  const client = await clientsService.setClientActive(req.params.id, true);
  res.status(200).json(new ApiResponse(200, { client }, "Client activated"));
});

export const deactivate = asyncHandler(async (req, res) => {
  const client = await clientsService.setClientActive(req.params.id, false);
  res
    .status(200)
    .json(new ApiResponse(200, { client }, "Client account disabled"));
});

export const remove = asyncHandler(async (req, res) => {
  await clientsService.softDeleteClient(req.params.id);
  res.status(200).json(new ApiResponse(200, null, "Client deleted"));
});

export const restore = asyncHandler(async (req, res) => {
  const client = await clientsService.restoreClient(req.params.id);
  res.status(200).json(new ApiResponse(200, { client }, "Client restored"));
});
