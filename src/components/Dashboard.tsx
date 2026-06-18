import type { StravaAthlete } from "@/lib/strava";
import { ActivityList } from "./ActivityList";

export function Dashboard({ athlete }: { athlete: StravaAthlete }) {
  const name = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ");

  return (
    <section>
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm text-zinc-500">Verbunden als</p>
          <p className="font-semibold">{name || `Athlet #${athlete.id}`}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Trennen
          </button>
        </form>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Letzte Aktivitäten</h2>
      <ActivityList />
    </section>
  );
}
