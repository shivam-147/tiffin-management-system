import { Request, Response, NextFunction } from "express";

import { verifyToken } from "../utils/jwt.util";
import { AppError } from "../errors/app-error";

import { HTTP_STATUS } from "../constants/http-status.constants";
import { ERROR_CODES } from "../constants/error-code.constants";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authentication token is required",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    req.admin = {
      id: decoded.adminId,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    next(
      new AppError(
        "Invalid or expired token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      )
    );
  }
};
