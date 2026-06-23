"use client";

// Quadro do Dia — kanban de status das aulas de hoje (Frente 5 da revisão).
// As colunas são DERIVADAS da realidade do dia (horário + se o treino do cão já
// foi registrado), então os cards fluem sozinhos "A fazer → Em andamento →
// Concluído" conforme o dia anda. Clicar num card abre a ação real (registrar /
// ver histórico), em vez de um arrastar que precisaria mutar dados.
import Link from "next/link";
import { useMemo } from "react";

import { useAppStore } from "@/lib/app-store";
import { eventTimestamp } from "@/lib/home-agenda";

type CardKind = "agendada" | "em-aula" | "registrar" | "registrado";

type BoardCard = {
  id: string;
  time: string;
  dog: string;
  client: string;
  href: string;
  ts: number;
  kind: CardKind;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WINDOW_MS = 90 * 60_000; // aula "em andamento" até 90min após o início

const KIND_LABEL: Record<CardKind, string> = {
  agendada: "Agendada",
  "em-aula": "Em aula",
  registrar: "Registrar",
  registrado: "✓ Registrado",
};

function registroHref(clientId?: string, dogId?: string): string {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (dogId) params.set("dogId", dogId);
  const qs = params.toString();
  return qs ? `/treinos/registro?${qs}` : "/treinos/registro";
}

export function DayBoard() {
  const events = useAppStore((s) => s.calendarEvents);
  const sessions = useAppStore((s) => s.trainingSessions);

  const { todo, doing, done, total } = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    const todayName = WEEKDAYS[today.getDay()] ?? "";
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);

    const todayEvents = events.filter((e) => {
      if (/cancel/i.test(e.status)) return false;
      const day = e.day.trim();
      return day === todayStr || day.toLowerCase().includes(todayName.toLowerCase());
    });

    const todo: BoardCard[] = [];
    const doing: BoardCard[] = [];
    const done: BoardCard[] = [];

    for (const e of todayEvents) {
      const ts = eventTimestamp(e.day, e.time);
      const registered = e.dogId ? sessionDogIds.has(e.dogId) : false;
      const base = {
        id: e.id,
        time: e.time,
        dog: e.dog || "Cão",
        client: e.client || "",
        ts,
      };

      if (registered) {
        done.push({ ...base, kind: "registrado", href: registroHref(e.clientId, e.dogId) });
      } else if (ts <= now && now <= ts + WINDOW_MS) {
        doing.push({ ...base, kind: "em-aula", href: registroHref(e.clientId, e.dogId) });
      } else if (now < ts) {
        todo.push({ ...base, kind: "agendada", href: registroHref(e.clientId, e.dogId) });
      } else {
        // já passou e não foi registrada → precisa registrar
        todo.push({ ...base, kind: "registrar", href: registroHref(e.clientId, e.dogId) });
      }
    }

    const byTime = (a: BoardCard, b: BoardCard) => a.ts - b.ts;
    todo.sort(byTime);
    doing.sort(byTime);
    done.sort(byTime);

    return { todo, doing, done, total: todayEvents.length };
  }, [events, sessions]);

  const columns: { key: string; title: string; accent: string; cards: BoardCard[] }[] = [
    { key: "todo", title: "A fazer", accent: "text-amber-700 bg-amber-50 border-amber-200", cards: todo },
    { key: "doing", title: "Em andamento", accent: "text-sky-700 bg-sky-50 border-sky-200", cards: doing },
    { key: "done", title: "Concluído", accent: "text-emerald-700 bg-emerald-50 border-emerald-200", cards: done },
  ];

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">🗂️ Quadro do dia</h2>
          <p className="text-[11px] text-[var(--muted)]">As aulas de hoje se movem sozinhas conforme você as registra.</p>
        </div>
        <span className="text-[11px] font-medium text-[var(--muted)]">{total} aula(s)</span>
      </header>

      {total === 0 ? (
        <p className="mt-4 rounded-md bg-[var(--surface-2)]/50 p-4 text-center text-xs text-[var(--muted)]">
          Nenhuma aula agendada para hoje. 🎉
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2">
              <div className={`mb-2 flex items-center justify-between rounded-md border px-2 py-1 text-[11px] font-semibold ${col.accent}`}>
                <span>{col.title}</span>
                <span>{col.cards.length}</span>
              </div>
              <div className="space-y-1.5">
                {col.cards.length === 0 ? (
                  <p className="px-1 py-2 text-center text-[10px] text-[var(--muted)]">—</p>
                ) : (
                  col.cards.map((c) => (
                    <Link
                      key={c.id}
                      href={c.href}
                      className="block rounded-md border border-[var(--border)] bg-white p-2 text-xs transition-colors hover:border-[var(--accent)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">{c.time}</span>
                        <span className="text-[9px] font-semibold text-[var(--muted)]">{KIND_LABEL[c.kind]}</span>
                      </div>
                      <p className="mt-0.5 font-semibold leading-snug text-[var(--foreground)]">🐕 {c.dog}</p>
                      {c.client ? <p className="text-[10px] text-[var(--muted)]">{c.client}</p> : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
