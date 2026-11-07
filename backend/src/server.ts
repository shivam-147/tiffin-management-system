import app from "./app";
import database from "./config/database";
import { env } from "./config/env";
import { APP_NAME } from "./constants/app.constants";

const startServer = async () => {
  try {
    await database.connect();

    app.listen(env.PORT, () => {
      console.log(`${APP_NAME} running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
