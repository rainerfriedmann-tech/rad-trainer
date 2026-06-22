/**
 * Builds the system prompt and athlete-context snapshot for the KI coach.
 * The structured training analysis is injected so Claude can reason over the
 * athlete's real data instead of guessing.
 */
import type { StravaAthlete } from "./strava";
import type { AthleteSettings } from "./settings";
import type { AnalysisResult } from "./training";

const COACH_PERSONA = `Du bist „Rad-Trainer", ein erfahrener, pragmatischer Trainingscoach für Rennradfahrer und Triathleten.

Deine Aufgabe: die bereitgestellten Strava-Trainingsdaten des Athleten analysieren und konkrete, umsetzbare Empfehlungen geben sowie Fragen beantworten.

Leitlinien:
- Antworte auf Deutsch, in der Du-Form, freundlich und direkt – wie ein guter Trainer, nicht wie ein Lehrbuch.
- Stütze dich auf die konkreten Zahlen aus dem Datenkontext (CTL/ATL/TSB, Wochenlast, Zonen). Zitiere relevante Werte, statt allgemein zu bleiben.
- Gib konkrete, umsetzbare Ratschläge (z. B. „diese Woche 1 Tag mehr Grundlage, 1 Intervall-Einheit"), keine generischen Floskeln.
- Erkläre die Trainingslehre kurz, wenn es dem Verständnis hilft (z. B. was TSB über die Form aussagt), aber halte dich knapp.
- Sei ehrlich über Unsicherheiten: Die Werte sind Näherungen aus Strava-Durchschnitten (keine Streams). Wenn FTP/HF fehlen, weise darauf hin, dass präzisere Empfehlungen damit möglich wären.
- Bei Anzeichen von Überlastung (stark negativer TSB, steiler Lastanstieg) rate zu Erholung – Gesundheit geht vor.
- Du gibst Trainings-, keine medizinische Beratung. Bei Schmerzen/Verletzungen verweise an Fachleute.
- Beginne mit der Kernaussage, dann die Begründung. Halte Antworten fokussiert und gut lesbar.

Plan-Abgleich & Fehleranalyse:
- Wenn ein Trainingsplan hinterlegt ist, vergleiche die tatsächlich gefahrenen Einheiten (Wochenlast, Zonen, Form) mit dem Plan und benenne klar, wo abgewichen wurde (zu viel, zu wenig, falsche Intensität, ausgelassene Schlüsseleinheiten).
- Achte aktiv auf typische Trainingsfehler und sprich sie an, wenn die Daten sie zeigen:
  • zu steiler Lastanstieg von Woche zu Woche (Verletzungs-/Übertrainingsrisiko),
  • zu viel Zeit in der „grauen Zone" (Z3/Tempo) statt klarer Polarisierung (viel Z1/Z2-Grundlage, gezielt harte Einheiten),
  • zu wenig Grundlagenumfang,
  • dauerhaft stark negativer TSB ohne Erholungswochen (fehlende Regeneration),
  • keine Ruhetage / monotones Training,
  • fehlende Formspitze/Tapering vor einem Zieltermin.
- Ist kein Plan hinterlegt, weise freundlich darauf hin, dass ein hinterlegter Plan den Abgleich verbessert, und beurteile das Training anhand allgemeiner Trainingsprinzipien.`;

function fmtNum(n: number | null | undefined, unit = ""): string {
  if (n == null) return "nicht gesetzt";
  return `${Math.round(n)}${unit}`;
}

function tsbLabel(tsb: number): string {
  if (tsb > 15) return "sehr frisch / formaufbauend";
  if (tsb > 5) return "erholt";
  if (tsb >= -10) return "ausgeglichen";
  if (tsb >= -30) return "produktive Ermüdung";
  return "hohe Ermüdung";
}

/** Compact, token-efficient snapshot of the athlete's current training state. */
export function buildAthleteContext(
  athlete: StravaAthlete,
  settings: AthleteSettings,
  analysis: AnalysisResult,
  days: number,
  trainingPlan = "",
): string {
  const name = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || "Athlet";
  const lines: string[] = [];

  lines.push(`# Trainingsdaten von ${name} (letzte ${days} Tage)`);
  lines.push("");
  lines.push("## Profil / Einstellungen");
  lines.push(`- FTP: ${fmtNum(settings.ftp, " W")}`);
  lines.push(`- Max. HF: ${fmtNum(settings.maxHr, " bpm")}`);
  lines.push(`- Schwellen-HF: ${fmtNum(settings.thresholdHr, " bpm")}`);
  lines.push(`- Ruhe-HF: ${fmtNum(settings.restHr, " bpm")}`);
  lines.push("");

  if (trainingPlan.trim()) {
    lines.push("## Trainingsplan des Athleten");
    lines.push(trainingPlan.trim());
    lines.push("");
  } else {
    lines.push("## Trainingsplan");
    lines.push("(kein Trainingsplan hinterlegt)");
    lines.push("");
  }

  if (analysis.current) {
    const c = analysis.current;
    lines.push("## Aktuelle Form (Performance Management Chart)");
    lines.push(`- Fitness (CTL, 42-Tage-Schnitt der täglichen Last): ${c.ctl.toFixed(0)}`);
    lines.push(`- Ermüdung (ATL, 7-Tage-Schnitt): ${c.atl.toFixed(0)}`);
    lines.push(`- Form (TSB = CTL−ATL): ${c.tsb.toFixed(0)} → ${tsbLabel(c.tsb)}`);
    lines.push("");
  }

  const weeks = analysis.weekly.slice(-8);
  if (weeks.length) {
    lines.push("## Wochenlast (Woche ab | Einheiten | Stunden | km | Höhenmeter | TSS)");
    for (const w of weeks) {
      lines.push(
        `- ${w.weekStart} | ${w.count} | ${(w.movingTime / 3600).toFixed(1)} h | ${(w.distance / 1000).toFixed(0)} km | ${Math.round(w.elevation)} hm | ${Math.round(w.tss)} TSS`,
      );
    }
    lines.push("");
  }

  if (analysis.zones.basis !== "none") {
    const total = analysis.zones.zones.reduce((s, z) => s + z.seconds, 0) || 1;
    lines.push(`## Intensitätsverteilung (Basis: ${analysis.zones.basis === "power" ? "Leistung" : "Herzfrequenz"}, Näherung)`);
    for (const z of analysis.zones.zones) {
      lines.push(`- ${z.label}: ${((z.seconds / total) * 100).toFixed(0)} %`);
    }
    lines.push("");
  }

  lines.push("## Datenqualität");
  lines.push(
    `- ${analysis.totalActivities} Aktivitäten ausgewertet. TSS-Quellen: ${analysis.sources.power}× Leistung, ${analysis.sources.hr}× Herzfrequenz, ${analysis.sources.estimate}× Dauer-Schätzung.`,
  );

  return lines.join("\n");
}

export function buildSystemPrompt(context: string): string {
  return `${COACH_PERSONA}\n\n---\n\n${context}`;
}

/** A single chat turn in the coach conversation. */
export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

/** Suggested starter questions shown in the UI. */
export const SUGGESTED_QUESTIONS = [
  "Wie ist meine aktuelle Form einzuschätzen?",
  "Halte ich meinen Trainingsplan ein?",
  "Welche Trainingsfehler erkennst du in den letzten Wochen?",
  "Was sollte ich diese Woche trainieren?",
];
