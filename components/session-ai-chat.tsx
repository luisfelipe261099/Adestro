"use client";

import { useEffect, useRef, useState } from "react";

type ChatTurn = { role: "user" | "assistant"; content: string };

export type SessionContext = {
  dogName?: string;
  dogBreed?: string;
  sessionDescription?: string;
  commandsWorked?: Array<{ command: string; rating: number; notes?: string }>;
  privateNotes?: string;
};

const QUICK_PROMPTS = [
  "Sugerir plano para próxima aula",
  "Como trabalhar ansiedade?",
  "Recall não funciona, e agora?",
  "Latido excessivo — como tratar?",
  "Analisar essa sessão",
];

export function SessionAiChat({ context }: { context: SessionContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput("");
    try {
      const response = await fetch("/api/ia/session-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context, history: messages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha");
      setMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao consultar IA.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="ia-chat"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-2xl text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)] lg:bottom-6"
        aria-label="Assistente IA do treino"
        title="Conversar com a IA sobre essa sessão"
      >
        ✨
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-purple-200 bg-white shadow-2xl lg:bottom-6">
      <header className="flex items-center justify-between border-b border-purple-100 bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Assistente IA</p>
          <p className="text-xs font-bold">✨ Contexto da sessão{context.dogName ? ` • ${context.dogName}` : ""}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar assistente"
          className="rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
        >
          ✕
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="rounded-md bg-purple-50 px-3 py-2 text-[11px] text-purple-900">
              👋 Sou o assistente do Adestro. Posso sugerir planos, técnicas e analisar essa sessão. Pergunte ou escolha um atalho:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-800 hover:bg-purple-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((turn, idx) => (
            <div
              key={idx}
              className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-[11.5px] leading-snug ${
                  turn.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-950 border border-purple-100"
                }`}
              >
                {turn.content}
              </div>
            </div>
          ))
        )}
        {busy ? (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-[10px] text-slate-600">Pensando…</p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="flex gap-1.5 border-t border-purple-100 p-2"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pergunte algo sobre o treino…"
          maxLength={500}
          disabled={busy}
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-purple-300"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  );
}
