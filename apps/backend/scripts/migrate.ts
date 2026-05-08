import fs from "fs";
import path from "path";
import { logger } from "../src/core/logger/logger";
import { db } from "../src/database/mysql";

const migrationsDir = path.resolve(__dirname, "..", "migrations");

const run = async () => {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // ensure migrations table exists (migration file may create it)
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(255) NOT NULL PRIMARY KEY, run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);

  for (const file of files) {
    const id = file;

    const [rows]: any = await db.query('SELECT id FROM schema_migrations WHERE id = ?', [id]);
    if (rows && rows.length) {
      logger.info(`Skipping applied migration ${id}`);
      continue;
    }

    logger.info(`Applying migration ${id}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // split by delimiter; for simplicity run as a single query (should work for most files)
    await db.query(sql);

    await db.query('INSERT INTO schema_migrations (id) VALUES (?)', [id]);
    logger.info(`Migration ${id} applied`);
  }

  logger.info('All migrations processed');
  process.exit(0);
};

run().catch(err => {
  logger.error('Migration failed', { message: err.message });
  process.exit(1);
});
