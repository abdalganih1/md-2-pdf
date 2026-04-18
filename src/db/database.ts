import Database, { type Database as DatabaseType } from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DB_DIR = join(process.cwd(), "data");
const DB_PATH = join(DB_DIR, "md2pdf.db");

mkdirSync(DB_DIR, { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;
export { initializeDatabase } from "./migrations.js";
