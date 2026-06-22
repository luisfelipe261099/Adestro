"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import {
  IconArrowRight,
  IconChevronDown,
  IconSparkle,
  IconUser,
} from "@/components/icons";
import { useAppStore } from "@/lib/app-store";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const QUICK_PROMPTS = [
  { id: "plano", label: "Sugerir plano da próxima aula" },
  { id: "ansiedade", label: "Como trabalhar ansiedade?" },
  { id: "recall", label: "Recall não funciona, e agora?" },
  { id: "latido", label: "Latido excessivo — como tratar?" },
  { id: "socializacao", label: "Janela de socialização" },
  { id: "analise", label: "Analisar esta sessão" },
];

const PROMPT_TEXTS: Record<string, string> = {
  plano: "Sugira o plano da próxima aula considerando o contexto.",
  ansiedade: "Como trabalhar ansiedade de separação?",
  recall: "O recall não está funcionando. O que fazer?",
  latido: "Latido excessivo está incomodando o cliente. Como tratar?",
  socializacao: "Quero trabalhar socialização. Por onde começar?",
  analise: "Analise esta sessão e me dê próximos passos.",
};

function parseBrazilianDate(date: string): number {
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function nowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function IaPage() {
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [selectedDogId, setSelectedDogId] = useState(clients[0]?.dogs[0]?.id ?? "");

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [aiEngine, setAiEngine] = useState<"gemini" | "heuristic" | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId],
  );
  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((d) => d.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId],
  );

  const dogTimeline = useMemo(() => {
    if (!selectedDog) return [];
    const fourWeeksAgo = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000;
    return sessions
      .filter((s) => s.dogId === selectedDog.id || s.dogName === selectedDog.name)
      .map((s) => ({ ...s, ts: parseBrazilianDate(s.date) }))
      .filter((s) => s.ts >= fourWeeksAgo)
      .sort((a, b) => b.ts - a.ts);
  }, [sessions, selectedDog]);

  const lastSessionSummary = dogTimeline[0]?.notes?.[0]?.comment ?? "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function autoResize() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) return;

    const userMsg: ChatTurn = {
      id: nowId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/ia/session-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: {
            dogName: selectedDog?.name,
            dogBreed: selectedDog?.breed,
            dogAge: selectedDog?.age,
            trainingTypes: selectedDog?.trainingTypes,
            tutorName: selectedClient?.name,
            environment: selectedClient?.environment,
            recentSessions: dogTimeline.slice(0, 5).map((s) => ({
              date: s.date,
              title: s.title,
              notes: (s.notes ?? []).map((n) => `${n.block}: ${n.score}/10 — ${n.comment}`),
            })),
            sessionDescription: lastSessionSummary,
          },
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Falha");
      setAiEngine(data?.engine === "gemini" ? "gemini" : "heuristic");

      const aiMsg: ChatTurn = {
        id: nowId(),
        role: "assistant",
        content: data.response || "Sem resposta.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          role: "assistant",
          content:
            err instanceof Error
              ? `Não foi possível responder agora — ${err.message}`
              : "Não foi possível responder agora.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
      composerRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  function handleNewChat() {
    setMessages([]);
    setInput("");
    composerRef.current?.focus();
  }

  return (
    <AuthGuard role="trainer">
      <main className="flex h-[calc(100dvh-112px)] w-full lg:h-[calc(100dvh-56px)]">
        {/* Sidebar de contexto (desktop) */}
        <aside className="hidden h-full w-72 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]/40 lg:flex">
          <header className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-eyebrow">Assistente IA</p>
            <h1 className="text-[15px] font-semibold text-[var(--foreground)]">Conversas</h1>
          </header>

          <button
            type="button"
            onClick={handleNewChat}
            className="mx-3 mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[12.5px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
          >
            + Nova conversa
          </button>

          <div className="mt-4 space-y-3 overflow-y-auto px-3 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Contexto</p>
              <div className="mt-2 space-y-2">
                <label className="block">
                  <span className="text-[11px] text-[var(--muted)]">Cliente</span>
                  <select
                    value={selectedClient?.id ?? ""}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      const next = clients.find((c) => c.id === e.target.value);
                      setSelectedDogId(next?.dogs[0]?.id ?? "");
                    }}
                    className="input-field mt-1 h-8 text-[12.5px]"
                  >
                    <option value="">Sem contexto</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedClient ? (
                  <label className="block">
                    <span className="text-[11px] text-[var(--muted)]">Cão</span>
                    <select
                      value={selectedDog?.id ?? ""}
                      onChange={(e) => setSelectedDogId(e.target.value)}
                      className="input-field mt-1 h-8 text-[12.5px]"
                    >
                      {(selectedClient?.dogs ?? []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.breed || "Sem raça"}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            {dogTimeline.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Sessões recentes
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dogTimeline.slice(0, 5).map((session) => (
                    <li
                      key={session.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
                    >
                      <p className="truncate text-[11.5px] font-medium text-[var(--foreground)]">{session.title}</p>
                      <p className="text-[10px] text-[var(--muted)]">{session.date}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <p className="text-[11px] font-medium text-[var(--foreground)]">
                {aiEngine === "gemini" ? "IA Gemini com contexto" : "Assistente contextual"}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--muted)]">
                Responde com o perfil do cão e a memória da conversa. Com a chave do Gemini
                configurada, usa IA real; sem ela, cai no motor heurístico como fallback.
              </p>
            </div>
          </div>
        </aside>

        {/* Conversa principal */}
        <section className="flex flex-1 flex-col overflow-hidden">
          {/* Header da conversa */}
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 lg:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Contexto"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] lg:hidden"
              >
                <IconChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
              </button>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-white">
                <IconSparkle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
                  Assistente Adestro
                </p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {selectedDog
                    ? `${selectedDog.name} · ${selectedDog.breed || "Sem raça"} · ${selectedClient?.name ?? ""}`
                    : "Pergunte sobre planos, comportamentos e técnicas"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiEngine ? (
                <span
                  className={`hidden items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${
                    aiEngine === "gemini"
                      ? "bg-[var(--success-bg)] text-[var(--success)]"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                  title={
                    aiEngine === "gemini"
                      ? "Respondendo com IA (Gemini), com contexto do cão e memória da conversa"
                      : "Usando o motor básico (sem chave de IA configurada)"
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      aiEngine === "gemini" ? "bg-[var(--success)]" : "bg-[var(--muted)]"
                    }`}
                  />
                  {aiEngine === "gemini" ? "IA ativa" : "Modo básico"}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleNewChat}
                className="btn-ghost text-[12px]"
              >
                Nova conversa
              </button>
            </div>
          </header>

          {/* Drawer mobile de contexto */}
          {sidebarOpen ? (
            <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/30 px-4 py-3 lg:hidden">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-[var(--muted)]">Cliente</span>
                  <select
                    value={selectedClient?.id ?? ""}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      const next = clients.find((c) => c.id === e.target.value);
                      setSelectedDogId(next?.dogs[0]?.id ?? "");
                    }}
                    className="input-field mt-1 h-9 text-[13px]"
                  >
                    <option value="">Sem contexto</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                {selectedClient ? (
                  <label className="block">
                    <span className="text-[11px] text-[var(--muted)]">Cão</span>
                    <select
                      value={selectedDog?.id ?? ""}
                      onChange={(e) => setSelectedDogId(e.target.value)}
                      className="input-field mt-1 h-9 text-[13px]"
                    >
                      {(selectedClient?.dogs ?? []).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Lista de mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
                  <IconSparkle className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">
                  Como posso ajudar com {selectedDog?.name || "o treino"}?
                </h2>
                <p className="mt-1.5 max-w-md text-[13px] text-[var(--muted)]">
                  Pergunte sobre técnicas, planos de progressão, comportamentos específicos ou análise de sessão.
                  Use os atalhos abaixo ou escreva sua dúvida.
                </p>
                <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => send(PROMPT_TEXTS[prompt.id])}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left text-[12.5px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-6">
                {messages.map((msg) => (
                  <article key={msg.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${
                          msg.role === "user"
                            ? "bg-[var(--surface-3)] text-[var(--foreground)]"
                            : "bg-[var(--accent)]"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <IconUser className="h-3.5 w-3.5" />
                        ) : (
                          <IconSparkle className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-[var(--foreground)]">
                          {msg.role === "user" ? "Você" : "Assistente"}
                        </p>
                        <span className="text-[10.5px] text-[var(--muted)]">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--foreground)]">
                        {msg.content}
                      </div>
                    </div>
                  </article>
                ))}
                {busy ? (
                  <article className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white">
                      <IconSparkle className="h-3.5 w-3.5 animate-pulse" />
                    </span>
                    <div className="flex h-7 items-center gap-1.5 text-[12.5px] text-[var(--muted)]">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "300ms" }} />
                    </div>
                  </article>
                ) : null}
              </div>
            )}
          </div>

          {/* Composer */}
          <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:px-6">
            <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
              {messages.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      disabled={busy}
                      onClick={() => send(PROMPT_TEXTS[prompt.id])}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="relative flex items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--accent)]">
                <textarea
                  ref={composerRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    selectedDog
                      ? `Pergunte sobre ${selectedDog.name}…`
                      : "Pergunte sobre técnicas, comportamento, plano de aula…"
                  }
                  rows={1}
                  maxLength={1000}
                  disabled={busy}
                  className="flex-1 resize-none bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-white transition-opacity disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10.5px] text-[var(--muted)]">
                <kbd className="kbd">Enter</kbd> envia · <kbd className="kbd">Shift+Enter</kbd> nova linha
              </p>
            </form>
          </footer>
        </section>
      </main>
    </AuthGuard>
  );
}
