import Link from "next/link";
import { readSession } from "@/lib/session";
import { ConnectStrava } from "@/components/ConnectStrava";
import { CoachChat } from "@/components/coach/CoachChat";
import { SUGGESTED_QUESTIONS } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const session = await readSession();
  const configured = !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🤖 KI-Coach</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Trainingsempfehlungen auf Basis deiner Strava-Daten
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Übersicht
        </Link>
      </header>

      {!session ? (
        <ConnectStrava />
      ) : !configured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-medium">KI-Coach noch nicht aktiviert</p>
          <p className="mt-1">
            Setze <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">GEMINI_API_KEY</code>{" "}
            in <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code>{" "}
            (kostenloser Key unter aistudio.google.com/apikey), dann starte die App
            neu. Alternativ funktioniert auch{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">ANTHROPIC_API_KEY</code>.
          </p>
        </div>
      ) : (
        <CoachChat suggestions={SUGGESTED_QUESTIONS} />
      )}
    </main>
  );
}
