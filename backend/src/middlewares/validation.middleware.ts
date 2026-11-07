import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

import { AppError } from "../errors/app-error";
import { HTTP_STATUS } from "../constants/http-status.constants";
import { ERROR_CODES } from "../constants/error-code.constants";
import { ERROR_DETAIL_CODES, ERROR_LOCATIONS } from "../constants/error-detail.constants";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code:
          issue.code === "invalid_format"
            ? ERROR_DETAIL_CODES.INVALID_FORMAT
            : issue.code === "too_small"
              ? ERROR_DETAIL_CODES.TOO_SMALL
              : issue.code === "too_big"
                ? ERROR_DETAIL_CODES.TOO_LARGE
                : ERROR_DETAIL_CODES.INVALID_VALUE,
        message: issue.message,
        location: ERROR_LOCATIONS.BODY,
      }));

      return next(
        new AppError(
          "Validation failed",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          details
        )
      );
    }

    req.body = result.data;
    next();
  };
};
