/**
 * Server-side loader that ties Strava data fetching to the training analysis.
 * Kept out of the page component so impure calls (Date.now) and async IO live
 * in a plain module rather than a React render path.
 */
import type { AthleteSettings } from "./settings";
import { fetchActivitiesSince } from "./strava";
import { analyze, type AnalysisResult } from "./training";

export async function loadAnalysis(
  accessToken: string,
  settings: AthleteSettings,
  days: number,
): Promise<AnalysisResult> {
  const afterUnix = Math.floor(Date.now() / 1000) - days * 86400;
  const activities = await fetchActivitiesSince(accessToken, afterUnix);
  return analyze(activities, settings);
}
