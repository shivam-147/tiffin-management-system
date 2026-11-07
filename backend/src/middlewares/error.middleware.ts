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

  // Handle MongoDB duplicate key error
  if (error && typeof error === "object" && (error as any).code === 11000) {
    const keys = Object.keys((error as any).keyPattern || {});
    const field = keys[0] || "field";
    return sendFailure(
      res,
      `A record with this ${field} already exists`,
      ERROR_CODES.DUPLICATE_ENTRY,
      [
        {
          field,
          code: "DUPLICATE_VALUE",
          message: `${field} must be unique`,
          location: "database",
        },
      ],
      HTTP_STATUS.CONFLICT
    );
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (error && typeof error === "object" && (error as any).name === "CastError") {
    const field = (error as any).path || "id";
    return sendFailure(
      res,
      `Invalid ${field} format`,
      ERROR_CODES.VALIDATION_ERROR,
      [
        {
          field,
          code: "INVALID_FORMAT",
          message: `Invalid format for ${field}`,
          location: "params",
        },
      ],
      HTTP_STATUS.BAD_REQUEST
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
