/**
 * SQLite database (better-sqlite3). Single local file, no external service —
 * suitable for a personal self-hosted app. Path is configurable via
 * DATABASE_PATH (default ./data/rad-trainer.db).
 *
 * The connection is cached on globalThis so Next.js dev HMR doesn't open a new
 * handle on every reload.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS athletes (
  id            INTEGER PRIMARY KEY,
  firstname     TEXT,
  lastname      TEXT,
  profile       TEXT,
  city          TEXT,
  country       TEXT,
  ftp           INTEGER,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  last_synced_at INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  athlete_id   INTEGER PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
  ftp          INTEGER,
  max_hr       INTEGER,
  rest_hr      INTEGER,
  threshold_hr INTEGER
);

CREATE TABLE IF NOT EXISTS activities (
  id          INTEGER PRIMARY KEY,
  athlete_id  INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  start_date  TEXT NOT NULL,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_athlete_date
  ON activities(athlete_id, start_date);
`;

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __radTrainerDb?: DB };

function createConnection(): DB {
  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "rad-trainer.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function getDb(): DB {
  if (!globalForDb.__radTrainerDb) {
    globalForDb.__radTrainerDb = createConnection();
  }
  return globalForDb.__radTrainerDb;
}
