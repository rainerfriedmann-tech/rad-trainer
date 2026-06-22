import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getValidSession } from "@/lib/session";
import type { AthleteSettings } from "@/lib/settings";
import {
  addCoachMessage,
  clearCoachMessages,
  getStoredSettings,
  getTrainingPlan,
} from "@/lib/store";
import { loadAnalysis } from "@/lib/analysisLoader";
import { buildAthleteContext, buildSystemPrompt, type CoachMessage } from "@/lib/coach";
import { geminiConfigured, streamGemini } from "@/lib/gemini";

/** How many recent turns to send to the model (bounds token usage). */
const HISTORY_LIMIT = 20;

export const dynamic = "force-dynamic";
// Coaching answers can take a moment; 60s is the Vercel Hobby cap.
export const maxDuration = 60;

function coachConfigured(): boolean {
  return geminiConfigured() || !!process.env.ANTHROPIC_API_KEY;
}

/** Validate and normalise the incoming chat history. */
function parseMessages(input: unknown): CoachMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const messages: CoachMessage[] = [];
  for (const m of input) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.trim() === ""
    ) {
      return null;
    }
    messages.push({ role: m.role, content: m.content.slice(0, 4000) });
  }
  // The conversation must start with a user turn.
  if (messages[0].role !== "user") return null;
  return messages;
}

/** Claude (Anthropic) reply stream — fallback when no Gemini key is set. */
function streamClaude(system: string, messages: CoachMessage[]): ReadableStream<Uint8Array> {
  const client = new Anthropic();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claude = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system,
          messages,
        });
        claude.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await claude.finalMessage();
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

/**
 * POST /api/coach
 * Body: { messages: {role, content}[] }
 * Streams the coach's reply as plain UTF-8 text. Uses Gemini when
 * GEMINI_API_KEY is set, otherwise Claude.
 */
export async function POST(req: NextRequest) {
  if (!coachConfigured()) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 503 });
  }

  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const messages = parseMessages((body as { messages?: unknown }).messages);
  if (!messages) {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  // Build the athlete context from stored (synced) Strava data.
  const days = 120;
  const stored = await getStoredSettings(session.athlete.id);
  const settings: AthleteSettings = {
    ...stored,
    ftp: stored.ftp ?? session.athlete.ftp ?? null,
  };

  let system: string;
  try {
    const [analysis, plan] = await Promise.all([
      loadAnalysis(session.athlete.id, session.access_token, settings, days),
      getTrainingPlan(session.athlete.id),
    ]);
    system = buildSystemPrompt(
      buildAthleteContext(session.athlete, settings, analysis, days, plan),
    );
  } catch (e) {
    console.error("Coach context build failed:", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }

  // Persist the new user turn (the most recent message in the history).
  const athleteId = session.athlete.id;
  const lastUser = messages[messages.length - 1];
  if (lastUser.role === "user") {
    await addCoachMessage(athleteId, "user", lastUser.content);
  }

  // Only send the most recent turns to the model to bound token usage.
  const recent = messages.slice(-HISTORY_LIMIT);

  let providerStream: ReadableStream<Uint8Array>;
  try {
    providerStream = geminiConfigured()
      ? await streamGemini(system, recent)
      : streamClaude(system, recent);
  } catch (e) {
    console.error("Coach stream failed:", e);
    return NextResponse.json({ error: "coach_failed" }, { status: 502 });
  }

  // Tee the stream so we can persist the full assistant reply once complete.
  const decoder = new TextDecoder();
  let full = "";
  const persist = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      full += decoder.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    async flush() {
      if (full.trim()) {
        try {
          await addCoachMessage(athleteId, "assistant", full);
        } catch (e) {
          console.error("Failed to persist coach reply:", e);
        }
      }
    },
  });

  return new Response(providerStream.pipeThrough(persist), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** DELETE /api/coach — clear the saved chat history for the current athlete. */
export async function DELETE() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  await clearCoachMessages(session.athlete.id);
  return NextResponse.json({ ok: true });
}
