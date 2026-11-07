import { Request, Response, NextFunction } from "express";

import authService from "./auth.service";
import { LoginInput, RefreshTokenInput, ChangePasswordInput } from "./auth.types";
import { sendSuccess } from "../../utils/response.util";

class AuthController {
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body as LoginInput);

      return sendSuccess(
        res,
        result,
        "Login successful"
      );
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await authService.refreshToken(refreshToken);

      return sendSuccess(
        res,
        tokens,
        "Token refreshed successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      await authService.logout(refreshToken);

      return sendSuccess(
        res,
        null,
        "Logged out successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutAll(req.admin!.id);

      return sendSuccess(
        res,
        null,
        "Logged out from all sessions successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = await authService.getProfile(req.admin!.id);

      return sendSuccess(
        res,
        admin,
        "Profile fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(req.admin!.id, req.body as ChangePasswordInput);

      return sendSuccess(
        res,
        null,
        "Password changed successfully. Please login again with your new password"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
