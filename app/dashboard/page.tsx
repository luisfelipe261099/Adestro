"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AttentionDogs } from "@/components/attention-dogs";
import { AuthGuard } from "@/components/auth-guard";
import { DailyBriefCard } from "@/components/daily-brief-card";
import { DayBoard } from "@/components/day-board";
import { UpcomingSessions } from "@/components/upcoming-sessions";
import { ClientFollowup } from "@/components/client-followup";
import {
  IconAlert,
  IconCalendar,
  IconDog,
  IconDollar,
  IconPlus,
  IconReport,
  IconSparkle,
} from "@/components/icons";
import { NextActionCard } from "@/components/next-action-card";
import { NextSessionCard } from "@/components/next-session-card";
import { TRAINER_TOUR_DONE_KEY, useTour } from "@/components/product-tour";
import { useAppStore } from "@/lib/app-store";
import {
  computeDogAttention,
  eventsInWeek,
  eventsOnDay,
  isActiveEvent,
  pickNextSession,
} from "@/lib/home-agenda";
import { useNow } from "@/lib/use-now";

function getFirstName(name: string): string {
  const first = name.trim().split(" ")[0];
  return first || "Adestrador";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const router = useRouter();
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const clients = useAppStore((state) => state.clients);
  const trainerName = useAppStore((state) => state.trainerName);
  const startTour = useTour((s) => s.start);
  const now = useNow();

  const [tourDone, setTourDone] = useState(false);
  const [finance, setFinance] = useState<{ received: number; pending: number; overdue: number; activeContracts: number } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTourDone(window.localStorage.getItem(TRAINER_TOUR_DONE_KEY) === "1");
    }
  }, []);

  // Tour automático na 1ª entrada: só para conta nova (0-1 clientes), depois do
  // wizard de boas-vindas, uma única vez. Usuário estabelecido nunca é interrompido.
  // A flag de onboarding é checada DENTRO do timer: ela é gravada por um fetch
  // assíncrono e ainda não existe no primeiro render.
  // (`clients` já vem do seletor declarado no topo do componente.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = window.localStorage;
    if (storage.getItem(TRAINER_TOUR_DONE_KEY) === "1") return;
    if (storage.getItem("adestro-tour-autostarted") === "1") return;
    if (clients.length > 1) return;
    const timer = window.setTimeout(() => {
      if (!storage.getItem("adestro-onboarding-done")) return; // ainda no boas-vindas
      storage.setItem("adestro-tour-autostarted", "1");
      startTour();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [clients.length, startTour]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/finance/overview", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.metrics) return;
        setFinance(data.metrics);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function brl(value: number): string {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("adestro-onboarding-done")) return;
    let cancelled = false;
    fetch("/api/trainer/plan-status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.usage?.clients === 0) {
          router.replace("/bem-vindo");
        } else {
          window.localStorage.setItem("adestro-onboarding-done", "1");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Aulas de hoje e da semana — seletores compartilhados com o Quadro do dia,
  // para que card e quadro nunca mais divirjam. Ambos ignoram canceladas.
  const todayEvents = useMemo(() => eventsOnDay(events, new Date(now)), [events, now]);
  const weekEvents = useMemo(() => eventsInWeek(events, new Date(now)), [events, now]);

  // Aulas ainda não confirmadas pelo tutor.
  const awaitingConfirmation = useMemo(
    () => events.filter((e) => isActiveEvent(e) && (e.status === "Pendente" || e.status === "Aguardando")).length,
    [events],
  );

  // Cães sem nenhuma aula marcada para os próximos 7 dias ("aulas a agendar").
  const attention = useMemo(
    () => computeDogAttention(clients, events, sessions, now, { includeInactive: false }),
    [clients, events, sessions, now],
  );
  const dogsToSchedule = attention.filter((item) => item.level === "amber").length;
  const dogsMissingRecord = attention.filter((item) => item.level === "red").length;

  const pendenciasTotal = dogsMissingRecord + awaitingConfirmation;
  const checklistTotal = todayEvents.length + dogsMissingRecord;

  const nextEvent = useMemo(() => pickNextSession(events, now), [events, now]);

  const contextLine = nextEvent
    ? `A próxima é com ${nextEvent.dog} às ${nextEvent.time}.`
    : "Sem sessões agendadas no momento.";

  // 5 cards do documento — cor = foco (Azul / Azul claro / Verde / Laranja / Roxo).
  const statCards = useMemo(
    () => [
      {
        key: "agenda-dia",
        // valor 0 = card apagado (não compete por atenção); >0 = cor plena
        tone: todayEvents.length === 0 ? "stat-card-dim" : "stat-card-blue",
        label: "Agenda do dia",
        value: todayEvents.length,
        hint: "aulas hoje",
        sub:
          todayEvents.length === 0
            ? "Nenhuma aula marcada para hoje"
            : todayEvents.map((e) => e.time).join(" · "),
        href: "/agenda?view=dia",
        Icon: IconCalendar,
      },
      {
        key: "agenda-semana",
        tone: weekEvents.length === 0 ? "stat-card-dim" : "stat-card-sky",
        label: "Agenda da semana",
        value: weekEvents.length,
        hint: "aulas agendadas",
        sub: `${dogsToSchedule} cão(es) a agendar · ${clients.length} cliente(s)`,
        href: "/agenda?view=semana",
        Icon: IconCalendar,
      },
      {
        key: "financeiro",
        tone: "stat-card-green",
        label: "Financeiro",
        value: finance ? brl(finance.received) : "—",
        hint: "já recebido dos clientes",
        sub: finance
          ? `${brl(finance.pending)} a receber · ${brl(finance.overdue)} em atraso`
          : "Carregando…",
        href: "/financeiro",
        Icon: IconDollar,
      },
      {
        key: "pendencias",
        // pendência > 0 muda o ESTADO do card: borda grossa + fundo alerta
        tone: pendenciasTotal > 0 ? "stat-card-orange stat-card-alert" : "stat-card-dim",
        label: "Pendências",
        value: pendenciasTotal,
        hint: "itens travados",
        sub: `${dogsMissingRecord} treino(s) sem registro · ${awaitingConfirmation} aula(s) a confirmar`,
        href: "/pendencias",
        Icon: IconAlert,
      },
      {
        key: "checklist",
        tone: checklistTotal === 0 ? "stat-card-dim" : "stat-card-purple",
        label: "Checklist do dia",
        value: checklistTotal,
        hint: "tarefas de hoje",
        sub: checklistTotal === 0 ? "Tudo em dia" : "Ver a lista no Quadro do dia",
        href: "#quadro-do-dia",
        Icon: IconReport,
      },
    ],
    [
      todayEvents,
      weekEvents.length,
      dogsToSchedule,
      dogsMissingRecord,
      awaitingConfirmation,
      clients.length,
      finance,
      pendenciasTotal,
      checklistTotal,
    ],
  );

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        {/* Header — mensagem contextual + ações */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[26px]">
              {getGreeting()}, {getFirstName(trainerName || "adestrador")}
            </h1>
            <p className="mt-0.5 text-[14px] text-[var(--muted)]">
              Você tem {todayEvents.length} {todayEvents.length === 1 ? "aula" : "aulas"} hoje. {contextLine}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!tourDone ? (
              <button type="button" onClick={() => startTour()} className="btn-secondary">
                <IconSparkle className="h-3.5 w-3.5" />
                Tour rápido
              </button>
            ) : null}
            <Link
              href="/treinos/registro"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-[14px] font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-2)]"
            >
              <IconDog className="h-4 w-4" />
              Registrar treino
            </Link>
            <Link href="/agenda?new=true" className="btn-action">
              <IconPlus className="h-4 w-4" />
              Novo agendamento
            </Link>
          </div>
        </header>

        {/* Jornada inicial — 1 ação por vez até a conta engrenar (some quando completa) */}
        <NextActionCard />

        {/* Hero — próxima sessão (elemento dominante: "o que faço agora?") */}
        <div className="mt-6">
          <NextSessionCard />
        </div>

        {/* 5 cards do documento — cor = foco (TDAH-friendly) */}
        <section data-tour="stat-cards" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card) => (
            <Link key={card.key} href={card.href} className={`stat-card group ${card.tone}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--c)" }}>
                  {card.label}
                </span>
                <card.Icon className="h-4 w-4" style={{ color: "var(--c)" }} />
              </div>
              <p className="mt-2.5 text-[26px] font-extrabold leading-none tracking-tight text-[var(--foreground)]">
                {card.value}
              </p>
              <p className="mt-1 text-[12px] font-medium text-[var(--muted-strong)]">{card.hint}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted)]">{card.sub}</p>
            </Link>
          ))}
        </section>

        {/* Próximas aulas — lista da semana em ordem crescente de data/hora */}
        <div className="mt-4">
          <UpcomingSessions />
        </div>

        {/* Quadro do dia — kanban de status das aulas (integra com o foco do dia) */}
        <div className="mt-4" id="quadro-do-dia">
          <DayBoard />
        </div>

        {/* Foco nos cães + Prioridades da semana */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AttentionDogs />
          </div>
          <div data-tour="brief">
            <DailyBriefCard />
          </div>
        </div>

        {/* Acompanhamento dos clientes — adesão e silêncio (Fase 2) */}
        <div className="mt-6">
          <ClientFollowup />
        </div>
      </main>
    </AuthGuard>
  );
}
