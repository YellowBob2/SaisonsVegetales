import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Database } from "bun:sqlite";

const databaseUrl = process.env.DATABASE_URL ?? "../../data/saisons.db";
// Resolve paths relative to the project root (/app on Railway, current dir locally)
const projectRoot = resolve(import.meta.dir, "../../");
const dbFile = databaseUrl.startsWith("/") 
  ? databaseUrl 
  : join(projectRoot, databaseUrl);

console.log("Project root:", projectRoot);
console.log("DB file path:", dbFile);
try {
  mkdirSync(dirname(dbFile), { recursive: true });
  console.log("Database directory created successfully");
} catch (error) {
  console.error("Failed to create database directory:", error);
  throw error;
}

export const db = new Database(dbFile, { create: true });
console.log("Database initialized successfully");

db.run("PRAGMA foreign_keys = ON");

// Create base table if it doesn't exist
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

// Add missing columns if they don't exist
const platColumns = db.prepare("PRAGMA table_info(plats)").all() as Array<{ name: string }>;
const hasPlatDescription = platColumns.some((row) => row.name === "description");
const hasPlatAllergenes = platColumns.some((row) => row.name === "allergenes");

if (!hasPlatDescription) {
  db.run("ALTER TABLE plats ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

if (!hasPlatAllergenes) {
  db.run("ALTER TABLE plats ADD COLUMN allergenes TEXT NOT NULL DEFAULT '[]'");
}

db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    plat_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  )
`);

export function cleanupOldOrders() {
  db.run(`
    DELETE FROM orders
    WHERE datetime(created_at) <= datetime('now', '-21 days')
  `);
}

cleanupOldOrders();

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
setInterval(cleanupOldOrders, ONE_WEEK_MS);
