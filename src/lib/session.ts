/**
 * Session handling: the user's Strava tokens are stored in an encrypted,
 * httpOnly cookie (AES-256-GCM). This keeps the personal-app setup simple
 * (no database required yet) while keeping tokens opaque to the browser.
 */
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { StravaAthlete, StravaTokens } from "./strava";
import { refreshAccessToken } from "./strava";

const COOKIE_NAME = "rt_session";
const ALGO = "aes-256-gcm";
/** Refresh the access token this many seconds before it actually expires. */
const REFRESH_SKEW_SECONDS = 120;

export interface SessionData extends StravaTokens {
  athlete: StravaAthlete;
}

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET missing or too short. Set a random string (>= 32 chars) in .env.local.",
    );
  }
  // Derive a fixed-length 32-byte key from the secret.
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(data: SessionData): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: iv | tag | ciphertext, base64url-encoded.
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(token: string): SessionData | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as SessionData;
  } catch {
    // Tampered, malformed, or encrypted with a different secret.
    return null;
  }
}

/** Persist the session into the encrypted cookie. */
export async function saveSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encrypt(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Read the raw session from the cookie, if present and valid. */
export async function readSession(): Promise<SessionData | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decrypt(value);
}

/** Remove the session cookie (logout / disconnect). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Return a valid session, transparently refreshing the Strava access token
 * (and re-saving the cookie) if it is expired or about to expire.
 * Returns null if there is no session.
 */
export async function getValidSession(): Promise<SessionData | null> {
  const session = await readSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - REFRESH_SKEW_SECONDS > now) {
    return session;
  }

  // Token expired (or nearly): refresh it.
  const refreshed = await refreshAccessToken(session.refresh_token);
  const updated: SessionData = {
    ...session,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
  };
  await saveSession(updated);
  return updated;
}
