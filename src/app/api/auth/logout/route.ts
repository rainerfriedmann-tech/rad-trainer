import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/url";

/** POST /api/auth/logout — disconnect Strava by clearing the session. */
export async function POST(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(`${getBaseUrl(req)}/`, { status: 303 });
}
