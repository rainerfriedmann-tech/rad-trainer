/** Typed data-access helpers over the SQLite database. */
import { getDb } from "./db";
import type { StravaActivity, StravaAthlete, StravaTokens } from "./strava";
import { DEFAULT_SETTINGS, type AthleteSettings } from "./settings";

export interface StoredAthlete {
  athlete: StravaAthlete;
  tokens: StravaTokens;
  lastSyncedAt: number | null;
}

interface AthleteRow {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profile: string | null;
  city: string | null;
  country: string | null;
  ftp: number | null;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  last_synced_at: number | null;
}

/** Insert or update an athlete's profile and OAuth tokens. */
export function upsertAthlete(athlete: StravaAthlete, tokens: StravaTokens): void {
  const now = Math.floor(Date.now() / 1000);
  getDb()
    .prepare(
      `INSERT INTO athletes
         (id, firstname, lastname, profile, city, country, ftp,
          access_token, refresh_token, expires_at, created_at, updated_at)
       VALUES
         (@id, @firstname, @lastname, @profile, @city, @country, @ftp,
          @access_token, @refresh_token, @expires_at, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         firstname = excluded.firstname,
         lastname = excluded.lastname,
         profile = excluded.profile,
         city = excluded.city,
         country = excluded.country,
         ftp = excluded.ftp,
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`,
    )
    .run({
      id: athlete.id,
      firstname: athlete.firstname ?? null,
      lastname: athlete.lastname ?? null,
      profile: athlete.profile ?? null,
      city: athlete.city ?? null,
      country: athlete.country ?? null,
      ftp: athlete.ftp ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      now,
    });
}

/** Update only the OAuth tokens (after a refresh). */
export function updateAthleteTokens(id: number, tokens: StravaTokens): void {
  getDb()
    .prepare(
      `UPDATE athletes
         SET access_token = @access_token,
             refresh_token = @refresh_token,
             expires_at = @expires_at,
             updated_at = @now
       WHERE id = @id`,
    )
    .run({
      id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      now: Math.floor(Date.now() / 1000),
    });
}

export function getStoredAthlete(id: number): StoredAthlete | null {
  const row = getDb()
    .prepare("SELECT * FROM athletes WHERE id = ?")
    .get(id) as AthleteRow | undefined;
  if (!row) return null;
  return {
    athlete: {
      id: row.id,
      firstname: row.firstname ?? undefined,
      lastname: row.lastname ?? undefined,
      profile: row.profile ?? undefined,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      ftp: row.ftp ?? undefined,
    },
    tokens: {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
    },
    lastSyncedAt: row.last_synced_at,
  };
}

export function setLastSynced(athleteId: number, ts: number): void {
  getDb().prepare("UPDATE athletes SET last_synced_at = ? WHERE id = ?").run(ts, athleteId);
}

// --- Settings ---------------------------------------------------------------

interface SettingsRow {
  ftp: number | null;
  max_hr: number | null;
  rest_hr: number | null;
  threshold_hr: number | null;
}

export function getStoredSettings(athleteId: number): AthleteSettings {
  const row = getDb()
    .prepare("SELECT ftp, max_hr, rest_hr, threshold_hr FROM settings WHERE athlete_id = ?")
    .get(athleteId) as SettingsRow | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    ftp: row.ftp,
    maxHr: row.max_hr,
    restHr: row.rest_hr,
    thresholdHr: row.threshold_hr,
  };
}

export function saveStoredSettings(athleteId: number, settings: AthleteSettings): void {
  getDb()
    .prepare(
      `INSERT INTO settings (athlete_id, ftp, max_hr, rest_hr, threshold_hr)
       VALUES (@athlete_id, @ftp, @max_hr, @rest_hr, @threshold_hr)
       ON CONFLICT(athlete_id) DO UPDATE SET
         ftp = excluded.ftp,
         max_hr = excluded.max_hr,
         rest_hr = excluded.rest_hr,
         threshold_hr = excluded.threshold_hr`,
    )
    .run({
      athlete_id: athleteId,
      ftp: settings.ftp,
      max_hr: settings.maxHr,
      rest_hr: settings.restHr,
      threshold_hr: settings.thresholdHr,
    });
}

// --- Activities -------------------------------------------------------------

/** Upsert a batch of activities for an athlete. */
export function upsertActivities(athleteId: number, activities: StravaActivity[]): void {
  if (activities.length === 0) return;
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(
    `INSERT INTO activities (id, athlete_id, start_date, data, updated_at)
     VALUES (@id, @athlete_id, @start_date, @data, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       start_date = excluded.start_date,
       data = excluded.data,
       updated_at = excluded.updated_at`,
  );
  const insertMany = db.transaction((rows: StravaActivity[]) => {
    for (const a of rows) {
      stmt.run({
        id: a.id,
        athlete_id: athleteId,
        start_date: a.start_date,
        data: JSON.stringify(a),
        updated_at: now,
      });
    }
  });
  insertMany(activities);
}

/** Read stored activities for an athlete since an ISO date, newest first. */
export function getStoredActivities(athleteId: number, afterIso: string): StravaActivity[] {
  const rows = getDb()
    .prepare(
      `SELECT data FROM activities
       WHERE athlete_id = ? AND start_date >= ?
       ORDER BY start_date DESC`,
    )
    .all(athleteId, afterIso) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as StravaActivity);
}
