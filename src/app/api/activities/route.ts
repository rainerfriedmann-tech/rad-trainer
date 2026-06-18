import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/session";
import { getStoredActivities } from "@/lib/store";
import { ensureSynced } from "@/lib/sync";

/**
 * GET /api/activities?per_page=30
 * Returns the athlete's recent activities from the local store, syncing from
 * Strava first if the stored copy is stale.
 */
export async function GET(req: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const url = new URL(req.url);
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? "30"), 100);

  try {
    // Keep a rolling 90-day window fresh, then return the most recent slice.
    const windowDays = 90;
    await ensureSynced(session.athlete.id, session.access_token, windowDays);
    const afterIso = new Date(Date.now() - windowDays * 86400 * 1000).toISOString();
    const activities = getStoredActivities(session.athlete.id, afterIso).slice(0, perPage);
    return NextResponse.json({ activities });
  } catch (e) {
    console.error("Failed to load activities:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
