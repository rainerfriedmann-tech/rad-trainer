/**
 * Training-load math: Training Stress Score (TSS), the Performance Management
 * Chart (CTL/ATL/TSB), weekly aggregation and intensity zone distribution.
 *
 * Formulae follow the common TrainingPeaks definitions:
 *   TSS  = duration_hours * IF^2 * 100
 *   IF   = NP / FTP                (power)   or  (HR - rest)/(LTHR - rest)  (HR)
 *   CTL  = 42-day exponentially weighted moving average of daily TSS
 *   ATL  =  7-day exponentially weighted moving average of daily TSS
 *   TSB  = previous day's CTL - previous day's ATL  ("Form")
 *
 * Note: Strava summary activities expose only *averages*, not full streams.
 * Power/HR based numbers are therefore approximations of the stream-based
 * values you would get from a head unit, but they are consistent and useful
 * for tracking trends.
 */
import type { StravaActivity } from "./strava";
import {
  effectiveThresholdHr,
  type AthleteSettings,
} from "./settings";

const CTL_TIME_CONSTANT = 42;
const ATL_TIME_CONSTANT = 7;
/** Fallback intensity factor when neither power nor HR is available. */
const DEFAULT_IF = 0.7;

export type TssSource = "power" | "hr" | "estimate";

export interface ActivityLoad {
  activity: StravaActivity;
  tss: number;
  intensityFactor: number;
  source: TssSource;
}

/** Estimate TSS for a single activity given the athlete's settings. */
export function estimateActivityLoad(
  activity: StravaActivity,
  settings: AthleteSettings,
): ActivityLoad {
  const hours = activity.moving_time / 3600;

  // 1. Power-based (preferred), using Strava's weighted average (~NP).
  const np = activity.weighted_average_watts ?? activity.average_watts;
  if (settings.ftp && settings.ftp > 0 && np && np > 0) {
    const intensityFactor = np / settings.ftp;
    return {
      activity,
      tss: hours * intensityFactor * intensityFactor * 100,
      intensityFactor,
      source: "power",
    };
  }

  // 2. HR-based fallback.
  const lthr = effectiveThresholdHr(settings);
  const rest = settings.restHr ?? 0;
  if (lthr && lthr > rest && activity.average_heartrate) {
    const intensityFactor = Math.max(
      0,
      (activity.average_heartrate - rest) / (lthr - rest),
    );
    return {
      activity,
      tss: hours * intensityFactor * intensityFactor * 100,
      intensityFactor,
      source: "hr",
    };
  }

  // 3. Pure duration estimate.
  return {
    activity,
    tss: hours * DEFAULT_IF * DEFAULT_IF * 100,
    intensityFactor: DEFAULT_IF,
    source: "estimate",
  };
}

export interface PmcPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the Performance Management Chart: a daily series from the first
 * activity until today, with CTL/ATL/TSB computed via EWMA.
 */
export function computePmc(loads: ActivityLoad[]): PmcPoint[] {
  if (loads.length === 0) return [];

  // Sum TSS per calendar day (local date of the activity).
  const tssByDay = new Map<string, number>();
  let earliest = new Date();
  for (const load of loads) {
    const day = load.activity.start_date_local.slice(0, 10);
    tssByDay.set(day, (tssByDay.get(day) ?? 0) + load.tss);
    const d = new Date(day);
    if (d < earliest) earliest = d;
  }

  const points: PmcPoint[] = [];
  let ctl = 0;
  let atl = 0;
  const ctlAlpha = 1 / CTL_TIME_CONSTANT;
  const atlAlpha = 1 / ATL_TIME_CONSTANT;

  const cursor = new Date(earliest);
  const today = new Date(toIsoDate(new Date()));
  while (cursor <= today) {
    const date = toIsoDate(cursor);
    const tss = tssByDay.get(date) ?? 0;
    // TSB ("Form") uses the previous day's fitness/fatigue.
    const tsb = ctl - atl;
    ctl = ctl + (tss - ctl) * ctlAlpha;
    atl = atl + (tss - atl) * atlAlpha;
    points.push({ date, tss, ctl, atl, tsb });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

export interface WeeklySummary {
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  distance: number;
  movingTime: number;
  elevation: number;
  tss: number;
  count: number;
}

/** Monday-anchored ISO date for the week containing the given date. */
function weekStartIso(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return toIsoDate(d);
}

/** Aggregate activities into weekly buckets, most recent week last. */
export function weeklySummaries(loads: ActivityLoad[]): WeeklySummary[] {
  const byWeek = new Map<string, WeeklySummary>();
  for (const load of loads) {
    const a = load.activity;
    const key = weekStartIso(new Date(a.start_date_local));
    const bucket =
      byWeek.get(key) ??
      ({
        weekStart: key,
        distance: 0,
        movingTime: 0,
        elevation: 0,
        tss: 0,
        count: 0,
      } satisfies WeeklySummary);
    bucket.distance += a.distance;
    bucket.movingTime += a.moving_time;
    bucket.elevation += a.total_elevation_gain;
    bucket.tss += load.tss;
    bucket.count += 1;
    byWeek.set(key, bucket);
  }
  return [...byWeek.values()].sort((x, y) =>
    x.weekStart < y.weekStart ? -1 : 1,
  );
}

export interface Zone {
  label: string;
  /** Inclusive lower bound as a fraction of threshold (FTP or LTHR). */
  min: number;
  /** Exclusive upper bound; Infinity for the top zone. */
  max: number;
  /** Accumulated moving time (seconds) classified into this zone. */
  seconds: number;
}

export interface ZoneDistribution {
  basis: "power" | "hr" | "none";
  zones: Zone[];
}

const POWER_ZONES: Omit<Zone, "seconds">[] = [
  { label: "Z1 Recovery", min: 0, max: 0.55 },
  { label: "Z2 Grundlage", min: 0.55, max: 0.75 },
  { label: "Z3 Tempo", min: 0.75, max: 0.9 },
  { label: "Z4 Schwelle", min: 0.9, max: 1.05 },
  { label: "Z5 VO2max", min: 1.05, max: 1.2 },
  { label: "Z6 Anaerob", min: 1.2, max: Infinity },
];

const HR_ZONES: Omit<Zone, "seconds">[] = [
  { label: "Z1 Recovery", min: 0, max: 0.81 },
  { label: "Z2 Grundlage", min: 0.81, max: 0.9 },
  { label: "Z3 Tempo", min: 0.9, max: 0.96 },
  { label: "Z4 Schwelle", min: 0.96, max: 1.03 },
  { label: "Z5 VO2max", min: 1.03, max: Infinity },
];

/**
 * Approximate time-in-zone by classifying each activity's *average* intensity
 * (relative to FTP or LTHR) into a single zone. Coarse, but indicates whether
 * training is polarised, threshold-heavy, etc.
 */
export function zoneDistribution(
  loads: ActivityLoad[],
  settings: AthleteSettings,
): ZoneDistribution {
  const lthr = effectiveThresholdHr(settings);
  const canPower = !!(settings.ftp && settings.ftp > 0);
  const canHr = !!(lthr && lthr > 0);

  if (!canPower && !canHr) {
    return { basis: "none", zones: [] };
  }

  const usePower = canPower;
  const template = usePower ? POWER_ZONES : HR_ZONES;
  const zones: Zone[] = template.map((z) => ({ ...z, seconds: 0 }));

  for (const load of loads) {
    const a = load.activity;
    let ratio: number | null = null;
    if (usePower) {
      const np = a.weighted_average_watts ?? a.average_watts;
      if (np && settings.ftp) ratio = np / settings.ftp;
    } else if (a.average_heartrate && lthr) {
      ratio = a.average_heartrate / lthr;
    }
    if (ratio == null) continue;
    const zone = zones.find((z) => ratio! >= z.min && ratio! < z.max);
    if (zone) zone.seconds += a.moving_time;
  }

  return { basis: usePower ? "power" : "hr", zones };
}

export interface AnalysisResult {
  pmc: PmcPoint[];
  weekly: WeeklySummary[];
  zones: ZoneDistribution;
  /** The most recent PMC point (current Fitness/Fatigue/Form). */
  current: PmcPoint | null;
  /** TSS source coverage, for transparency in the UI. */
  sources: Record<TssSource, number>;
  totalActivities: number;
}

/** Run the full analysis pipeline over a set of activities. */
export function analyze(
  activities: StravaActivity[],
  settings: AthleteSettings,
): AnalysisResult {
  const loads = activities.map((a) => estimateActivityLoad(a, settings));
  const pmc = computePmc(loads);
  const sources: Record<TssSource, number> = { power: 0, hr: 0, estimate: 0 };
  for (const l of loads) sources[l.source] += 1;

  return {
    pmc,
    weekly: weeklySummaries(loads),
    zones: zoneDistribution(loads, settings),
    current: pmc.length ? pmc[pmc.length - 1] : null,
    sources,
    totalActivities: activities.length,
  };
}
