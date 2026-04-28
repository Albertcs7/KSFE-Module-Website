import "dotenv/config";
import { createApp } from "./app";
import { PORT } from "./config/env";
import { db } from "./database/mysql";

const server = createApp();

const startServer = async () => {
  await testDB(); // ensure DB works first

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

//TESTING DB connection
const testDB = async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ MySQL Connected");
    conn.release();
  } catch (err) {
    console.error("❌ DB Connection Failed", err);
  }
};