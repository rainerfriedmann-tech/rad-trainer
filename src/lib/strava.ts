/**
 * Strava API client and OAuth helpers.
 *
 * Docs: https://developers.strava.com/docs/authentication/
 */

const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

/** Scopes we request. activity:read_all is needed to read private/all activities. */
export const STRAVA_SCOPE = "read,activity:read_all,profile:read_all";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  /** Unix timestamp (seconds) at which the access token expires. */
  expires_at: number;
}

export interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  city?: string;
  country?: string;
  weight?: number;
}

export interface StravaTokenResponse extends StravaTokens {
  token_type: string;
  expires_in: number;
  athlete?: StravaAthlete;
}

/** A trimmed-down activity shape with the fields the UI cares about. */
export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date: string;
  start_date_local: string;
  /** metres */
  distance: number;
  /** seconds */
  moving_time: number;
  elapsed_time: number;
  /** metres */
  total_elevation_gain: number;
  /** m/s */
  average_speed: number;
  max_speed: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  has_heartrate: boolean;
  device_watts?: boolean;
  trainer: boolean;
  commute: boolean;
  kudos_count: number;
  achievement_count: number;
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Strava credentials missing. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env.local.",
    );
  }
  return { clientId, clientSecret };
}

/** Build the URL we redirect the user to in order to authorize the app. */
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

/** Exchange an authorization code for access/refresh tokens. */
export async function exchangeCodeForTokens(
  code: string,
): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();
  const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/** Refresh an expired access token using the refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();
  const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/** Fetch a page of the athlete's activities. */
export async function fetchActivities(
  accessToken: string,
  opts: { page?: number; perPage?: number; before?: number; after?: number } = {},
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  params.set("page", String(opts.page ?? 1));
  params.set("per_page", String(opts.perPage ?? 30));
  if (opts.before) params.set("before", String(opts.before));
  if (opts.after) params.set("after", String(opts.after));

  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Always hit Strava; never serve a stale cached page.
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as StravaActivity[];
}

/** Fetch the authenticated athlete's profile. */
export async function fetchAthlete(accessToken: string): Promise<StravaAthlete> {
  const res = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strava athlete fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as StravaAthlete;
}
