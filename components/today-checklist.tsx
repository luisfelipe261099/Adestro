"use client";

import { useMemo } from "react";
import Link from "next/link";

import { IconCheckSquare, IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { relativeDayLabel } from "@/lib/home-agenda";

type ChecklistItem = { key: string; label: string; href: string };

export function TodayChecklist({ overdue }: { overdue?: number }) {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);

  const items = useMemo<ChecklistItem[]>(() => {
    const list: ChecklistItem[] = [];
    const recorded = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);

    // Confirmar sessões de hoje ainda pendentes.
    for (const event of events) {
      if (relativeDayLabel(event.day) !== "Hoje") continue;
      if (event.status === "Pendente" || event.status === "Aguardando") {
        list.push({ key: `confirm-${event.id}`, label: `Confirmar sessão com ${event.client}`, href: "/agenda" });
      }
    }

    // Registrar evolução de aulas confirmadas sem treino registrado.
    for (const event of events) {
      if (event.status === "Confirmado" && event.dogId && !recorded.has(event.dogId)) {
        list.push({
          key: `reg-${event.id}`,
          label: `Registrar evolução de ${event.dog}`,
          href: `/treinos/registro?clientId=${event.clientId ?? ""}&dogId=${event.dogId ?? ""}`,
        });
      }
    }

    // Cobranças em atraso (agregado do financeiro).
    if (overdue && overdue > 0) {
      list.push({ key: "overdue", label: "Conferir pagamentos em atraso", href: "/financeiro" });
    }

    return list.slice(0, 6);
  }, [events, sessions, overdue]);

  return (
    <section className="card p-4">
      <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Checklist de hoje</h2>
      {items.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <IconCheckSquare className="h-4 w-4 text-[var(--success)]" />
          Tudo certo por hoje. 🎉
        </div>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-[var(--border-strong)]" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
