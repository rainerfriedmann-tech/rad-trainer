/**
 * Athlete training settings (FTP, heart-rate anchors). Needed to turn raw
 * Strava activities into training-load metrics (TSS, zones).
 *
 * Stored in a plain httpOnly cookie — these values are not secret.
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "rt_settings";

export interface AthleteSettings {
  /** Functional Threshold Power in watts. */
  ftp: number | null;
  /** Maximum heart rate in bpm. */
  maxHr: number | null;
  /** Resting heart rate in bpm. */
  restHr: number | null;
  /** Lactate threshold heart rate in bpm. */
  thresholdHr: number | null;
}

export const DEFAULT_SETTINGS: AthleteSettings = {
  ftp: null,
  maxHr: null,
  restHr: null,
  thresholdHr: null,
};

export async function readSettings(): Promise<AthleteSettings> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AthleteSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AthleteSettings): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(settings), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * If the athlete hasn't set a threshold HR but has a max HR, estimate it
 * (~94% of max is a common rule of thumb).
 */
export function effectiveThresholdHr(s: AthleteSettings): number | null {
  if (s.thresholdHr) return s.thresholdHr;
  if (s.maxHr) return Math.round(s.maxHr * 0.94);
  return null;
}
