/** Formatting helpers for displaying Strava metrics in metric units. */

export function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatSpeed(metresPerSecond: number): string {
  return `${(metresPerSecond * 3.6).toFixed(1)} km/h`;
}

export function formatElevation(metres: number): string {
  return `${Math.round(metres)} hm`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
