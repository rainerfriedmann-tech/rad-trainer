export function ConnectStrava() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold">Verbinde dein Strava-Konto</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Rad-Trainer liest deine Aktivitäten von Strava, um deine Form zu
        analysieren und dir individuelle Trainingsempfehlungen zu geben.
      </p>
      <a
        href="/api/auth/strava"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FC4C02] px-5 py-3 font-medium text-white transition hover:bg-[#e34402]"
      >
        Mit Strava verbinden
      </a>
      <p className="mt-4 text-xs text-zinc-400">
        Wir fragen nur Lesezugriff auf deine Aktivitäten an.
      </p>
    </section>
  );
}
