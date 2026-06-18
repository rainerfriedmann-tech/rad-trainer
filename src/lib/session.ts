/**
 * Session handling. The browser cookie holds only the athlete id (encrypted,
 * httpOnly); the Strava tokens and profile live in the database. This keeps
 * tokens off the client and lets data persist across sessions/devices.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { StravaAthlete, StravaTokens } from "./strava";
import { refreshAccessToken } from "./strava";
import {
  getStoredAthlete,
  updateAthleteTokens,
  upsertAthlete,
} from "./store";

const COOKIE_NAME = "rt_session";
const ALGO = "aes-256-gcm";
/** Refresh the access token this many seconds before it actually expires. */
const REFRESH_SKEW_SECONDS = 120;

export interface SessionData extends StravaTokens {
  athlete: StravaAthlete;
}

interface CookiePayload {
  athleteId: number;
}

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET missing or too short. Set a random string (>= 32 chars) in .env.local.",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(data: CookiePayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(token: string): CookiePayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as CookiePayload;
  } catch {
    return null;
  }
}

async function setCookie(athleteId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encrypt({ athleteId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Persist the athlete + tokens to the DB and set the session cookie. */
export async function saveSession(
  athlete: StravaAthlete,
  tokens: StravaTokens,
): Promise<void> {
  await upsertAthlete(athlete, tokens);
  await setCookie(athlete.id);
}

/** Read the current session from the DB (no token refresh). */
export async function readSession(): Promise<SessionData | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = decrypt(value);
  if (!payload) return null;

  const stored = await getStoredAthlete(payload.athleteId);
  if (!stored) return null;
  return {
    ...stored.tokens,
    athlete: stored.athlete,
  };
}

/** Remove the session cookie (logout). Tokens stay in the DB. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Return a valid session, transparently refreshing the Strava access token
 * (and persisting it) if it is expired or about to expire.
 */
export async function getValidSession(): Promise<SessionData | null> {
  const session = await readSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - REFRESH_SKEW_SECONDS > now) {
    return session;
  }

  const refreshed = await refreshAccessToken(session.refresh_token);
  const tokens: StravaTokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
  };
  await updateAthleteTokens(session.athlete.id, tokens);
  return { ...tokens, athlete: session.athlete };
}
