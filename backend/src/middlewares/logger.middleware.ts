import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.util";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!logger.isDevelopment()) {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const msg = `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(msg);
    } else if (statusCode >= 400) {
      logger.warn(msg);
    } else {
      logger.info(msg);
    }
  });

  next();
};
