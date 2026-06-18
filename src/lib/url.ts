import type { NextRequest } from "next/server";

/**
 * Determine the app's base URL. Prefers the explicit APP_URL env var (useful
 * behind proxies / in production), otherwise derives it from the request.
 */
export function getBaseUrl(req: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // Honour forwarded headers when present (proxies), else fall back to origin.
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return `${proto}://${host}`;
}

/** The Strava OAuth redirect URI for this deployment. */
export function getRedirectUri(req: NextRequest): string {
  return `${getBaseUrl(req)}/api/auth/strava/callback`;
}
