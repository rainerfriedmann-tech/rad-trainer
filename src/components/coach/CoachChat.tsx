"use client";

import { useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function CoachChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);

    const history: Message[] = [...messages, { role: "user", content: trimmed }];
    // Add the user message plus an empty assistant placeholder to stream into.
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      setError(errorMessage(String((e as Error).message)));
      // Drop the empty assistant placeholder on failure.
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  const showSuggestions = messages.length === 0;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-[16rem] space-y-4 overflow-y-auto p-5"
      >
        {showSuggestions ? (
          <div className="text-sm text-zinc-500">
            <p className="mb-3">
              Stell mir eine Frage zu deinem Training – ich kenne deine Strava-Daten
              der letzten 120 Tage.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-left text-xs text-zinc-600 transition hover:border-[#FC4C02] hover:text-[#FC4C02] dark:border-zinc-700 dark:text-zinc-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#FC4C02] px-4 py-2 text-sm text-white"
                    : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800"
                }
              >
                {m.content || (busy && i === messages.length - 1 ? "denkt nach …" : "")}
              </div>
            </div>
          ))
        )}
        {error && (
          <p className="text-sm text-red-600">Fehler: {error}</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag deinen Coach…"
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FC4C02] disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ""}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Senden
        </button>
      </form>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "missing_api_key":
      return "Der KI-Coach ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).";
    case "not_connected":
      return "Bitte zuerst mit Strava verbinden.";
    case "analysis_failed":
      return "Trainingsdaten konnten nicht geladen werden.";
    default:
      return code;
  }
}
