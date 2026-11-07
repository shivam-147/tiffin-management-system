import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/app-error";
import { sendFailure } from "../utils/response.util";
import { HTTP_STATUS } from "../constants/http-status.constants";
import { ERROR_CODES } from "../constants/error-code.constants";
import { MESSAGES } from "../constants/message.constants";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    return sendFailure(
      res,
      error.message,
      error.errorCode,
      error.detail,
      error.statusCode
    );
  }

  console.error(error);

  return sendFailure(
    res,
    MESSAGES.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    [],
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};
