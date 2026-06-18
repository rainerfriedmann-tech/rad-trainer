/** Performance Management Chart: CTL (Fitness) and ATL (Fatigue) over time. */
import type { PmcPoint } from "@/lib/training";

export function PmcChart({ points }: { points: PmcPoint[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-zinc-500">Zu wenig Daten für die Kurve.</p>;
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...points.map((p) => Math.max(p.ctl, p.atl)), 1);
  const n = points.length;

  const x = (i: number) => pad.left + (i / (n - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  const line = (key: "ctl" | "atl") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  // ~Monthly x-axis ticks.
  const tickEvery = Math.max(1, Math.floor(n / 6));
  const ticks = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % tickEvery === 0);

  // Horizontal gridlines.
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: max * f,
    yy: y(max * f),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      {gridLines.map((g) => (
        <g key={g.v}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={g.yy}
            y2={g.yy}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={1}
          />
          <text x={4} y={g.yy + 3} fontSize={9} className="fill-zinc-400">
            {Math.round(g.v)}
          </text>
        </g>
      ))}

      <path d={line("ctl")} fill="none" stroke="#2563eb" strokeWidth={2} />
      <path d={line("atl")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />

      {ticks.map(({ p, i }) => (
        <text
          key={p.date}
          x={x(i)}
          y={height - 10}
          textAnchor="middle"
          fontSize={9}
          className="fill-zinc-400"
        >
          {p.date.slice(5)}
        </text>
      ))}

      {/* Legend */}
      <g>
        <rect x={pad.left} y={2} width={10} height={3} fill="#2563eb" />
        <text x={pad.left + 14} y={6} fontSize={9} className="fill-zinc-500">
          Fitness (CTL)
        </text>
        <rect x={pad.left + 90} y={2} width={10} height={3} fill="#f59e0b" />
        <text x={pad.left + 104} y={6} fontSize={9} className="fill-zinc-500">
          Ermüdung (ATL)
        </text>
      </g>
    </svg>
  );
}
