import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/session";
import { readSettings } from "@/lib/settings";
import { fetchActivitiesSince } from "@/lib/strava";
import { analyze } from "@/lib/training";

/**
 * GET /api/analysis?days=120
 * Fetches the athlete's recent activities and returns computed training-load
 * metrics (PMC, weekly volume, intensity zones).
 */
export async function GET(req: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const url = new URL(req.url);
  // Default to 120 days so the 42-day CTL average is well warmed up.
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "120"), 7), 365);
  const afterUnix = Math.floor(Date.now() / 1000) - days * 86400;

  try {
    const settings = await readSettings();
    const activities = await fetchActivitiesSince(session.access_token, afterUnix);
    const result = analyze(activities, settings);
    return NextResponse.json({ days, settings, ...result });
  } catch (e) {
    console.error("Analysis failed:", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
