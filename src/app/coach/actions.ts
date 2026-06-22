"use server";

import { revalidatePath } from "next/cache";
import { getValidSession } from "@/lib/session";
import { saveTrainingPlan } from "@/lib/store";

/** Server Action: save the athlete's training plan (free text). */
export async function saveTrainingPlanAction(formData: FormData): Promise<void> {
  const session = await getValidSession();
  if (!session) return;
  const content = String(formData.get("plan") ?? "").slice(0, 8000);
  await saveTrainingPlan(session.athlete.id, content);
  revalidatePath("/coach");
}
