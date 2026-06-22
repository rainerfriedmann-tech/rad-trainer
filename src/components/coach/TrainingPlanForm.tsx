import { saveTrainingPlanAction } from "@/app/coach/actions";

export function TrainingPlanForm({ plan }: { plan: string }) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" open={!plan}>
      <summary className="cursor-pointer px-5 py-3 text-sm font-semibold">
        🗒️ Trainingsplan {plan ? "(hinterlegt)" : "(noch leer)"}
      </summary>
      <form action={saveTrainingPlanAction} className="space-y-3 px-5 pb-5">
        <p className="text-xs text-zinc-500">
          Beschreibe deinen Plan in eigenen Worten – z. B. Zielwettkampf und Datum,
          geplante Wochenstunden, Wochenstruktur (z. B. „2× Grundlage, 1× Intervalle,
          1 Ruhetag“), aktuelle Trainingsphase. Der Coach gleicht deine echten
          Einheiten damit ab und weist auf Abweichungen und Fehler hin.
        </p>
        <textarea
          name="plan"
          defaultValue={plan}
          rows={6}
          placeholder={"z. B.\nZiel: Marathon-Radmarathon am 15.08.\nUmfang: 8–10 h/Woche\nWoche: Di Intervalle (VO2max), Do Schwelle, Sa lange GA-Ausfahrt, So locker, Mo+Fr Ruhe\nAktuell: Grundlagenphase"}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FC4C02] dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Plan speichern
        </button>
      </form>
    </details>
  );
}
