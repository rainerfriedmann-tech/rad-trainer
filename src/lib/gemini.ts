/**
 * Google Gemini chat completion via the REST API (server-sent events).
 * Used by the KI coach when GEMINI_API_KEY is set — Gemini's free tier makes it
 * a no-cost alternative to Claude. No SDK needed; we stream the REST endpoint
 * directly and forward the text deltas.
 */
import type { CoachMessage } from "./coach";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Default model — a fast, free-tier-eligible Flash model. Override via env. */
const DEFAULT_MODEL = "gemini-2.5-flash";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Stream a Gemini reply as a plain-text ReadableStream of UTF-8 bytes.
 * Throws before any streaming if the request can't be started.
 */
export async function streamGemini(
  system: string,
  messages: CoachMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    },
  );
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed: ${res.status} ${detail}`);
  }

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await upstream.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const obj = JSON.parse(json);
              const parts = obj?.candidates?.[0]?.content?.parts;
              if (Array.isArray(parts)) {
                const text = parts
                  .map((p: { text?: string }) => p.text ?? "")
                  .join("");
                if (text) controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Ignore keep-alive or partial lines that aren't valid JSON.
            }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}
