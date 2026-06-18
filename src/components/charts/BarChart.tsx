/** Dependency-free vertical bar chart rendered as inline SVG. */

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  formatValue = (n) => n.toFixed(0),
  color = "#FC4C02",
  height = 180,
}: {
  data: BarDatum[];
  formatValue?: (n: number) => string;
  color?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">Keine Daten.</p>;
  }

  const width = Math.max(data.length * 44, 320);
  const pad = { top: 16, right: 8, bottom: 36, left: 8 };
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - pad.left - pad.right) / data.length;
  const barW = Math.min(slot * 0.6, 32);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = pad.left + i * slot + (slot - barW) / 2;
        const y = pad.top + (chartH - h);
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={3}
              fill={color}
            >
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
            {d.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-zinc-500"
                fontSize={9}
              >
                {formatValue(d.value)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={height - 12}
              textAnchor="middle"
              className="fill-zinc-400"
              fontSize={9}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
