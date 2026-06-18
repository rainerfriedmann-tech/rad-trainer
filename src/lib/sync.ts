/**
 * Syncing Strava activities into the local database. Activities are fetched
 * on demand only when the stored copy is stale, so analysis and the coach read
 * from SQLite instead of hitting Strava on every request.
 */
import { fetchActivitiesSince } from "./strava";
import { getStoredAthlete, setLastSynced, upsertActivities } from "./store";

/** Re-sync at most this often (seconds). */
export const SYNC_TTL_SECONDS = 15 * 60;

export function needsSync(lastSyncedAt: number | null): boolean {
  if (!lastSyncedAt) return true;
  return Math.floor(Date.now() / 1000) - lastSyncedAt > SYNC_TTL_SECONDS;
}

/** Fetch the last `days` of activities from Strava and store them. */
export async function syncActivities(
  athleteId: number,
  accessToken: string,
  days: number,
): Promise<number> {
  const afterUnix = Math.floor(Date.now() / 1000) - days * 86400;
  const activities = await fetchActivitiesSince(accessToken, afterUnix);
  await upsertActivities(athleteId, activities);
  await setLastSynced(athleteId, Math.floor(Date.now() / 1000));
  return activities.length;
}

/** Sync only if the stored data is stale (or forced). Returns true if synced. */
export async function ensureSynced(
  athleteId: number,
  accessToken: string,
  days: number,
  force = false,
): Promise<boolean> {
  const stored = await getStoredAthlete(athleteId);
  if (force || needsSync(stored?.lastSyncedAt ?? null)) {
    await syncActivities(athleteId, accessToken, days);
    return true;
  }
  return false;
}
