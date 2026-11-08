import app from "./app";
import database from "./config/database";
import { env } from "./config/env";
import { APP_NAME } from "./constants/app.constants";
import { logger } from "./utils/logger.util";

const startServer = async () => {
  try {
    await database.connect();

    app.listen(env.PORT, () => {
      logger.info(`${APP_NAME} running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
