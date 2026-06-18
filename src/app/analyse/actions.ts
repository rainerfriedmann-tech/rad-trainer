"use server";

import { revalidatePath } from "next/cache";
import { saveSettings, type AthleteSettings } from "@/lib/settings";

function parseNumberField(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Server Action: persist the athlete's training settings. */
export async function saveSettingsAction(formData: FormData): Promise<void> {
  const settings: AthleteSettings = {
    ftp: parseNumberField(formData.get("ftp")),
    maxHr: parseNumberField(formData.get("maxHr")),
    restHr: parseNumberField(formData.get("restHr")),
    thresholdHr: parseNumberField(formData.get("thresholdHr")),
  };
  await saveSettings(settings);
  revalidatePath("/analyse");
}
