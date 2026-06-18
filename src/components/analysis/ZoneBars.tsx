import type { ZoneDistribution } from "@/lib/training";
import { formatDuration } from "@/lib/format";

const ZONE_COLORS = [
  "#22c55e", // Z1
  "#84cc16", // Z2
  "#eab308", // Z3
  "#f97316", // Z4
  "#ef4444", // Z5
  "#b91c1c", // Z6
];

export function ZoneBars({ distribution }: { distribution: ZoneDistribution }) {
  if (distribution.basis === "none") {
    return (
      <p className="text-sm text-zinc-500">
        Für die Zonenverteilung bitte FTP oder Herzfrequenz-Werte hinterlegen.
      </p>
    );
  }

  const total = distribution.zones.reduce((s, z) => s + z.seconds, 0) || 1;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Basis: {distribution.basis === "power" ? "Leistung (FTP)" : "Herzfrequenz"}
        {" "}· grobe Schätzung anhand der Aktivitäts-Durchschnitte
      </p>
      {distribution.zones.map((z, i) => {
        const pct = (z.seconds / total) * 100;
        return (
          <div key={z.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 text-zinc-500">{z.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded"
                style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}
              />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-zinc-500">
              {formatDuration(z.seconds)} · {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
