import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildAuthorizeUrl } from "@/lib/strava";
import { getRedirectUri } from "@/lib/url";

/**
 * GET /api/auth/strava
 * Starts the Strava OAuth flow by redirecting the user to Strava's consent page.
 */
export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = getRedirectUri(req);
  const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

  const res = NextResponse.redirect(authorizeUrl);
  // Short-lived CSRF state cookie, validated in the callback.
  res.cookies.set("rt_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
