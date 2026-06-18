/**
 * Server-side loader: keeps the local activity store fresh, then computes the
 * training analysis from stored data. Reading from SQLite means analysis and
 * the coach don't re-hit Strava on every request.
 */
import type { AthleteSettings } from "./settings";
import { getStoredActivities } from "./store";
import { ensureSynced } from "./sync";
import { analyze, type AnalysisResult } from "./training";

export async function loadAnalysis(
  athleteId: number,
  accessToken: string,
  settings: AthleteSettings,
  days: number,
  opts: { force?: boolean } = {},
): Promise<AnalysisResult> {
  await ensureSynced(athleteId, accessToken, days, opts.force);
  const afterIso = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const activities = await getStoredActivities(athleteId, afterIso);
  return analyze(activities, settings);
}
