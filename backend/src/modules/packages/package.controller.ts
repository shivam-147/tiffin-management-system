import { Request, Response, NextFunction } from "express";
import packageService from "./package.service";
import { sendSuccess } from "../../utils/response.util";
import { HTTP_STATUS } from "../../constants/http-status.constants";

class PackageController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pkg = await packageService.createPackage(req.body);
      return sendSuccess(res, pkg, "Package plan created successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly === "true";
      const packages = await packageService.getAllPackages(activeOnly);
      return sendSuccess(res, packages, "Packages retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const pkg = await packageService.getPackageById(id);
      return sendSuccess(res, pkg, "Package retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const pkg = await packageService.updatePackage(id, req.body);
      return sendSuccess(res, pkg, "Package plan updated successfully");
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const pkg = await packageService.deactivatePackage(id);
      return sendSuccess(res, pkg, "Package deactivated successfully");
    } catch (error) {
      next(error);
    }
  };
}

export default new PackageController();
