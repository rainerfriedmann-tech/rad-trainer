import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getValidSession } from "@/lib/session";
import type { AthleteSettings } from "@/lib/settings";
import { getStoredSettings } from "@/lib/store";
import { loadAnalysis } from "@/lib/analysisLoader";
import { buildAthleteContext, buildSystemPrompt } from "@/lib/coach";

export const dynamic = "force-dynamic";
// Coaching answers can involve adaptive thinking; give the function room.
export const maxDuration = 120;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Validate and normalise the incoming chat history. */
function parseMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const messages: ChatMessage[] = [];
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
  // The Messages API requires the conversation to start with a user turn.
  if (messages[0].role !== "user") return null;
  return messages;
}

/**
 * POST /api/coach
 * Body: { messages: {role, content}[] }
 * Streams the coach's reply as plain UTF-8 text.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
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
  const stored = getStoredSettings(session.athlete.id);
  const settings: AthleteSettings = {
    ...stored,
    ftp: stored.ftp ?? session.athlete.ftp ?? null,
  };

  let system: string;
  try {
    const analysis = await loadAnalysis(session.athlete.id, session.access_token, settings, days);
    system = buildSystemPrompt(
      buildAthleteContext(session.athlete, settings, analysis, days),
    );
  } catch (e) {
    console.error("Coach context build failed:", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
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
        console.error("Coach stream failed:", e);
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
