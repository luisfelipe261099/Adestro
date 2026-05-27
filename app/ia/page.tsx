"use client";

import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";

type Tab = "sugestao" | "resumo";

function parseBrazilianDate(date: string): number {
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

export default function IaPage() {
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);

  const [tab, setTab] = useState<Tab>("sugestao");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [selectedDogId, setSelectedDogId] = useState(clients[0]?.dogs[0]?.id ?? "");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [reminder, setReminder] = useState("");
  const [reminderSaved, setReminderSaved] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [trainingNeed, setTrainingNeed] = useState("Treinamento de guia para cão que puxa na rua e perde foco com distrações.");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId],
  );

  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId],
  );

  const dogTimeline = useMemo(() => {
    if (!selectedDog) return [];
    const fourWeeksAgo = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000;
    return sessions
      .filter((session) => session.dogId === selectedDog.id || session.dogName === selectedDog.name)
      .map((session) => ({ ...session, ts: parseBrazilianDate(session.date) }))
      .filter((session) => session.ts >= fourWeeksAgo)
      .sort((a, b) => b.ts - a.ts);
  }, [sessions, selectedDog]);

  function handleFakeTranscribe() {
    setIsRecording(true);
    window.setTimeout(() => {
      setIsRecording(false);
      setTranscript(
        "Hoje treinamos comando 'senta' e 'fica' com reforço positivo. O cão respondeu bem após 5 repetições. Apresentou ansiedade quando outro cão passou na rua, mas conseguimos redirecionar a atenção.",
      );
    }, 1200);
  }

  function handleGenerateSummary() {
    const base = transcript.trim();
    if (!base) {
      setSummary("Grave ou cole a transcrição para gerar o resumo.");
      return;
    }
    const sentences = base.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    setSummary(`Resumo da aula: ${sentences}`);
  }

  function handleSaveReminder() {
    if (!reminder.trim() || !selectedDog) return;
    setReminderSaved(
      `Lembrete salvo para ${selectedDog.name}: "${reminder.trim()}". Você verá ao iniciar a próxima aula.`,
    );
    window.setTimeout(() => setReminderSaved(""), 4000);
    setReminder("");
  }

  function handleSuggestNextTraining() {
    if (!selectedDog) return;
    const focuses = selectedDog.trainingTypes?.length ? selectedDog.trainingTypes : ["Obediência básica"];
    const last = dogTimeline[0];
    const baseLine = last
      ? `Última sessão (${last.date}): ${last.title}.`
      : "Sem sessões recentes registradas para este cão.";
    const need = trainingNeed.trim() || `Montar progressão para ${focuses.join(" + ")}.`;

    setSuggestion(
      [
        `Plano sugerido para ${selectedDog.name} (${selectedDog.breed})`,
        `Necessidade informada: ${need}`,
        baseLine,
        "",
        "1. Diagnóstico rápido (3 a 5 min)",
        "Observe nível de energia, resposta ao nome, contato visual e reação ao ambiente antes de exigir desempenho.",
        "",
        "2. Aquecimento de foco (5 min)",
        `Reforce ${focuses[0]} em ambiente com pouca distração. Use recompensa alta e sessões curtas para criar engajamento.`,
        "",
        "3. Bloco principal de treino (12 a 18 min)",
        need.toLowerCase().includes("guia")
          ? "Para guia: trabalhe andar ao lado, recompensa na posição correta, mudanças de direção, paradas com contato visual e retomada calma. Aumente distrações só depois de resposta consistente."
          : `Trabalhe ${focuses.slice(0, 2).join(" + ") || "obediência"} em progressões pequenas, aumentando distância, duração ou distração uma variável por vez.`,
        "",
        "4. Tarefa para o tutor",
        "Passe uma prática de 5 minutos por dia, com critério simples de sucesso e sem correções confusas.",
        "",
        "5. Atenção profissional",
        "Ajuste o plano se o cão demonstrar medo, excesso de excitação, dor, agressividade ou queda brusca de motivação.",
      ].join("\n"),
    );
  }

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-md px-3 pb-10 pt-3 sm:max-w-xl">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[#f7fbff] p-4 shadow-[var(--shadow)]">
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2d6f99]">Assistente</p>
            <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Assistente de IA para treinos</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Descreva o caso do cão e receba uma sugestão estruturada de treino para usar como ponto de partida profissional.
            </p>
          </header>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-medium text-[var(--muted)]">Cliente</span>
              <select
                value={selectedClient?.id ?? ""}
                onChange={(event) => {
                  setSelectedClientId(event.target.value);
                  const next = clients.find((c) => c.id === event.target.value);
                  setSelectedDogId(next?.dogs[0]?.id ?? "");
                }}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-medium text-[var(--muted)]">Cão</span>
              <select
                value={selectedDog?.id ?? ""}
                onChange={(event) => setSelectedDogId(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
              >
                {(selectedClient?.dogs ?? []).map((dog) => (
                  <option key={dog.id} value={dog.id}>{dog.name} • {dog.breed}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 inline-flex rounded-full border border-[#c9dfef] bg-white p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setTab("resumo")}
              className={`rounded-full px-3 py-1.5 transition ${tab === "resumo" ? "bg-[#145a82] text-white" : "text-[var(--muted)]"}`}
            >
              Resumir aula
            </button>
            <button
              type="button"
              onClick={() => setTab("sugestao")}
              className={`rounded-full px-3 py-1.5 transition ${tab === "sugestao" ? "bg-[#145a82] text-white" : "text-[var(--muted)]"}`}
            >
              Plano de treino
            </button>
          </div>

          {tab === "resumo" ? (
            <section className="mt-4 grid gap-3">
              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">1. Capture o áudio</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Grave um áudio enquanto narra a sessão. A IA vai transcrever e gerar o resumo.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleFakeTranscribe}
                    disabled={isRecording}
                    className="pc-primary-action rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {isRecording ? "Transcrevendo..." : "Gravar / Transcrever áudio"}
                  </button>
                </div>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Transcrição da aula aparecerá aqui..."
                  rows={5}
                  className="mt-3 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">2. Resumo gerado</p>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="mt-2 rounded-full border border-[#145a82] bg-white px-3 py-1.5 text-xs font-semibold text-[#145a82]"
                >
                  Gerar resumo
                </button>
                {summary ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-[#245d84]">
                    {summary}
                  </p>
                ) : null}
              </article>
            </section>
          ) : (
            <section className="mt-4 grid gap-3">
              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">1. Explique o que você quer treinar</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Escreva como falaria no atendimento: raça, comportamento, objetivo e dificuldade atual.
                </p>
                <textarea
                  value={trainingNeed}
                  onChange={(event) => setTrainingNeed(event.target.value)}
                  rows={4}
                  placeholder="Ex.: Pastor Alemão puxa na guia, ignora o tutor na rua e reage quando vê outro cão. Quero progressão para passeio mais calmo."
                  className="mt-3 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">2. Lembrete da próxima aula</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Anote para você mesmo onde parou. Aparecerá ao abrir a próxima sessão deste cão.
                    </p>
                  </div>
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700" title="Lembrete">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M12 3a5 5 0 0 0-5 5v3.5L5.5 14h13L17 11.5V8a5 5 0 0 0-5-5Z" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M9 18a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reminder}
                    onChange={(event) => setReminder(event.target.value)}
                    placeholder="Ex.: continuar place com 2m de distância"
                    className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveReminder}
                    className="pc-primary-action rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    Salvar lembrete
                  </button>
                </div>
                {reminderSaved ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{reminderSaved}</p>
                ) : null}
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">3. Linha do tempo (últimas 4 semanas)</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Visão cronológica dos treinos para entender onde parou com {selectedDog?.name ?? "este cão"}.
                </p>
                <ol className="mt-3 space-y-2 border-l border-sky-100 pl-3">
                  {dogTimeline.length === 0 ? (
                    <li className="text-xs text-[var(--muted)]">Sem sessões registradas no período.</li>
                  ) : null}
                  {dogTimeline.map((session) => (
                    <li key={session.id} className="rounded-xl border border-[var(--border)] bg-[#f7fbff] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--foreground)]">{session.date} • {session.title}</p>
                      {session.notes?.[0]?.comment ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">{session.notes[0].comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">4. Sugestão de plano de treino</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  A IA monta um roteiro técnico inicial. O adestrador decide o que aplicar e adapta ao cão real.
                </p>
                <button
                  type="button"
                  onClick={handleSuggestNextTraining}
                  className="mt-2 rounded-full border border-[#145a82] bg-[#145a82] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Gerar plano sugerido
                </button>
                {suggestion ? (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 font-sans text-xs text-[#245d84]">
                    {suggestion}
                  </pre>
                ) : null}
              </article>
            </section>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
