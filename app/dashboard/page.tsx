"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const clients = useAppStore((state) => state.clients);
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
  const totalDogs = clients.reduce((total, client) => total + client.dogs.length, 0);
  const pendingEvents = events.filter((e) => e.status === "Pendente" || e.status === "Aguardando").length;
  const confirmedToday = events.filter((e) => e.status === "Confirmado").length;
  const sessionsThisMonth = sessions.length;

  const metrics = useMemo(
    () => [
      {
        label: "Clientes ativos",
        value: clients.length,
        sub: `${totalDogs} ${totalDogs === 1 ? "cão" : "cães"}`,
        href: "/clientes",
        Icon: IconUsers,
      },
      {
        label: "Agendamentos",
        value: events.length,
        sub: `${pendingEvents} aguardando`,
        href: "/agenda",
        Icon: IconCalendar,
      },
      {
        label: "Treinos no mês",
        value: sessionsThisMonth,
        sub: `${confirmedToday} concluídos`,
        href: "/treinos",
        Icon: IconDog,
      },
      {
        label: "Receita do mês",
        value: finance ? brl(finance.received) : "—",
        sub: finance ? `${brl(finance.pending)} a receber` : "Carregando…",
        href: "/financeiro",
        Icon: IconDollar,
        accent: true,
      },
    ],
    [clients.length, totalDogs, events.length, pendingEvents, sessionsThisMonth, confirmedToday],
  );

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        {/* Header — saudação + ações */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[26px]">
              {getGreeting()}, {getFirstName(trainerName || "adestrador")}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-[var(--muted)]">
              Aqui está o resumo da sua operação hoje.
            </p>
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

        {/* Métricas */}
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="card group p-4 transition-colors hover:bg-[var(--surface-2)]/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  {metric.label}
                </span>
                <metric.Icon className="h-4 w-4 text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]" />
              </div>
              <p className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--foreground)]">
                {metric.value}
              </p>
              <p className="text-[11.5px] text-[var(--muted)]">{metric.sub}</p>
            </Link>
          ))}
        </section>

        {/* Layout principal */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Coluna 1 e 2 — agenda do dia */}
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

          {/* Coluna 3 — Brief do dia */}
          <div data-tour="brief">
            <DailyBriefCard />
          </div>
        </div>

        {/* Linha 2: financeiro + pendências */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="card lg:col-span-2 p-4">
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

        {/* Linha 3: atalhos secundários */}
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
