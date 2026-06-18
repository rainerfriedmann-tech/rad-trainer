/**
 * Athlete training settings (FTP, heart-rate anchors) needed to turn raw
 * activities into training-load metrics. Persisted in the database — see
 * `getStoredSettings` / `saveStoredSettings` in `store.ts`.
 */

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

/**
 * If the athlete hasn't set a threshold HR but has a max HR, estimate it
 * (~94% of max is a common rule of thumb).
 */
export function effectiveThresholdHr(s: AthleteSettings): number | null {
  if (s.thresholdHr) return s.thresholdHr;
  if (s.maxHr) return Math.round(s.maxHr * 0.94);
  return null;
}
