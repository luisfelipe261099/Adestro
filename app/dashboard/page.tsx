"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AttentionDogs } from "@/components/attention-dogs";
import { AuthGuard } from "@/components/auth-guard";
import { DailyBriefCard } from "@/components/daily-brief-card";
import {
  IconAlert,
  IconArrowRight,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconDog,
  IconDollar,
  IconPlus,
  IconReport,
  IconSparkle,
  IconUsers,
} from "@/components/icons";
import { NextSessionCard } from "@/components/next-session-card";
import { useTour } from "@/components/product-tour";
import { useAppStore } from "@/lib/app-store";

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

function statusTone(status: string): string {
  if (status === "Confirmado") return "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20";
  if (status === "Cancelado") return "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20";
  if (status === "Recorrente") return "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20";
  return "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20";
}

function statusLabel(status: string): string {
  if (status === "Confirmado") return "Confirmado";
  if (status === "Pendente" || status === "Aguardando") return "Aguardando";
  if (status === "Recorrente") return "Recorrente";
  return "Cancelado";
}

export default function DashboardPage() {
  const router = useRouter();
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const trainerName = useAppStore((state) => state.trainerName);
  const startTour = useTour((s) => s.start);

  const [tourDone, setTourDone] = useState(false);
  const [finance, setFinance] = useState<{ received: number; pending: number; overdue: number; activeContracts: number } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTourDone(window.localStorage.getItem("adestro-tour-done") === "1");
    }
  }, []);

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

  const upcomingEvents = events.slice(0, 5);
  const pendingEvents = events.filter((e) => e.status === "Pendente" || e.status === "Aguardando").length;

  // Agenda do dia — casa nome do dia OU data (igual ao Brief).
  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const today = new Date();
  const todayName = weekdayNames[today.getDay()] ?? "";
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const eventsToday = events.filter((e) => {
    const day = e.day.trim();
    return day === todayStr || day.toLowerCase().includes(todayName.toLowerCase());
  });

  // Treinos sem registro: aulas confirmadas cujo cão ainda não tem sessão.
  const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);
  const treinosSemRegistro = events.filter(
    (e) => e.status === "Confirmado" && e.dogId && !sessionDogIds.has(e.dogId),
  ).length;
  const pendenciasTotal = treinosSemRegistro + pendingEvents;

  // Checklist do dia — tarefas rápidas derivadas da rotina.
  const checklistTotal = eventsToday.length + treinosSemRegistro;

  // Resumo contextual do header (orienta ação, não só "resumo da operação").
  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${eventsToday.length} ${eventsToday.length === 1 ? "sessão" : "sessões"} hoje`);
    parts.push(`${treinosSemRegistro} ${treinosSemRegistro === 1 ? "treino a registrar" : "treinos a registrar"}`);
    if (finance) parts.push(finance.overdue > 0 ? `${brl(finance.overdue)} em atraso` : "0 em atraso");
    return parts.join(" · ");
  }, [eventsToday.length, treinosSemRegistro, finance]);

  // 4 cards-foco (cor = foco, conforme documento de cores). "Agenda da semana"
  // saiu por ser redundante com "Agenda do dia" e diluir a hierarquia.
  const statCards = useMemo(
    () => [
      {
        key: "agenda-dia",
        tone: "stat-card-blue",
        emoji: "📅",
        label: "Agenda do dia",
        value: eventsToday.length,
        sub: eventsToday.length === 0 ? "Sem atendimentos hoje" : `${eventsToday.length} atendimento(s) hoje`,
        href: "/agenda",
        Icon: IconCalendar,
      },
      {
        key: "financeiro",
        tone: "stat-card-green",
        emoji: "💰",
        label: "Financeiro",
        value: finance ? brl(finance.received) : "—",
        sub: finance ? `${brl(finance.pending)} a receber · ${brl(finance.overdue)} em atraso` : "Carregando…",
        href: "/financeiro",
        Icon: IconDollar,
      },
      {
        key: "pendencias",
        tone: "stat-card-orange",
        emoji: "🔔",
        label: "Pendências",
        value: pendenciasTotal,
        sub: `${treinosSemRegistro} treino(s) sem registro`,
        href: "/treinos",
        Icon: IconAlert,
      },
      {
        key: "checklist",
        tone: "stat-card-purple",
        emoji: "📋",
        label: "Checklist do dia",
        value: checklistTotal,
        sub: checklistTotal === 0 ? "Tudo em dia 🎉" : "Tarefas rápidas de hoje",
        href: "/agenda",
        Icon: IconReport,
      },
    ],
    [eventsToday.length, pendenciasTotal, treinosSemRegistro, checklistTotal, finance],
  );

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        {/* Header — saudação contextual + ações */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[26px]">
              {getGreeting()}, {getFirstName(trainerName || "adestrador")}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-[var(--muted)]">Você tem {summary}.</p>
          </div>
          <div className="flex items-center gap-2">
            {!tourDone ? (
              <button
                type="button"
                onClick={() => startTour()}
                className="btn-secondary text-[12.5px]"
              >
                <IconSparkle className="h-3.5 w-3.5" />
                Tour rápido
              </button>
            ) : null}
            <Link href="/agenda?new=true" className="btn-primary text-[12.5px]">
              <IconPlus className="h-3.5 w-3.5" />
              Novo agendamento
            </Link>
          </div>
        </header>

        {/* Hero — o que fazer agora: próxima sessão (elemento dominante) */}
        <div className="mt-6">
          <NextSessionCard />
        </div>

        {/* Faixa compacta de cards-foco (cor = foco, TDAH-friendly) */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => (
            <Link key={card.key} href={card.href} className={`stat-card group ${card.tone}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--c)" }}>
                  <span className="text-[15px] leading-none">{card.emoji}</span>
                  {card.label}
                </span>
                <card.Icon className="h-4 w-4" style={{ color: "var(--c)" }} />
              </div>
              <p className="mt-2.5 text-[22px] font-bold tracking-tight text-[var(--foreground)]">{card.value}</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{card.sub}</p>
            </Link>
          ))}
        </section>

        {/* Próximos atendimentos + Brief do dia */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Próximos atendimentos</h2>
                <p className="text-[11.5px] text-[var(--muted)]">{upcomingEvents.length} eventos nos próximos dias</p>
              </div>
              <Link href="/agenda" className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
                Ver agenda
              </Link>
            </header>
            {upcomingEvents.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-[13px] text-[var(--muted)]">Nenhum atendimento agendado.</p>
                <Link href="/agenda?new=true" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--foreground)] hover:underline">
                  Criar primeiro agendamento <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/agenda`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]/40"
                    >
                      <div className="flex w-14 flex-col items-start">
                        <span className="text-[12.5px] font-semibold text-[var(--foreground)]">{event.time}</span>
                        <span className="text-[10px] text-[var(--muted)]">{event.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-[var(--foreground)]">{event.dog}</p>
                        <p className="truncate text-[11.5px] text-[var(--muted)]">
                          {event.client}
                          {event.sessionNumber ? ` · Sessão ${event.sessionNumber}` : ""}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-[22px] items-center rounded border px-2 text-[10px] font-medium ${statusTone(event.status)}`}
                      >
                        {statusLabel(event.status)}
                      </span>
                      <IconChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Brief do dia */}
          <div data-tour="brief">
            <DailyBriefCard />
          </div>
        </div>

        {/* Cães em atenção + Pendências */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AttentionDogs />
          </div>

          <section className="card p-4">
            <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Pendências</h2>
            <div className="mt-3 space-y-2">
              <Link
                href="/portal"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] transition-colors hover:bg-[var(--surface-2)]/40"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <IconReport className="h-3.5 w-3.5 text-[var(--warning)]" />
                  Relatórios aguardando aprovação
                </span>
                <span className="font-medium text-[var(--foreground)]">0</span>
              </Link>
              <Link
                href="/treinos"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] transition-colors hover:bg-[var(--surface-2)]/40"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <IconAlert className="h-3.5 w-3.5 text-[var(--warning)]" />
                  Treinos sem registro
                </span>
                <span className="font-medium text-[var(--foreground)]">{pendingEvents}</span>
              </Link>
              <Link
                href="/financeiro"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] transition-colors hover:bg-[var(--surface-2)]/40"
              >
                <span className={`flex items-center gap-2 text-[var(--foreground)]`}>
                  <IconClock className={`h-3.5 w-3.5 ${finance && finance.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--muted)]"}`} />
                  Cobranças em atraso
                </span>
                <span className={`font-medium ${finance && finance.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
                  {finance ? brl(finance.overdue) : "—"}
                </span>
              </Link>
            </div>
          </section>
        </div>

        {/* Visão financeira (largura total) */}
        <section className="card mt-4 p-4">
          <header className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Visão financeira</h2>
            <Link href="/financeiro" className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
              Ir para Financeiro
            </Link>
          </header>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Recebido</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">
                {finance ? brl(finance.received) : "—"}
              </p>
              <p className="text-[11px] text-[var(--success)]">Mês atual</p>
            </div>
            <div className="border-l border-[var(--border)] pl-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">A receber</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--foreground)]">
                {finance ? brl(finance.pending) : "—"}
              </p>
              <p className="text-[11px] text-[var(--muted)]">Próximos vencimentos</p>
            </div>
            <div className="border-l border-[var(--border)] pl-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Em atraso</p>
              <p className={`mt-1 text-[20px] font-semibold tracking-tight ${finance && finance.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
                {finance ? brl(finance.overdue) : "—"}
              </p>
              <p className={`text-[11px] ${finance && finance.overdue > 0 ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                {finance && finance.overdue > 0 ? "Requer atenção" : "Sem pendências"}
              </p>
            </div>
          </div>
        </section>

        {/* Atalhos secundários */}
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Novo cliente", href: "/clientes?new=true", Icon: IconUsers },
            { label: "Registrar treino", href: "/treinos/registro", Icon: IconDog },
            { label: "Enviar cobrança", href: "/financeiro", Icon: IconDollar },
            { label: "Gerar relatório", href: "/relatorios", Icon: IconReport },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface-2)]/30"
            >
              <span className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--foreground)]">
                <item.Icon className="h-4 w-4 text-[var(--muted)]" />
                {item.label}
              </span>
              <IconChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
            </Link>
          ))}
        </section>
      </main>
    </AuthGuard>
  );
}
