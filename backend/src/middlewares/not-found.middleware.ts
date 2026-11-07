import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { HTTP_STATUS } from "../constants/http-status.constants";
import { ERROR_CODES } from "../constants/error-code.constants";
import { MESSAGES } from "../constants/message.constants";

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(
    new AppError(
      `${MESSAGES.ROUTE_NOT_FOUND}: ${req.originalUrl}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    )
  );
};
