import { Request, Response } from "express";
import mongoose from "mongoose";

import { sendSuccess, sendFailure } from "../../utils/response.util";
import { MESSAGES } from "../../constants/message.constants";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

class HealthController {
  checkHealth = (_req: Request, res: Response) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;

    if (!isDatabaseConnected) {
      return sendFailure(
        res,
        "Database is not connected",
        ERROR_CODES.DATABASE_ERROR,
        [],
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    return sendSuccess(
      res,
      {
        server: "running",
        database: "connected",
      },
      MESSAGES.HEALTH_CHECK_SUCCESS
    );
  };
}

export default new HealthController();
