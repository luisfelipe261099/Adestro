"use client";

// Quadro do Dia — o checklist operacional de hoje, em formato kanban.
// Colunas A fazer / Em andamento / Concluído. As AULAS são derivadas da
// realidade do dia (horário + se o treino do cão já foi registrado), então
// fluem sozinhas conforme o dia anda. Somam-se a elas as pendências do dia:
// cobranças a receber (faturas dos clientes) e relatórios a aprovar/enviar.
// Clicar abre a ação real — nada de arrastar que precisaria mutar dados.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { IN_PROGRESS_WINDOW_MS, eventsOnDay, eventTimestamp, resolveEventDate, ymd } from "@/lib/home-agenda";
import { plural } from "@/lib/labels";
import { useNow } from "@/lib/use-now";

type BoardCard = {
  id: string;
  lead: string; // chip à esquerda: horário "09:00" ou etiqueta curta
  label: string; // linha principal
  sub?: string; // linha secundária
  tag: string; // etiqueta à direita
  href: string;
  sortKey: number; // ordenação dentro da coluna
};

type ReportRow = { id: string; month?: string; status?: string };

/** Fatura do cliente (ClientInvoice) — a cobrança que o adestrador emite. */
type InvoiceRow = {
  id: string;
  clientName?: string;
  dogName?: string;
  amount: number;
  dueDate?: string;
  status?: string;
};

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
  const now = useNow();

  // Relatórios e faturas não ficam no store — busca leve só para o quadro.
  // O fetch roda a cada montagem do componente, então voltar do Financeiro
  // para a home já traz a cobrança recém-criada.
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/relatorios", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setReports(data as ReportRow[]);
      })
      .catch(() => undefined);

    fetch("/api/finance/invoices", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setInvoices(data as InvoiceRow[]);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const { todo, doing, done } = useMemo(() => {
    const today = new Date(now);
    const todayStr = ymd(today);

    const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);

    const todo: BoardCard[] = [];
    const doing: BoardCard[] = [];
    const done: BoardCard[] = [];

    // 1) Aulas de hoje — mesmo seletor do card "Agenda do dia", para que o
    // número do card e o conteúdo do quadro nunca discordem.
    for (const e of eventsOnDay(events, today)) {
      const ts = eventTimestamp(e.day, e.time) ?? 0;
      const registered = e.dogId ? sessionDogIds.has(e.dogId) : false;
      const card: BoardCard = {
        id: `aula-${e.id}`,
        lead: e.time || "—",
        label: e.dog || "Cão",
        sub: e.client || undefined,
        tag: "",
        href: registroHref(e.clientId, e.dogId),
        sortKey: ts,
      };

      if (registered) {
        done.push({ ...card, tag: "✓ Registrado" });
      } else if (ts <= now && now <= ts + IN_PROGRESS_WINDOW_MS) {
        doing.push({ ...card, tag: "Em aula" });
      } else if (now < ts) {
        todo.push({ ...card, tag: "Agendada" });
      } else {
        todo.push({ ...card, tag: "Registrar" });
      }
    }

    // 2) Cobranças dos clientes que vencem hoje ou já venceram → A fazer.
    // "Atrasado" é derivado do vencimento, não do campo `status`: nenhuma rotina
    // grava esse status no banco, então confiar nele esconderia toda cobrança
    // vencida.
    for (const inv of invoices) {
      if ((inv.status ?? "") === "Pago") continue;
      const due = inv.dueDate ? resolveEventDate(inv.dueDate) : null;
      if (!due || due > todayStr) continue;

      const overdue = due < todayStr;
      todo.push({
        id: `cobranca-${inv.id}`,
        lead: "R$",
        label: `${inv.clientName ?? "Cliente"}${inv.dogName ? ` · ${inv.dogName}` : ""}`,
        sub: `${brl(inv.amount)} · ${overdue ? `vencida em ${inv.dueDate}` : "vence hoje"}`,
        tag: overdue ? "Em atraso" : "Cobrar",
        href: "/financeiro",
        sortKey: overdue ? 10 ** 13 : 10 ** 13 + 1,
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
        sortKey: 10 ** 13 + 2,
      });
    }

    const byKey = (a: BoardCard, b: BoardCard) => a.sortKey - b.sortKey;
    todo.sort(byKey);
    doing.sort(byKey);
    done.sort(byKey);

    return { todo, doing, done };
  }, [events, sessions, invoices, reports, now]);

  const columns = [
    { key: "todo", title: "A fazer", accent: "text-amber-700 bg-amber-50 border-amber-200", cards: todo },
    { key: "doing", title: "Em andamento", accent: "text-sky-700 bg-sky-50 border-sky-200", cards: doing },
    { key: "done", title: "Concluído", accent: "text-emerald-700 bg-emerald-50 border-emerald-200", cards: done },
  ];

  const totalCards = todo.length + doing.length + done.length;

  return (
    <section className="card card-accent card-accent-blue p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
            Quadro do dia <span className="font-normal text-[var(--muted)]">— seu checklist de hoje</span>
          </h2>
          <p className="text-[12.5px] leading-snug text-[var(--muted)]">
            Reúne as aulas de hoje, as cobranças vencidas ou que vencem hoje e os relatórios a aprovar.
            Cada card anda sozinho de coluna conforme você resolve.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="text-[12.5px] font-medium text-[var(--muted)]">{plural(totalCards, "item", "itens")}</span>
          <Link
            href="/agenda?view=dia"
            className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent-text)] hover:underline"
          >
            Abrir agenda do dia
            <IconChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {totalCards === 0 ? (
        <p className="mt-4 rounded-md bg-[var(--surface-2)]/50 p-4 text-center text-[13px] text-[var(--muted)]">
          Nada pendente para hoje.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-2">
              <div className={`mb-2 flex items-center justify-between rounded-md border px-2 py-1 text-[12.5px] font-semibold ${col.accent}`}>
                <span>{col.title}</span>
                <span>{col.cards.length}</span>
              </div>
              <div className="space-y-1.5">
                {col.cards.length === 0 ? (
                  <p className="px-1 py-2 text-center text-[12.5px] text-[var(--muted)]">—</p>
                ) : (
                  col.cards.map((c) => (
                    <Link
                      key={c.id}
                      href={c.href}
                      className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 transition-colors hover:border-[var(--accent)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12.5px] font-semibold text-[var(--foreground)]">{c.lead}</span>
                        <span className="text-[12.5px] font-semibold text-[var(--muted-strong)]">{c.tag}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-[var(--foreground)]">{c.label}</p>
                      {c.sub ? <p className="text-[12.5px] text-[var(--muted)]">{c.sub}</p> : null}
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
