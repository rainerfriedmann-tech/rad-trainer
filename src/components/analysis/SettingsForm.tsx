import type { AthleteSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/app/analyse/actions";

function Field({
  name,
  label,
  value,
  unit,
  placeholder,
}: {
  name: string;
  label: string;
  value: number | null;
  unit: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">
        {label} <span className="text-zinc-400">({unit})</span>
      </span>
      <input
        type="number"
        name={name}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        min={1}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 tabular-nums outline-none focus:border-[#FC4C02] dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}

export function SettingsForm({ settings }: { settings: AthleteSettings }) {
  return (
    <form
      action={saveSettingsAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="font-semibold">Trainingswerte</h3>
      <p className="mt-1 text-xs text-zinc-500">
        FTP und Herzfrequenz-Werte verbessern die Genauigkeit der
        Belastungsberechnung (TSS, Zonen).
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field name="ftp" label="FTP" unit="W" value={settings.ftp} placeholder="z. B. 250" />
        <Field name="maxHr" label="Max. HF" unit="bpm" value={settings.maxHr} placeholder="z. B. 190" />
        <Field name="thresholdHr" label="Schwellen-HF" unit="bpm" value={settings.thresholdHr} placeholder="optional" />
        <Field name="restHr" label="Ruhe-HF" unit="bpm" value={settings.restHr} placeholder="optional" />
      </div>
      <button
        type="submit"
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Speichern
      </button>
    </form>
  );
}
