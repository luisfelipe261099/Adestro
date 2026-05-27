"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { AuthGuard } from "@/components/auth-guard";
import { DailyBriefCard } from "@/components/daily-brief-card";
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

type IconName =
  | "bell"
  | "chat"
  | "paw"
  | "user"
  | "train"
  | "money"
  | "portal"
  | "home"
  | "calendar"
  | "plus"
  | "users"
  | "more";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M15.5 17h-7a2 2 0 0 1-2-2v-2.2c0-.8.3-1.6.9-2.2l.3-.3V8a4.3 4.3 0 1 1 8.6 0v2.3l.3.3c.6.6.9 1.4.9 2.2V15a2 2 0 0 1-2 2Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="4" y="5" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="m9 17-3.2 2.6c-.4.3-.8-.1-.8-.5V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "paw") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="8" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 18.8c2.8 0 5-1.8 5-4.1 0-2-2.1-3.6-5-3.6s-5 1.6-5 3.6c0 2.3 2.2 4.1 5 4.1Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.5 18a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "train") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M6 14h12M8 17h8M9 6h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="5" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "portal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 5v10m0 0 3-3m-3 3-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="5" y="15" width="14" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="m4 11 8-6 8 6v8a1 1 0 0 1-1 1h-4.5v-5h-5V20H5a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 3.8v3.5M16 3.8v3.5M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4.5 18a4.5 4.5 0 0 1 9 0M13.5 18a3.5 3.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function statusBadge(status: string): string {
  if (status === "Confirmado") return "bg-sky-100 text-sky-800";
  if (status === "Cancelado") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-900";
}

function statusLabel(status: string): string {
  if (status === "Confirmado") return "Concluída";
  if (status === "Pendente" || status === "Aguardando") return "Agendada";
  if (status === "Recorrente") return "Recorrente";
  return "Cancelada";
}

export default function DashboardPage() {
  const clients = useAppStore((state) => state.clients);
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const trainerName = useAppStore((state) => state.trainerName);
  const upcomingEvents = events.slice(0, 3);

  const totalDogs = clients.reduce((total, client) => total + client.dogs.length, 0);
  const pendingEvents = events.filter((event) => event.status === "Pendente" || event.status === "Aguardando").length;
  const todayEvent = upcomingEvents[0];

  const heroClient = clients.find((client) => client.name === todayEvent?.client) ?? clients[0];
  const heroDog = heroClient?.dogs.find((dog) => dog.name === todayEvent?.dog) ?? heroClient?.dogs[0];

  const lastSessionForDog = (() => {
    if (!heroDog) return undefined;
    const matches = sessions.filter((session) => session.dogId === heroDog.id || session.dogName === heroDog.name);
    if (!matches.length) return undefined;
    return [...matches].sort((a, b) => b.number - a.number)[0];
  })();
  const lastSessionSummary = lastSessionForDog?.notes?.[0]?.comment ?? "";
  const dogProfileHref = heroClient && heroDog ? `/treinos?clientId=${heroClient.id}&dogId=${heroDog.id}` : "/clientes";
  const lastSessionHref = lastSessionForDog ? `/treinos?clientId=${heroClient?.id ?? ""}&dogId=${heroDog?.id ?? ""}` : dogProfileHref;

  const todaysLabel = todayEvent?.time ?? "10:00";
  const dogName = todayEvent?.dog ?? heroDog?.name ?? "Sem atendimento";
  const heroPlan = todayEvent?.plan || "Operação";

  const [checklist, setChecklist] = useState([
    { id: "c1", label: "Confirmar treinos de amanhã", done: false },
    { id: "c2", label: "Aprovar relatório mensal da Nina", done: true },
    { id: "c3", label: "Registrar aula de Thor das 15:30", done: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const nextAction = (() => {
    if (!clients.length) {
      return {
        label: "Cadastrar tutor e cão",
        detail: "Comece criando a ficha do tutor responsável e do cão atendido.",
        href: "/clientes",
        button: "Cadastrar agora",
      };
    }

    if (!events.length) {
      return {
        label: "Agendar primeira aula",
        detail: "Escolha dia e horário para transformar o cadastro em atendimento.",
        href: "/agenda",
        button: "Agendar aula",
      };
    }

    if (!sessions.length) {
      return {
        label: "Registrar aula realizada",
        detail: "Anote evolução, fotos e tarefas para manter o tutor atualizado.",
        href: "/treinos/registro",
        button: "Registrar aula",
      };
    }

    return {
      label: "Enviar portal ao tutor",
      detail: "Compartilhe tarefas, próximos encontros e evolução em um link simples.",
      href: "/portal",
      button: "Abrir portal",
    };
  })();

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-md px-3 pb-8 pt-3 sm:max-w-xl">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[#f7fbff]/95 p-4 shadow-[var(--shadow)]">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-200 text-lg font-semibold text-[#145a82]">
                {getFirstName(trainerName || "Adestrador").slice(0, 1)}
              </div>
              <div>
                <p className="text-[1.12rem] font-semibold text-[var(--foreground)]">{getGreeting()}, {getFirstName(trainerName || "adestrador")}!</p>
                <p className="text-xs text-[var(--muted)]">Veja sua próxima ação e os atendimentos do dia.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Link href="/agenda" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[#145a82]">
                <Icon name="bell" className="h-4.5 w-4.5" />
              </Link>
              <Link href="/portal" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[#145a82]">
                <Icon name="chat" className="h-4.5 w-4.5" />
              </Link>
            </div>
          </header>

          <section className="mt-4 rounded-2xl border border-[#cfe4f3] bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2d6f99]">Próxima ação</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold leading-tight text-[var(--foreground)]">{nextAction.label}</h1>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{nextAction.detail}</p>
              </div>
              <Link
                href={nextAction.href}
                className="flex-shrink-0 rounded-full bg-[#145a82] px-3 py-2 text-[11px] font-semibold text-white"
              >
                {nextAction.button}
              </Link>
            </div>
          </section>

          <article className="mt-4 overflow-hidden rounded-2xl bg-[linear-gradient(140deg,#0f3d5e_0%,#145a82_56%,#2c7eab_100%)] p-4 text-white">
            <p className="text-[11px] uppercase tracking-[0.15em] text-sky-100">Próximo atendimento</p>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold leading-none">{todaysLabel}</p>
                <p className="mt-2 text-lg font-semibold">{dogName}</p>
                <p className="text-xs text-sky-100">{heroPlan}</p>
              </div>
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white/20">
                <Image
                  src={heroDog?.photoUrl || "/images/dog-default-bolt.svg"}
                  alt={`Foto de ${heroDog?.name || "Pet"}`}
                  fill
                  sizes="96px"
                  priority
                  unoptimized
                  onError={(event) => {
                    event.currentTarget.src = "/images/dog-default-bolt.svg";
                  }}
                  className="object-cover"
                />
              </div>
            </div>
            <Link
              href="/agenda"
              className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Ver agenda completa
            </Link>
            {heroDog ? (
              <div className="mt-3 grid gap-2 rounded-xl bg-white/10 p-2.5 text-xs text-sky-50">
                <Link
                  href={dogProfileHref}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 font-semibold transition hover:bg-white/20"
                >
                  <span>Ficha do cão • {heroDog.name}</span>
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={lastSessionHref}
                  className="rounded-lg bg-white/10 px-2.5 py-1.5 transition hover:bg-white/20"
                >
                  <p className="font-semibold">
                    Última aula{lastSessionForDog ? ` • ${lastSessionForDog.date}` : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-sky-100">
                    {lastSessionSummary || "Sem resumo registrado ainda. Toque para abrir o histórico."}
                  </p>
                </Link>
              </div>
            ) : null}
          </article>

          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 📅 Card 1: Agenda do Dia (Azul) - Spans 2 cols */}
            <article className="rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-xs text-sky-900 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#1e5272]">📅 Agenda do Dia</span>
                <span className="rounded-full bg-sky-200/60 px-2 py-0.5 text-[10px] font-semibold">{upcomingEvents.length} aulas hoje</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-[#2b5d7d]">Sem atendimentos marcados para hoje.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between border-t border-sky-100/50 pt-2.5">
                      <div>
                        <span className="text-xs font-bold text-sky-950">{event.time} • {event.dog}</span>
                        <span className="ml-1 text-[10px] text-sky-800">({event.client})</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] ${statusBadge(event.status)}`}>
                        {statusLabel(event.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link href="/agenda" className="mt-3.5 inline-block text-xs font-semibold text-[#145a82] hover:underline">
                Ver agenda de hoje →
              </Link>
            </article>

            {/* 📅 Card 2: Agenda da Semana (Azul Claro) */}
            <Link href="/agenda" className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4 shadow-xs text-cyan-900 hover:bg-cyan-50 transition">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#1c647c]">📅 Agenda da Semana</span>
              <p className="mt-2 text-2xl font-bold text-cyan-950">{events.length}</p>
              <p className="text-[10px] text-cyan-800 mt-1">Aulas agendadas na semana</p>
            </Link>

            {/* 💰 Card 3: Financeiro (Verde) */}
            <Link href="/financeiro" className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-xs text-emerald-900 hover:bg-emerald-50/80 transition">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#175c40]">💰 Financeiro</span>
              <div className="mt-2 space-y-1 text-xs">
                <p className="flex justify-between font-semibold text-emerald-950">
                  <span>Recebido:</span> <span>R$ 1.280</span>
                </p>
                <p className="flex justify-between text-emerald-800 text-[10.5px]">
                  <span>A receber:</span> <span>R$ 640</span>
                </p>
                <p className="flex justify-between text-rose-600 font-semibold text-[10.5px]">
                  <span>Em atraso:</span> <span>R$ 120</span>
                </p>
              </div>
            </Link>

            {/* 🔔 Card 4: Pendências (Laranja) */}
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 shadow-xs text-orange-950">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6d3e15]">🔔 Pendências</span>
              <div className="mt-2 space-y-1.5 text-xs text-orange-900">
                <Link href="/portal" className="flex items-center gap-1.5 hover:underline">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>2 relatórios p/ aprovar</span>
                </Link>
                <Link href="/treinos" className="flex items-center gap-1.5 hover:underline">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>{pendingEvents} treinos sem registro</span>
                </Link>
              </div>
            </div>

            {/* ☀️ Card 5: Brief do dia (Roxo) - automação preparada pelo cron daily-brief */}
            <div className="sm:col-span-2">
              <DailyBriefCard />
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4d2d6c]">📋 Checklist do dia</p>
            <div className="mt-2.5 space-y-2">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#145a82] focus:ring-sky-400"
                  />
                  <span className={item.done ? "line-through text-slate-400" : "font-medium"}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-[#cfe4f3] bg-white p-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">Comece por aqui</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">Fluxo simples para colocar um caso novo no ar.</p>
            <ol className="mt-3 space-y-2">
              {[
                {
                  step: 1,
                  label: "Cadastre tutor e cão",
                  detail: "Crie a ficha do tutor com os dados do cão.",
                  href: "/clientes",
                  done: clients.length > 0,
                },
                {
                  step: 2,
                  label: "Agende a primeira sessão",
                  detail: "Defina dia e horário no calendário.",
                  href: "/agenda",
                  done: events.length > 0,
                },
                {
                  step: 3,
                  label: "Registre o treino realizado",
                  detail: "Anote evolução, notas e fotos.",
                  href: "/treinos",
                  done: sessions.length > 0,
                },
                {
                  step: 4,
                  label: "Compartilhe o portal com o tutor",
                  detail: "Envie um link seguro para acompanhamento em casa.",
                  href: "/portal",
                  done: false,
                },
              ].map((item) => (
                <li key={item.step}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[#f7fbff] px-3 py-2 transition hover:bg-white"
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        item.done
                          ? "bg-emerald-500 text-white"
                          : "bg-[#145a82] text-white"
                      }`}
                    >
                      {item.done ? "✓" : item.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--foreground)]">{item.label}</p>
                      <p className="text-[10px] text-[var(--muted)]">{item.detail}</p>
                    </div>
                    <span className="text-[#145a82]" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">Acesso rápido</p>
              <Link href="/portal" className="text-xs font-semibold text-[#145a82]">Portal</Link>
            </div>
            <div className="mt-3 grid gap-2">
              {[
                { label: "Novo tutor", href: "/clientes", icon: "user" as const, detail: "Cadastrar tutor e cão" },
                { label: "Registrar aula", href: "/treinos/registro", icon: "train" as const, detail: "Lançar treino de hoje" },
                { label: "Ver tutorial", href: "/tutorial", icon: "portal" as const, detail: "Passo a passo para equipe e tutor" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-[#145a82]">
                      <Icon name={item.icon} className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{item.label}</p>
                      <p className="text-[10px] text-[var(--muted)]">{item.detail}</p>
                    </div>
                  </div>
                  <span className="text-[#145a82]">
                    <Icon name="more" className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

        </section>

      </main>
    </AuthGuard>
  );
}