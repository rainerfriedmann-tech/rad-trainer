import { readSession } from "@/lib/session";
import { ConnectStrava } from "@/components/ConnectStrava";
import { Dashboard } from "@/components/Dashboard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await readSession();
  const { error } = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">🚴 Rad-Trainer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Dein persönlicher KI-Coach fürs Rennradtraining
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Verbindung mit Strava fehlgeschlagen ({error}). Bitte erneut versuchen.
        </div>
      )}

      {session ? (
        <Dashboard athlete={session.athlete} />
      ) : (
        <ConnectStrava />
      )}
    </main>
  );
}
