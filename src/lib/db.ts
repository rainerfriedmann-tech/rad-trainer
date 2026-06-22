/**
 * Database access via the libSQL client (SQLite-compatible).
 *
 * - Local development: a file URL (`file:./data/rad-trainer.db`) — no setup.
 * - Production: a hosted Turso database via TURSO_DATABASE_URL +
 *   TURSO_AUTH_TOKEN, which works on serverless hosts (e.g. Vercel) where a
 *   local file would not persist.
 *
 * The client and the one-time schema setup are cached on globalThis so dev HMR
 * doesn't recreate them on every reload.
 */
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS athletes (
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
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     athlete_id   INTEGER PRIMARY KEY,
     ftp          INTEGER,
     max_hr       INTEGER,
     rest_hr      INTEGER,
     threshold_hr INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS activities (
     id          INTEGER PRIMARY KEY,
     athlete_id  INTEGER NOT NULL,
     start_date  TEXT NOT NULL,
     data        TEXT NOT NULL,
     updated_at  INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_activities_athlete_date
     ON activities(athlete_id, start_date)`,
  `CREATE TABLE IF NOT EXISTS training_plan (
     athlete_id INTEGER PRIMARY KEY,
     content    TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS coach_messages (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     athlete_id INTEGER NOT NULL,
     role       TEXT NOT NULL,
     content    TEXT NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_coach_messages_athlete
     ON coach_messages(athlete_id, id)`,
];

const globalForDb = globalThis as unknown as {
  __radClient?: Client;
  __radSchema?: Promise<void>;
};

function resolveUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dbPath =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "rad-trainer.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return `file:${dbPath}`;
}

function rawClient(): Client {
  if (!globalForDb.__radClient) {
    globalForDb.__radClient = createClient({
      url: resolveUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForDb.__radClient;
}

async function ensureSchema(client: Client): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }
}

/** Get the shared libSQL client, ensuring the schema exists exactly once. */
export async function getClient(): Promise<Client> {
  const client = rawClient();
  if (!globalForDb.__radSchema) {
    globalForDb.__radSchema = ensureSchema(client);
  }
  await globalForDb.__radSchema;
  return client;
}
