import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/session";
import { getStoredSettings } from "@/lib/store";
import { loadAnalysis } from "@/lib/analysisLoader";
import type { AthleteSettings } from "@/lib/settings";

/**
 * GET /api/analysis?days=120
 * Returns computed training-load metrics (PMC, weekly volume, intensity zones)
 * from the local store, syncing from Strava first if stale.
 */
export async function GET(req: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const url = new URL(req.url);
  // Default to 120 days so the 42-day CTL average is well warmed up.
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "120"), 7), 365);

  try {
    const stored = getStoredSettings(session.athlete.id);
    const settings: AthleteSettings = {
      ...stored,
      ftp: stored.ftp ?? session.athlete.ftp ?? null,
    };
    const result = await loadAnalysis(session.athlete.id, session.access_token, settings, days);
    return NextResponse.json({ days, settings, ...result });
  } catch (e) {
    console.error("Analysis failed:", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
