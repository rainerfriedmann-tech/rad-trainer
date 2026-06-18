import Link from "next/link";
import { getValidSession } from "@/lib/session";
import { readSettings, type AthleteSettings } from "@/lib/settings";
import { loadAnalysis } from "@/lib/analysisLoader";
import type { AnalysisResult } from "@/lib/training";
import { ConnectStrava } from "@/components/ConnectStrava";
import { SettingsForm } from "@/components/analysis/SettingsForm";
import { AnalysisView } from "@/components/analysis/AnalysisView";

// Always recompute on request; depends on the athlete's live Strava data.
export const dynamic = "force-dynamic";

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await getValidSession();

  if (!session) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">📊 Analyse</h1>
        <ConnectStrava />
      </main>
    );
  }

  const { days: daysParam } = await searchParams;
  const days = Math.min(Math.max(Number(daysParam ?? "120"), 7), 365);

  const stored = await readSettings();
  // Fall back to the FTP configured on Strava if none stored locally.
  const settings: AthleteSettings = {
    ...stored,
    ftp: stored.ftp ?? session.athlete.ftp ?? null,
  };

  let result: AnalysisResult | null = null;
  try {
    result = await loadAnalysis(session.access_token, settings, days);
  } catch (e) {
    console.error("Analyse failed:", e);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📊 Analyse</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Form, Belastung und Intensität deiner letzten {days} Tage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coach"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            🤖 Coach
          </Link>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Übersicht
          </Link>
        </div>
      </header>

      <div className="mb-6">
        <SettingsForm settings={settings} />
      </div>

      {result ? (
        <AnalysisView result={result} days={days} />
      ) : (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Die Strava-Daten konnten nicht geladen werden. Bitte später erneut
          versuchen.
        </p>
      )}
    </main>
  );
}
