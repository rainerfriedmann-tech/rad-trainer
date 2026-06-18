/** Typed, async data-access helpers over the libSQL database. */
import type { InStatement, Row } from "@libsql/client";
import { getClient } from "./db";
import type { StravaActivity, StravaAthlete, StravaTokens } from "./strava";
import { DEFAULT_SETTINGS, type AthleteSettings } from "./settings";

export interface StoredAthlete {
  athlete: StravaAthlete;
  tokens: StravaTokens;
  lastSyncedAt: number | null;
}

/** Coerce a libSQL numeric value (number | bigint | null) to number | null. */
function num(v: unknown): number | null {
  if (v == null) return null;
  return Number(v);
}
function str(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}

// --- Athletes / tokens ------------------------------------------------------

export async function upsertAthlete(
  athlete: StravaAthlete,
  tokens: StravaTokens,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const client = await getClient();
  await client.execute({
    sql: `INSERT INTO athletes
            (id, firstname, lastname, profile, city, country, ftp,
             access_token, refresh_token, expires_at, created_at, updated_at)
          VALUES
            (:id, :firstname, :lastname, :profile, :city, :country, :ftp,
             :access_token, :refresh_token, :expires_at, :now, :now)
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
    args: {
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
    },
  });
}

export async function updateAthleteTokens(
  id: number,
  tokens: StravaTokens,
): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: `UPDATE athletes
            SET access_token = :access_token,
                refresh_token = :refresh_token,
                expires_at = :expires_at,
                updated_at = :now
          WHERE id = :id`,
    args: {
      id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      now: Math.floor(Date.now() / 1000),
    },
  });
}

export async function getStoredAthlete(id: number): Promise<StoredAthlete | null> {
  const client = await getClient();
  const res = await client.execute({
    sql: "SELECT * FROM athletes WHERE id = :id",
    args: { id },
  });
  const row: Row | undefined = res.rows[0];
  if (!row) return null;
  return {
    athlete: {
      id: Number(row.id),
      firstname: str(row.firstname),
      lastname: str(row.lastname),
      profile: str(row.profile),
      city: str(row.city),
      country: str(row.country),
      ftp: num(row.ftp) ?? undefined,
    },
    tokens: {
      access_token: String(row.access_token),
      refresh_token: String(row.refresh_token),
      expires_at: Number(row.expires_at),
    },
    lastSyncedAt: num(row.last_synced_at),
  };
}

export async function setLastSynced(athleteId: number, ts: number): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: "UPDATE athletes SET last_synced_at = :ts WHERE id = :id",
    args: { ts, id: athleteId },
  });
}

// --- Settings ---------------------------------------------------------------

export async function getStoredSettings(athleteId: number): Promise<AthleteSettings> {
  const client = await getClient();
  const res = await client.execute({
    sql: "SELECT ftp, max_hr, rest_hr, threshold_hr FROM settings WHERE athlete_id = :id",
    args: { id: athleteId },
  });
  const row = res.rows[0];
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    ftp: num(row.ftp),
    maxHr: num(row.max_hr),
    restHr: num(row.rest_hr),
    thresholdHr: num(row.threshold_hr),
  };
}

export async function saveStoredSettings(
  athleteId: number,
  settings: AthleteSettings,
): Promise<void> {
  const client = await getClient();
  await client.execute({
    sql: `INSERT INTO settings (athlete_id, ftp, max_hr, rest_hr, threshold_hr)
          VALUES (:athlete_id, :ftp, :max_hr, :rest_hr, :threshold_hr)
          ON CONFLICT(athlete_id) DO UPDATE SET
            ftp = excluded.ftp,
            max_hr = excluded.max_hr,
            rest_hr = excluded.rest_hr,
            threshold_hr = excluded.threshold_hr`,
    args: {
      athlete_id: athleteId,
      ftp: settings.ftp,
      max_hr: settings.maxHr,
      rest_hr: settings.restHr,
      threshold_hr: settings.thresholdHr,
    },
  });
}

// --- Activities -------------------------------------------------------------

export async function upsertActivities(
  athleteId: number,
  activities: StravaActivity[],
): Promise<void> {
  if (activities.length === 0) return;
  const now = Math.floor(Date.now() / 1000);
  const statements: InStatement[] = activities.map((a) => ({
    sql: `INSERT INTO activities (id, athlete_id, start_date, data, updated_at)
          VALUES (:id, :athlete_id, :start_date, :data, :updated_at)
          ON CONFLICT(id) DO UPDATE SET
            start_date = excluded.start_date,
            data = excluded.data,
            updated_at = excluded.updated_at`,
    args: {
      id: a.id,
      athlete_id: athleteId,
      start_date: a.start_date,
      data: JSON.stringify(a),
      updated_at: now,
    },
  }));
  const client = await getClient();
  await client.batch(statements, "write");
}

export async function getStoredActivities(
  athleteId: number,
  afterIso: string,
): Promise<StravaActivity[]> {
  const client = await getClient();
  const res = await client.execute({
    sql: `SELECT data FROM activities
          WHERE athlete_id = :id AND start_date >= :after
          ORDER BY start_date DESC`,
    args: { id: athleteId, after: afterIso },
  });
  return res.rows.map((r) => JSON.parse(String(r.data)) as StravaActivity);
}
