import dotenv from "dotenv";
import { createApp } from "./app";
import { PORT } from "./config/env";
import { logger } from "./core/logger/logger";
import { db } from "./database/mysql";
dotenv.config();

logger.debug("Loading backend server bootstrap");

const server = createApp();

// TEST DB connection
const testDB = async () => {
  try {
    const conn = await db.getConnection();
    logger.info("MySQL connected");
    conn.release();
  } catch (err: any) {
    logger.error("DB Connection Failed", { message: err.message });
    throw err;
  }
};

const startServer = async () => {
  await testDB(); // ensure DB works first

  const listener = server.listen(PORT, () => {
    logger.info("Server is running", { port: PORT });
  });

  const graceful = async (signal: string) => {
    try {
      logger.info("Shutting down", { signal });
      listener.close(() => {
        logger.info("HTTP server closed");
      });

      await db.end();
      logger.info("DB pool closed");
      process.exit(0);
    } catch (err: any) {
      logger.error("Error during shutdown", { message: err.message });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => graceful("SIGINT"));
  process.on("SIGTERM", () => graceful("SIGTERM"));
};

startServer().catch((err) => {
  logger.error("Failed to start server", { message: err.message });
  process.exit(1);
});
