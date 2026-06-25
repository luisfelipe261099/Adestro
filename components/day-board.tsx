"use client";

// Quadro do Dia — kanban de status do dia (Frente 5 da revisão).
// Colunas A fazer / Em andamento / Concluído. As AULAS são derivadas da realidade
// do dia (horário + se o treino do cão já foi registrado), então fluem sozinhas
// conforme o dia anda. Somam-se a elas as pendências do dia: cobranças a enviar
// (do store) e relatórios a aprovar/enviar (status != "Enviado"). Clicar abre a
// ação real — nada de arrastar que precisaria mutar dados.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppStore } from "@/lib/app-store";
import { eventTimestamp } from "@/lib/home-agenda";

type BoardCard = {
  id: string;
  lead: string; // chip à esquerda: horário "09:00" ou emoji
  label: string; // linha principal
  sub?: string; // linha secundária
  tag: string; // etiqueta à direita
  href: string;
  sortKey: number; // ordenação dentro da coluna
};

type ReportRow = { id: string; month?: string; status?: string };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WINDOW_MS = 90 * 60_000; // aula "em andamento" até 90min após o início

function registroHref(clientId?: string, dogId?: string): string {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (dogId) params.set("dogId", dogId);
  const qs = params.toString();
  return qs ? `/treinos/registro?${qs}` : "/treinos/registro";
}

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export function DayBoard() {
  const events = useAppStore((s) => s.calendarEvents);
  const sessions = useAppStore((s) => s.trainingSessions);
  const payments = useAppStore((s) => s.payments);

  // Relatórios não ficam no store — busca leve só para o quadro.
  const [reports, setReports] = useState<ReportRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/relatorios", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setReports(data as ReportRow[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const { todo, doing, done } = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    const todayName = WEEKDAYS[today.getDay()] ?? "";
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);

    const todo: BoardCard[] = [];
    const doing: BoardCard[] = [];
    const done: BoardCard[] = [];

    // 1) Aulas de hoje
    const todayEvents = events.filter((e) => {
      if (/cancel/i.test(e.status)) return false;
      const day = e.day.trim();
      return day === todayStr || day.toLowerCase().includes(todayName.toLowerCase());
    });

    for (const e of todayEvents) {
      const ts = eventTimestamp(e.day, e.time);
      const registered = e.dogId ? sessionDogIds.has(e.dogId) : false;
      const card: BoardCard = {
        id: `aula-${e.id}`,
        lead: e.time || "—",
        label: `${e.dog || "Cão"}`,
        sub: e.client || undefined,
        tag: "",
        href: registroHref(e.clientId, e.dogId),
        sortKey: ts,
      };

      if (registered) {
        done.push({ ...card, tag: "✓ Registrado" });
      } else if (ts <= now && now <= ts + WINDOW_MS) {
        doing.push({ ...card, tag: "Em aula" });
      } else if (now < ts) {
        todo.push({ ...card, tag: "Agendada" });
      } else {
        todo.push({ ...card, tag: "Registrar" });
      }
    }

    // 2) Cobranças a enviar (pendentes) → A fazer
    for (const p of payments) {
      if (p.status === "Pago") continue;
      todo.push({
        id: `cobranca-${p.id}`,
        lead: "R$",
        label: p.description || "Cobrança",
        sub: brl(p.amount),
        tag: "Cobrar",
        href: "/financeiro",
        sortKey: 10 ** 13, // depois das aulas
      });
    }

    // 3) Relatórios a aprovar/enviar (status != "Enviado") → A fazer
    for (const r of reports) {
      if ((r.status ?? "") === "Enviado") continue;
      todo.push({
        id: `relatorio-${r.id}`,
        lead: "Rel",
        label: "Relatório mensal",
        sub: r.month ? `${r.month} · ${r.status ?? "Rascunho"}` : r.status,
        tag: "Aprovar",
        href: "/relatorios",
        sortKey: 10 ** 13 + 1,
      });
    }

    const byKey = (a: BoardCard, b: BoardCard) => a.sortKey - b.sortKey;
    todo.sort(byKey);
    doing.sort(byKey);
    done.sort(byKey);

    return { todo, doing, done };
  }, [events, sessions, payments, reports]);

  const columns = [
    { key: "todo", title: "A fazer", accent: "text-amber-700 bg-amber-50 border-amber-200", cards: todo },
    { key: "doing", title: "Em andamento", accent: "text-sky-700 bg-sky-50 border-sky-200", cards: doing },
    { key: "done", title: "Concluído", accent: "text-emerald-700 bg-emerald-50 border-emerald-200", cards: done },
  ];

  const totalCards = todo.length + doing.length + done.length;

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Quadro do dia</h2>
          <p className="text-[11px] text-[var(--muted)]">
            Aulas, cobranças e relatórios do dia — os cards se movem conforme você resolve cada um.
          </p>
        </div>
        <span className="text-[11px] font-medium text-[var(--muted)]">{totalCards} item(ns)</span>
      </header>

      {totalCards === 0 ? (
        <p className="mt-4 rounded-md bg-[var(--surface-2)]/50 p-4 text-center text-xs text-[var(--muted)]">
          Nada pendente para hoje.
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
                        <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">{c.lead}</span>
                        <span className="text-[9px] font-semibold text-[var(--muted)]">{c.tag}</span>
                      </div>
                      <p className="mt-0.5 font-semibold leading-snug text-[var(--foreground)]">{c.label}</p>
                      {c.sub ? <p className="text-[10px] text-[var(--muted)]">{c.sub}</p> : null}
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
