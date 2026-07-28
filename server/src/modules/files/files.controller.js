import path from "node:path";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { UPLOAD_DIR } from "../../lib/uploadStorage.js";
import * as filesService from "./files.service.js";

export const list = asyncHandler(async (req, res) => {
  const files = await filesService.listFilesForUser(req.user, {
    projectId: req.query.projectId,
  });
  res.status(200).json(new ApiResponse(200, { files }));
});

export const getOne = asyncHandler(async (req, res) => {
  const { storedName, ...file } = await filesService.getFileForUser(
    req.user,
    req.params.id,
  );
  res.status(200).json(new ApiResponse(200, { file }));
});

export const create = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file provided");
  const file = await filesService.createFile(req.user, req.body, req.file);
  res.status(201).json(new ApiResponse(201, { file }, "File uploaded"));
});

export const remove = asyncHandler(async (req, res) => {
  await filesService.deleteFile(req.params.id);
  res.status(200).json(new ApiResponse(200, null, "File deleted"));
});

// Convenience beyond the required 4 endpoints: streams the actual bytes for
// a file the caller is already authorized to see (same ownership check as getOne).
export const download = asyncHandler(async (req, res) => {
  const file = await filesService.getFileForUser(req.user, req.params.id);
  const filePath = path.join(UPLOAD_DIR, file.storedName);
  res.download(filePath, file.filename);
});
