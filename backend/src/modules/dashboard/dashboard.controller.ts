import { Request, Response, NextFunction } from "express";
import dashboardService from "./dashboard.service";
import { sendSuccess } from "../../utils/response.util";

class DashboardController {
  getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await dashboardService.getSummary();
      return sendSuccess(
        res,
        summary,
        "Dashboard summary fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardController();
