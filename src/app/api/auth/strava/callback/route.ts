import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchAthlete } from "@/lib/strava";
import { saveSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/url";

/**
 * GET /api/auth/strava/callback
 * Strava redirects here with ?code & ?state after the user grants access.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = getBaseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(error)}`);
  }

  // Validate CSRF state.
  const expectedState = req.cookies.get("rt_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${baseUrl}/?error=invalid_state`);
  }

  try {
    const token = await exchangeCodeForTokens(code);
    const athlete = token.athlete ?? (await fetchAthlete(token.access_token));

    await saveSession(athlete, {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
    });

    const res = NextResponse.redirect(`${baseUrl}/`);
    res.cookies.delete("rt_oauth_state");
    return res;
  } catch (e) {
    console.error("Strava callback failed:", e);
    return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
  }
}
