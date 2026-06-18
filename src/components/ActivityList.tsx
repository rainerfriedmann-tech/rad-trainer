"use client";

import { useEffect, useState } from "react";
import type { StravaActivity } from "@/lib/strava";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
} from "@/lib/format";

export function ActivityList() {
  const [activities, setActivities] = useState<StravaActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activities?per_page=30")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "fetch_failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setActivities(data.activities as StravaActivity[]);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        Aktivitäten konnten nicht geladen werden ({error}).
      </p>
    );
  }

  if (activities === null) {
    return <p className="text-sm text-zinc-500">Lade Aktivitäten…</p>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-zinc-500">Keine Aktivitäten gefunden.</p>;
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-zinc-500">
                {formatDate(a.start_date_local)} · {a.sport_type}
                {a.trainer ? " · Indoor" : ""}
              </p>
            </div>
            <a
              href={`https://www.strava.com/activities/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#FC4C02] hover:underline"
            >
              Strava ↗
            </a>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <Metric label="Distanz" value={formatDistance(a.distance)} />
            <Metric label="Dauer" value={formatDuration(a.moving_time)} />
            <Metric label="Ø Tempo" value={formatSpeed(a.average_speed)} />
            <Metric label="Höhenmeter" value={formatElevation(a.total_elevation_gain)} />
            {a.average_watts != null && (
              <Metric label="Ø Leistung" value={`${Math.round(a.average_watts)} W`} />
            )}
            {a.average_heartrate != null && (
              <Metric label="Ø Puls" value={`${Math.round(a.average_heartrate)} bpm`} />
            )}
            {a.average_cadence != null && (
              <Metric label="Ø Trittfrequenz" value={`${Math.round(a.average_cadence)} rpm`} />
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
