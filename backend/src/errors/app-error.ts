import { ErrorDetail } from "../types/response.types";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public detail: ErrorDetail[] = []
  ) {
    super(message);
  }
}
