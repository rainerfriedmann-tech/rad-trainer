import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/session";
import { fetchActivities } from "@/lib/strava";

/**
 * GET /api/activities?page=1&per_page=30
 * Returns the authenticated athlete's activities from Strava.
 */
export async function GET(req: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const perPage = Math.min(Number(url.searchParams.get("per_page") ?? "30"), 100);

  try {
    const activities = await fetchActivities(session.access_token, {
      page,
      perPage,
    });
    return NextResponse.json({ activities });
  } catch (e) {
    console.error("Failed to fetch activities:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
