import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as adminService from "./admin.service.js";

export const overview = asyncHandler(async (req, res) => {
  const [kpis, recentActivity] = await Promise.all([
    adminService.getKpis(),
    adminService.getRecentActivity(),
  ]);
  res.status(200).json(new ApiResponse(200, { kpis, recentActivity }));
});
