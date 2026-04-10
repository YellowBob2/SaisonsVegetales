import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Database } from "bun:sqlite";

const dbFile = join(import.meta.dir, "../../data/saisons.db");
mkdirSync(dirname(dbFile), { recursive: true });

export const db = new Database(dbFile, { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS plats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    available_until DATE NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
