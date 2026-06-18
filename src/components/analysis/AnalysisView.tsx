import type { AnalysisResult } from "@/lib/training";
import { BarChart } from "@/components/charts/BarChart";
import { PmcChart } from "@/components/charts/PmcChart";
import { ZoneBars } from "./ZoneBars";

/** Plain-language interpretation of the current Training Stress Balance. */
function formStatus(tsb: number): { label: string; tone: string } {
  if (tsb > 15) return { label: "Sehr frisch / formaufbauend", tone: "text-sky-600" };
  if (tsb > 5) return { label: "Erholt", tone: "text-emerald-600" };
  if (tsb >= -10) return { label: "Ausgeglichen", tone: "text-zinc-600 dark:text-zinc-300" };
  if (tsb >= -30) return { label: "Produktive Ermüdung", tone: "text-amber-600" };
  return { label: "Hohe Ermüdung – Vorsicht", tone: "text-red-600" };
}

function StatCard({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass ?? ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function hours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)} h`;
}

export function AnalysisView({
  result,
  days,
}: {
  result: AnalysisResult;
  days: number;
}) {
  const { current, pmc, weekly, zones, sources, totalActivities } = result;

  if (totalActivities === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Keine Aktivitäten in den letzten {days} Tagen gefunden.
      </p>
    );
  }

  const form = current ? formStatus(current.tsb) : null;
  const recentWeeks = weekly.slice(-12);
  const tableWeeks = weekly.slice(-6).reverse();

  return (
    <div className="space-y-8">
      {/* Headline form metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Fitness (CTL)"
          value={current ? current.ctl.toFixed(0) : "–"}
          hint="42-Tage-Last"
        />
        <StatCard
          label="Ermüdung (ATL)"
          value={current ? current.atl.toFixed(0) : "–"}
          hint="7-Tage-Last"
        />
        <StatCard
          label="Form (TSB)"
          value={current ? (current.tsb > 0 ? `+${current.tsb.toFixed(0)}` : current.tsb.toFixed(0)) : "–"}
          hint={form?.label}
          valueClass={form?.tone}
        />
        <StatCard
          label="Aktivitäten"
          value={String(totalActivities)}
          hint={`letzte ${days} Tage`}
        />
      </div>

      {/* PMC */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 font-semibold">Formverlauf (PMC)</h3>
        <PmcChart points={pmc} />
      </section>

      {/* Weekly load */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 font-semibold">Wochenbelastung (TSS)</h3>
        <BarChart
          data={recentWeeks.map((w) => ({
            label: w.weekStart.slice(5),
            value: Math.round(w.tss),
          }))}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-400">
              <tr>
                <th className="py-1 pr-4 font-normal">Woche ab</th>
                <th className="py-1 pr-4 font-normal">Einheiten</th>
                <th className="py-1 pr-4 font-normal">Zeit</th>
                <th className="py-1 pr-4 font-normal">Distanz</th>
                <th className="py-1 pr-4 font-normal">Höhe</th>
                <th className="py-1 pr-4 font-normal">TSS</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {tableWeeks.map((w) => (
                <tr key={w.weekStart} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1 pr-4">{w.weekStart}</td>
                  <td className="py-1 pr-4">{w.count}</td>
                  <td className="py-1 pr-4">{hours(w.movingTime)}</td>
                  <td className="py-1 pr-4">{(w.distance / 1000).toFixed(0)} km</td>
                  <td className="py-1 pr-4">{Math.round(w.elevation)} hm</td>
                  <td className="py-1 pr-4">{Math.round(w.tss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Intensity zones */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 font-semibold">Intensitätsverteilung</h3>
        <ZoneBars distribution={zones} />
      </section>

      {/* Data-source transparency */}
      <p className="text-xs text-zinc-400">
        TSS-Quellen: {sources.power} × Leistung, {sources.hr} × Herzfrequenz,{" "}
        {sources.estimate} × Dauer-Schätzung. Werte ohne FTP/HF sind
        Näherungen.
      </p>
    </div>
  );
}
