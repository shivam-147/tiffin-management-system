import { Response } from "express";
import { ApiResponse, ErrorDetail } from "../types/response.types";

export const sendSuccess = <T>(
  res: Response,
  payload: T,
  message = "Request successful",
  statusCode = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    error_code: null,
    detail: [],
    payload,
  };

  return res.status(statusCode).json(response);
};

export const sendFailure = (
  res: Response,
  message: string,
  errorCode: string,
  detail: ErrorDetail[] = [],
  statusCode = 400
) => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    error_code: errorCode,
    detail,
    payload: null,
  };

  return res.status(statusCode).json(response);
};
