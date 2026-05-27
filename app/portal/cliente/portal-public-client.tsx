"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";


import { PageShell } from "@/components/page-shell";
import { GamificationPanel } from "@/components/gamification-panel";
import { MonthlyReport } from "@/components/monthly-report";
import { useGamification } from "@/lib/gamification";

type PortalTask = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  evidenceUrl: string | null;
};

type PortalFeedback = {
  id: string;
  author: "Tutor" | "Adestrador";
  message: string;
  createdAt: string;
};

type PortalEvent = {
  id: string;
  day: string;
  time: string;
  status: string;
  plan: string | null;
  sessionNumber: number;
};

type PortalSession = {
  id: string;
  title: string;
  date: string;
  notes: Array<{ block?: string; comment?: string; score?: number }>;
  media: Array<{ id?: string; dataUrl?: string; thumbDataUrl?: string }>;
  dogSessions?: Array<{
    id: string;
    activities: Array<{ name: string; completed: boolean; notes: string }>;
    commands: Array<{ command: string; rating: number; notes: string }>;
    description: string;
    aiSummary: string | null;
    nextFocus: string;
    nextCommands: string[];
    nextTasks: string[];
  }>;
};

type PortalData = {
  trainer: { id: string; name: string; phone: string | null };
  client: {
    id: string;
    name: string;
    phone: string | null;
    plan: string | null;
    dogs: Array<{
      id: string;
      name: string;
      breed: string | null;
      age: string | null;
      weight: string | null;
      photoUrl: string | null;
      trainingTypes: string;
    }>;
  };
  events: PortalEvent[];
  sessions: PortalSession[];
  tasks: PortalTask[];
  feedbacks: PortalFeedback[];
  linkMeta: { expiresAt: string; status: "Ativo" };
};

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function PortalPublicClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [pin, setPin] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [unlockAttempt, setUnlockAttempt] = useState(0);
  const [confirmEventId, setConfirmEventId] = useState<string | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [openVideo, setOpenVideo] = useState<{ id: string; src: string; title: string } | null>(null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState("");
  const [evidenceLightbox, setEvidenceLightbox] = useState<{ src: string; title: string } | null>(null);

  // Estados do Relatório de Evolução
  const [selectedReportDogId, setSelectedReportDogId] = useState("");
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportMonthOptions, setReportMonthOptions] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.feedbacks]);

  const gam = useGamification(token, { pin: pinRequired ? pin : undefined });

  const pinQuery = useMemo(() => (pinRequired && /^\d{4}$/.test(pin) ? `?pin=${encodeURIComponent(pin)}` : ""), [pinRequired, pin]);

  // Efeitos para carregar o Relatório de Evolução
  useEffect(() => {
    if (data?.client?.dogs && data.client.dogs.length > 0 && !selectedReportDogId) {
      setSelectedReportDogId(data.client.dogs[0].id);
    }
  }, [data, selectedReportDogId]);

  useEffect(() => {
    const options: string[] = [];
    const today = new Date();
    const monthsPt = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = monthsPt[d.getMonth()];
      const year = d.getFullYear();
      options.push(`${monthName} de ${year}`);
    }
    setReportMonthOptions(options);
    if (options.length > 0 && !selectedReportMonth) {
      setSelectedReportMonth(options[0]);
    }
  }, []);

  useEffect(() => {
    async function fetchReport() {
      if (!selectedReportDogId || !selectedReportMonth || !data) return;
      setReportLoading(true);
      setReportError("");
      try {
        const pinParam = pinRequired && pin ? `&pin=${encodeURIComponent(pin)}` : "";
        const url = `/api/portal-public/${encodeURIComponent(token)}/relatorios?dogId=${selectedReportDogId}&month=${encodeURIComponent(selectedReportMonth)}${pinParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Não foi possível carregar o relatório.");
        const report = await res.json();
        setReportData(report);
      } catch (err: any) {
        setReportError(err.message || "Erro ao carregar o relatório.");
      } finally {
        setReportLoading(false);
      }
    }
    fetchReport();
  }, [selectedReportDogId, selectedReportMonth, data, token, pin, pinRequired]);

  useEffect(() => {
    async function loadPortal() {
      setLoading(true);
      if (!pinRequired) setError("");
      try {
        const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, { cache: "no-store" });
        if (response.status === 401) {
          setPinRequired(true);
          setData(null);
          setLoading(false);
          return;
        }
        if (!response.ok) throw new Error("Link invalido");
        const payload = (await response.json()) as PortalData;
        setPinRequired(false);
        setData(payload);
      } catch {
        setError("Este link nao esta disponivel. Peca um novo link ao seu adestrador.");
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [token, pinQuery, pinRequired, unlockAttempt]);

  useEffect(() => {
    if (pinRequired || !data) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as PortalData;
          setData(payload);
        }
      } catch {
        // ignore background errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [token, pinQuery, pinRequired, data]);

  const featuredDog = data?.client.dogs[0];
  const featuredDogPhoto = photoLoadFailed ? "/images/dog-default-bolt.svg" : featuredDog?.photoUrl || "/images/dog-default-bolt.svg";

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [featuredDog?.id, featuredDog?.photoUrl]);

  const sessionGallery = useMemo(() => {
    if (!data) return [] as Array<{ id: string; src: string; sessionTitle: string; sessionDate: string }>;

    return data.sessions
      .flatMap((session) =>
        (session.media || []).map((media, index) => ({
          id: `${session.id}-${media.id || index}`,
          src: media.thumbDataUrl || media.dataUrl || "",
          sessionTitle: session.title,
          sessionDate: session.date,
        })),
      )
      .filter((item) => Boolean(item.src))
      .slice(0, 12);
  }, [data]);

  let latestSessionScore: { title: string; date: string; score: number } | null = null;
  for (const session of data?.sessions ?? []) {
    const scores = (session.notes || [])
      .map((note) => Number(note.score ?? 0))
      .filter((score) => Number.isFinite(score) && score > 0);

    if (scores.length) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      latestSessionScore = { title: session.title, date: session.date, score: average };
      break;
    }
  }

  async function handleToggleTask(task: PortalTask) {
    if (!data) return;

    const nextCompleted = !task.completed;
    setUpdatingTaskId(task.id);

    setData({
      ...data,
      tasks: data.tasks.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item)),
    });

    try {
      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, completed: nextCompleted }),
      });

      if (response.status === 401) {
        setPinRequired(true);
        throw new Error("PIN requerido");
      }
      if (!response.ok) throw new Error("Falha ao atualizar tarefa");

      const result = (await response.json()) as { ok?: boolean };
      if (!result.ok) throw new Error("Tarefa nao encontrada");

      gam.award(
        nextCompleted ? "task_completed" : "task_uncompleted",
        nextCompleted ? `Tarefa: ${task.title}` : undefined,
        task.id,
      );
    } catch {
      setData({
        ...data,
        tasks: data.tasks.map((item) => (item.id === task.id ? { ...item, completed: task.completed } : item)),
      });
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function handleUploadEvidence(taskId: string, file: File) {
    if (!data) return;

    setUploadingTaskId(taskId);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const originalTask = data.tasks.find((t) => t.id === taskId);
      const wasCompleted = originalTask?.completed;

      setData({
        ...data,
        tasks: data.tasks.map((item) =>
          item.id === taskId ? { ...item, completed: true, evidenceUrl: base64Data } : item
        ),
      });

      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completed: true, evidenceUrl: base64Data }),
      });

      if (response.status === 401) {
        setPinRequired(true);
        throw new Error("PIN requerido");
      }
      if (!response.ok) throw new Error("Falha ao enviar evidência");

      const result = (await response.json()) as { ok?: boolean };
      if (!result.ok) throw new Error("Tarefa nao encontrada");

      if (!wasCompleted) {
        gam.award("task_completed", undefined, taskId);
      }
      gam.award("task_evidence_uploaded", undefined, taskId);
    } catch (err) {
      console.error(err);
      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as PortalData;
        setData(payload);
      }
    } finally {
      setUploadingTaskId("");
    }
  }

  async function handleConfirmEvent(eventId: string, confirmed: boolean, reason?: string) {
    if (!data || confirmBusy) return;
    setConfirmBusy(true);
    try {
      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}/confirm${pinQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, confirmed, reason }),
      });
      if (!response.ok) throw new Error("Falha ao confirmar");
      const result = (await response.json()) as { ok?: boolean; status?: string };
      if (!result.ok) throw new Error("Resposta invalida");

      setData({
        ...data,
        events: data.events.map((event) =>
          event.id === eventId ? { ...event, status: result.status || (confirmed ? "Confirmado" : "Cancelado") } : event,
        ),
      });
      setConfirmEventId(null);
      setConfirmReason("");
      setConfirmDecline(false);
      if (confirmed) gam.award("training_completed", "Presença confirmada");
    } catch {
      setError("Não foi possível registrar sua resposta. Tente novamente.");
    } finally {
      setConfirmBusy(false);
    }
  }

  async function handleSendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackMessage.trim() || sendingFeedback || !data) return;

    setSendingFeedback(true);

    try {
      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackMessage.trim(), author: "Tutor" }),
      });

      if (!response.ok) throw new Error("Falha ao enviar");
      const created = (await response.json()) as PortalFeedback;

      setData({
        ...data,
        feedbacks: [created, ...data.feedbacks],
      });
      setFeedbackMessage("");
      gam.award("feedback_sent", "Comentário enviado");
    } catch {
      setError("Nao foi possivel enviar o comentario agora.");
    } finally {
      setSendingFeedback(false);
    }
  }

  if (loading) {
    return (
      <PageShell
        kicker="Portal"
        title="Carregando portal do tutor"
        description="Validando acesso e carregando os dados do acompanhamento."
      >
        <p className="text-sm text-[var(--muted)]">Aguarde alguns segundos...</p>
      </PageShell>
    );
  }

  if (error || !data) {
    if (pinRequired) {
      return (
        <PageShell
          kicker="Portal"
          title="Este portal usa PIN"
          description="Digite o PIN de 4 digitos enviado pelo adestrador para liberar o acesso."
        >
          <form
            className="max-w-sm space-y-3 rounded-2xl border border-[var(--border)] bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!/^\d{4}$/.test(pin)) {
                setError("Digite um PIN valido de 4 digitos.");
                return;
              }
              setError("");
              setPinRequired(true);
              setUnlockAttempt((value) => value + 1);
            }}
          >
            <label className="grid gap-2 text-sm font-medium">
              PIN de acesso
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 outline-none focus:border-sky-400"
              />
            </label>
            <button type="submit" className="pc-primary-action rounded-full px-4 py-2 text-sm font-semibold">
              Desbloquear portal
            </button>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </form>
        </PageShell>
      );
    }

    return (
      <PageShell
        kicker="Portal"
        title="Link indisponivel"
        description="Este acesso pode ter expirado, sido revogado ou digitado de forma incorreta."
      >
        <p className="text-sm text-[var(--muted)]">{error || "Solicite um novo link ao adestrador."}</p>
      </PageShell>
    );
  }

  const completedTasks = data.tasks.filter((task) => task.completed).length;
  const scoreStars = latestSessionScore ? Math.round(Math.min(Math.max(latestSessionScore.score, 0), 10) / 2) : 0;
  const nextEvent = data.events[0];
  const latestSession = data.sessions[0];
  const pendingConfirmEvent = data.events.find((event) =>
    event.status === "Pendente" || event.status === "Aguardando",
  );

  return (
    <PageShell
      kicker="Portal do tutor"
      title={`${featuredDog?.name || "Seu cão"}: tarefas e próxima aula`}
      description="Veja o que fazer em casa, quando será a próxima aula e o resumo mais recente do treino."
    >
      <section className="space-y-4">
        {/* Banner de Confirmação de Presença (módulo 7 §8.2) */}
        {pendingConfirmEvent ? (
          <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50 p-4 text-sky-900 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">Confirmar presença</p>
                <h3 className="mt-0.5 font-semibold text-sm">
                  Próximo treino: {pendingConfirmEvent.day} às {pendingConfirmEvent.time}
                </h3>
                <p className="text-xs text-sky-800 mt-0.5">
                  Avise o adestrador se {featuredDog?.name || "seu cão"} vai comparecer. Isso ajuda a manter a rotina e evita aulas perdidas.
                </p>
              </div>
              {confirmEventId === pendingConfirmEvent.id && confirmDecline ? (
                <div className="grid gap-2 sm:min-w-64">
                  <input
                    type="text"
                    value={confirmReason}
                    onChange={(e) => setConfirmReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={confirmBusy}
                      onClick={() => {
                        setConfirmEventId(null);
                        setConfirmDecline(false);
                        setConfirmReason("");
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={confirmBusy}
                      onClick={() => handleConfirmEvent(pendingConfirmEvent.id, false, confirmReason)}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Enviar recusa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={() => handleConfirmEvent(pendingConfirmEvent.id, true)}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                  >
                    ✅ Confirmar presença
                  </button>
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={() => {
                      setConfirmEventId(pendingConfirmEvent.id);
                      setConfirmDecline(true);
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    ❌ Não vou conseguir
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Banner de Onboarding/Atualização cadastral */}
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">📋 Ficha de Acompanhamento do Cão</h3>
            <p className="text-xs text-amber-800 mt-0.5">Preencha ou atualize as informações de saúde, rotina e temperamento do seu cão para personalizar as aulas.</p>
          </div>
          <Link
            href={`/portal/cliente/${token}/onboarding${pinQuery}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap shadow-sm transition"
          >
            Preencher Ficha
          </Link>
        </div>

        <article className="rounded-[1.75rem] border border-[var(--border)] bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {featuredDog?.photoUrl ? (
                <Image
                  src={featuredDogPhoto}
                  alt={`Foto de ${featuredDog.name}`}
                  width={90}
                  height={90}
                  unoptimized
                  onError={() => setPhotoLoadFailed(true)}
                  className="h-20 w-20 rounded-[1.25rem] object-cover border border-white/10"
                />
              ) : (
                <Image
                  src={featuredDogPhoto}
                  alt={`Foto de ${featuredDog?.name || "Pet"}`}
                  width={90}
                  height={90}
                  unoptimized
                  className="h-20 w-20 rounded-[1.25rem] object-cover border border-white/10"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">{featuredDog?.name || "Pet"}</h2>
                  {gam.state.streakDays > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/25 px-2 py-0.5 text-xs font-bold text-orange-400 border border-orange-500/35 animate-pulse" title="Sequência diária de atividades">
                      🔥 {gam.state.streakDays} d
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-300">Tutor: {data.client.name}</p>
                <p className="text-xs text-slate-300">Adestrador: {data.trainer.name}</p>
                
                {/* Informações de Nível do Cão */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/35">
                      Nível {gam.state.level}
                    </span>
                    <span className="text-[11px] font-medium text-slate-200">
                      {gam.state.dogRank}
                    </span>
                  </div>
                  {/* Barra de Progresso Canino */}
                  <div className="w-48">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>{gam.state.xpInLevel} / 100 XP</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((gam.state.xpInLevel / 100) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-300">
              <p>Link: {data.linkMeta.status}</p>
              <p>Expira em: {formatDateTime(data.linkMeta.expiresAt)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300 font-semibold">Tarefas</p>
              <p className="mt-2 text-2xl font-semibold">{completedTasks}/{data.tasks.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300 font-semibold">Próxima aula</p>
              <p className="mt-2 text-2xl font-semibold">{nextEvent ? nextEvent.time : "-"}</p>
              <p className="mt-1 text-xs text-slate-300">{nextEvent?.day || "Sem data"}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300 font-semibold">Último treino</p>
              <p className="mt-2 text-xl font-semibold">{latestSession?.date || "-"}</p>
              <p className="mt-1 text-xs text-slate-300">{latestSession?.title || "Sem registro"}</p>
            </div>
          </div>
        </article>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Tarefas de casa</p>
            <div className="mt-4 space-y-3">
              {data.tasks.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem tarefas registradas para este caso.</p> : null}
              {data.tasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={updatingTaskId === task.id}
                      onClick={() => handleToggleTask(task)}
                      className={`mt-1 h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center transition ${task.completed ? "bg-sky-500 border-sky-600 text-white" : "bg-white border-[var(--border)]"}`}
                    >
                      {task.completed && (
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={`font-semibold ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>{task.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{task.description || "Sem descrição."}</p>
                    </div>
                  </div>

                  {/* Evidence display & upload */}
                  <div className="mt-2 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {task.evidenceUrl ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEvidenceLightbox({ src: task.evidenceUrl!, title: task.title })}
                          className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:opacity-85 transition flex-shrink-0"
                        >
                          {task.evidenceUrl.startsWith("data:video") ? (
                            <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white text-[9px] font-bold">
                              🎥 Vídeo
                            </div>
                          ) : (
                            <Image
                              src={task.evidenceUrl}
                              alt="Evidência"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          )}
                        </button>
                        <div>
                          <p className="font-semibold text-emerald-700 flex items-center gap-1">
                            <span>✅ Evidência Enviada</span>
                            <span className="rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[8px] font-bold">+15 XP</span>
                          </p>
                          <label className="cursor-pointer text-[#145a82] hover:underline font-semibold mt-0.5 block text-[10px]">
                            Alterar arquivo
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={uploadingTaskId === task.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadEvidence(task.id, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full text-slate-500">
                        <span>Nenhuma evidência enviada</span>
                        <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-[#145a82] bg-white px-2.5 py-1.5 font-bold text-[#145a82] hover:bg-slate-50 transition text-[11px]">
                          {uploadingTaskId === task.id ? (
                            <span>Enviando...</span>
                          ) : (
                            <>
                              <span>📸 Prova de Treino</span>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded ml-1">+15 pts</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={uploadingTaskId === task.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadEvidence(task.id, file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Agenda e notas</p>
            <div className="mt-4 space-y-3">
              {data.events.slice(0, 3).map((event) => (
                <div key={event.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                  <p className="font-semibold">{event.day} - {event.time}</p>
                  <p className="text-xs text-[var(--muted)]">Sessao {event.sessionNumber} - {event.status}</p>
                </div>
              ))}
              {data.events.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem encontros na agenda.</p> : null}
            </div>

            <div className="mt-4 space-y-2">
              {data.sessions.slice(0, 5).map((session) => {
                const isExpanded = expandedSessionId === session.id;
                const hasDetailedSessions = Array.isArray(session.dogSessions) && session.dogSessions.length > 0;
                return (
                  <div key={session.id} className="rounded-2xl border border-[var(--border)] bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{session.date} - {session.title}</p>
                        <p className="text-[10px] text-[var(--muted)]">{hasDetailedSessions ? "Treino Estruturado" : "Treino Simples"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-1 text-xs font-semibold text-[#145a82]"
                      >
                        {isExpanded ? "Fechar" : "Evolução"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 border-t border-slate-100 pt-3.5 space-y-3.5 text-xs text-slate-700 animate-in fade-in duration-200">
                        {hasDetailedSessions ? (
                          session.dogSessions!.map((ds, index) => (
                            <div key={ds.id || index} className="space-y-3.5">
                              {/* Seção A: Atividades */}
                              {ds.activities && ds.activities.length > 0 && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">A. Atividades Trabalhadas</p>
                                  <ul className="mt-1 space-y-1 pl-1">
                                    {ds.activities.map((act: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-1.5">
                                        <span>{act.completed ? "✅" : "❌"}</span>
                                        <div>
                                          <span className="font-semibold text-slate-800">{act.name}</span>
                                          {act.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{act.notes}</p>}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Seção B: Comandos */}
                              {ds.commands && ds.commands.length > 0 && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">B. Comandos de Obediência</p>
                                  <ul className="mt-1 space-y-1.5 pl-1">
                                    {ds.commands.map((cmd: any, idx: number) => (
                                      <li key={idx}>
                                        <div className="flex items-center gap-1.5 justify-between">
                                          <span className="font-semibold text-slate-800">{cmd.command}</span>
                                          <span className="text-amber-500">{"★".repeat(cmd.rating || 0)}</span>
                                        </div>
                                        {cmd.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{cmd.notes}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Seção C: Resumo Público */}
                              {ds.description && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">C. Resumo do Adestrador</p>
                                  <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded-xl leading-relaxed">{ds.description}</p>
                                </div>
                              )}

                              {/* Seção E: IA Resumo */}
                              {ds.aiSummary && (
                                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 space-y-1">
                                  <p className="font-bold text-purple-800 uppercase tracking-[0.08em] text-[9px]">✨ Análise de IA do Treino</p>
                                  <p className="text-purple-950 leading-relaxed italic">"{ds.aiSummary}"</p>
                                </div>
                              )}

                              {/* Seção G: Próximo Foco */}
                              {ds.nextFocus && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">G. Próximo Foco das Aulas</p>
                                  <p className="mt-1 text-slate-700 leading-relaxed font-semibold">🎯 {ds.nextFocus}</p>
                                </div>
                              )}

                              {/* Seção H: Próximos Comandos */}
                              {ds.nextCommands && ds.nextCommands.length > 0 && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">H. Próximos Comandos a Trabalhar</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {ds.nextCommands.map((nc: string, idx: number) => (
                                      <span key={idx} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-800 border border-slate-200">{nc}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Seção I: Dever de Casa */}
                              {ds.nextTasks && ds.nextTasks.length > 0 && (
                                <div>
                                  <p className="font-bold text-[#145a82] uppercase tracking-[0.08em] text-[9px]">I. Tarefas para Fazer em Casa</p>
                                  <ul className="mt-1 space-y-1 pl-1">
                                    {ds.nextTasks.map((t: string, idx: number) => (
                                      <li key={idx} className="text-slate-700">🏠 {t}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          // Fallback para notas antigas
                          <div className="space-y-1.5">
                            {session.notes.map((n, idx) => (
                              <div key={idx} className="bg-slate-50 p-2 rounded-lg">
                                <p className="font-semibold text-slate-800">{n.block} (Nota: {n.score ? (n.score / 2) : 0}/5)</p>
                                <p className="text-slate-600 mt-0.5 text-xs">{n.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {data.sessions.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem sessoes registradas.</p> : null}
            </div>
          </article>
        </div>

        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Avaliacao e evidencias</p>
          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-white p-3">
            {latestSessionScore ? (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)]">Ultima avaliacao: {latestSessionScore.title}</p>
                <p className="text-xs text-[var(--muted)]">{latestSessionScore.date}</p>
                <p className="mt-2 text-base text-amber-500">{"★".repeat(scoreStars)}{"☆".repeat(5 - scoreStars)}</p>
                <p className="text-xs text-[var(--muted)]">Media tecnica: {latestSessionScore.score.toFixed(1)}/10</p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">Ainda nao ha avaliacao numerica registrada.</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {sessionGallery.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpenVideo({ id: item.id, src: item.src, title: item.sessionTitle });
                  gam.watchVideo(item.id);
                }}
                className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white text-left transition hover:border-sky-300"
              >
                <div className="relative h-20 w-full">
                  <Image src={item.src} alt={`Treino ${item.sessionTitle}`} fill sizes="(min-width: 768px) 8rem, 30vw" unoptimized className="object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-2xl text-white opacity-0 transition group-hover:opacity-100">▶</span>
                  {gam.state.watchedVideos.includes(item.id) ? (
                    <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">Visto</span>
                  ) : (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-900">+15 pts</span>
                  )}
                </div>
                <p className="truncate px-2 py-1 text-[10px] text-[var(--muted)]">{item.sessionDate}</p>
              </button>
            ))}
            {sessionGallery.length === 0 ? <p className="col-span-3 text-sm text-[var(--muted)]">Sem fotos anexadas nas sessões até o momento.</p> : null}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Avalie as últimas aulas</p>
            <div className="mt-2 grid gap-2">
              {data.sessions.slice(0, 5).map((session) => {
                const current = gam.state.sessionRatings[session.id] ?? 0;
                return (
                  <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{session.title}</p>
                      <p className="text-[11px] text-[var(--muted)]">{session.date}</p>
                    </div>
                    <div className="flex items-center gap-1" role="radiogroup" aria-label={`Avaliar ${session.title}`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => gam.rateSession(session.id, star)}
                          className={`text-xl leading-none ${current >= star ? "text-amber-400" : "text-slate-300"}`}
                          aria-label={`${star} estrelas`}
                        >★</button>
                      ))}
                      {current === 0 ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">+15 pts</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {data.sessions.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem aulas registradas para avaliar.</p> : null}
            </div>
          </div>
        </article>

        <GamificationPanel
          state={gam.state}
          trainerName={data.trainer.name}
          onRateTrainer={gam.rateTrainer}
          lastEarned={gam.lastEarned}
          onDismissEarned={gam.dismissEarned}
        />

        {/* Estilo e Seção do Relatório de Evolução Mensal */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-report-container-tutor, #printable-report-container-tutor * {
              visibility: visible;
            }
            #printable-report-container-tutor {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              box-shadow: none;
              padding: 0;
              margin: 0;
            }
            #printable-report-container-tutor button,
            #printable-report-container-tutor .flex.gap-3 {
              display: none !important;
            }
          }
        `}</style>

        <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2d6f99]">Pedagógico</p>
              <h3 className="font-display text-lg font-bold text-slate-900">Relatório de Evolução Mensal</h3>
              <p className="text-xs text-[var(--muted)]">Acompanhe o desempenho do cão e as orientações para casa.</p>
            </div>
            
            <div className="flex gap-2 font-medium">
              {data.client.dogs.length > 1 && (
                <select
                  value={selectedReportDogId}
                  onChange={(e) => setSelectedReportDogId(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--foreground)] outline-none"
                >
                  {data.client.dogs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              
              <select
                value={selectedReportMonth}
                onChange={(e) => setSelectedReportMonth(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--foreground)] outline-none"
              >
                {reportMonthOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </header>

          {reportLoading ? (
            <p className="text-center text-xs text-[var(--muted)] py-6">Carregando relatório pedagógico...</p>
          ) : reportError ? (
            <p className="text-center text-xs text-rose-600 py-6">{reportError}</p>
          ) : reportData ? (
            <div id="printable-report-container-tutor" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
              <MonthlyReport
                report={reportData}
                onDownloadPDF={() => window.print()}
              />
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--muted)] py-6">Nenhum relatório encontrado para o período selecionado.</p>
          )}
        </article>

        <article className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-sm h-[420px] flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Central de Mensagens</p>
          
          {/* Scrolling messages list */}
          <div className="flex-1 overflow-y-auto mt-3.5 mb-3.5 space-y-3 p-2 bg-slate-50/50 rounded-2xl border border-[var(--border)]">
            {data.feedbacks.length === 0 ? (
              <p className="text-center text-xs text-[var(--muted)] py-12">Nenhum comentário enviado ainda.</p>
            ) : (
              [...data.feedbacks].reverse().map((feedback) => {
                const isMe = feedback.author === "Tutor";
                return (
                  <div
                    key={feedback.id}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-1.5 text-xs leading-relaxed ${
                        isMe
                          ? "bg-[linear-gradient(135deg,_#145a82,_#247eb2)] text-white rounded-tr-none"
                          : "bg-white border border-[var(--border)] text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {feedback.message}
                    </div>
                    <span className="text-[9px] text-[var(--muted)] mt-1 px-1">
                      {isMe ? "Você" : data.trainer.name} • {formatDateTime(feedback.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendFeedback} className="flex gap-2">
            <input
              type="text"
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              className="flex-1 rounded-xl border border-[var(--border)] bg-slate-50 px-3.5 py-1.5 text-xs outline-none focus:border-sky-400 focus:bg-white"
              placeholder="Digite sua dúvida ou feedback..."
              required
            />
            <button
              type="submit"
              disabled={sendingFeedback || !feedbackMessage.trim()}
              className="rounded-xl bg-[#145a82] text-white px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {sendingFeedback ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </article>
      </section>

      {openVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={() => setOpenVideo(null)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">{openVideo.title}</p>
              <button type="button" onClick={() => setOpenVideo(null)} className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold">Fechar</button>
            </div>
            <div className="relative flex h-[60vh] items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={openVideo.src} alt={openVideo.title} className="max-h-full max-w-full object-contain" />
            </div>
            <p className="px-4 py-2 text-xs text-emerald-700">+15 pts por assistir o material da aula.</p>
          </div>
        </div>
      ) : null}

      {evidenceLightbox ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={() => setEvidenceLightbox(null)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">Evidência: {evidenceLightbox.title}</p>
              <button type="button" onClick={() => setEvidenceLightbox(null)} className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold">Fechar</button>
            </div>
            <div className="relative flex h-[60vh] items-center justify-center bg-black">
              {evidenceLightbox.src.startsWith("data:video") ? (
                <video src={evidenceLightbox.src} controls className="max-h-full max-w-full object-contain" autoPlay />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={evidenceLightbox.src} alt={evidenceLightbox.title} className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
