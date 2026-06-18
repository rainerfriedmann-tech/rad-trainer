"use server";

import { revalidatePath } from "next/cache";
import { getValidSession } from "@/lib/session";
import { saveStoredSettings } from "@/lib/store";
import { syncActivities } from "@/lib/sync";
import type { AthleteSettings } from "@/lib/settings";

function parseNumberField(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Server Action: persist the athlete's training settings to the database. */
export async function saveSettingsAction(formData: FormData): Promise<void> {
  const session = await getValidSession();
  if (!session) return;

  const settings: AthleteSettings = {
    ftp: parseNumberField(formData.get("ftp")),
    maxHr: parseNumberField(formData.get("maxHr")),
    restHr: parseNumberField(formData.get("restHr")),
    thresholdHr: parseNumberField(formData.get("thresholdHr")),
  };
  saveStoredSettings(session.athlete.id, settings);
  revalidatePath("/analyse");
}

/** Server Action: force a fresh sync of activities from Strava. */
export async function syncAction(): Promise<void> {
  const session = await getValidSession();
  if (!session) return;
  await syncActivities(session.athlete.id, session.access_token, 180);
  revalidatePath("/analyse");
}
