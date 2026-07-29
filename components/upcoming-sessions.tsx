"use client";

// Próximas aulas — a lista que responde "o que vem pela frente?".
// Todos os agendamentos ativos dos próximos 7 dias, em ordem crescente de data
// e horário, agrupados por dia. Complementa o Quadro do dia (que é só hoje) e o
// card Próxima sessão (que é só a primeira).
import Link from "next/link";
import { useMemo } from "react";

import { IconCalendar, IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { absoluteDayLabel, listUpcomingSessions, relativeDayLabel } from "@/lib/home-agenda";
import { plural } from "@/lib/labels";
import { useNow } from "@/lib/use-now";

const MAX_ITEMS = 12;

function statusTone(status: string): string {
  if (status === "Confirmado") return "badge badge-success";
  if (status === "Recorrente") return "badge badge-info";
  return "badge badge-warning";
}

export function UpcomingSessions() {
  const events = useAppStore((state) => state.calendarEvents);
  const now = useNow();

  const groups = useMemo(() => {
    const upcoming = listUpcomingSessions(events, now, { withinDays: 7, limit: MAX_ITEMS });

    const byDay = new Map<string, typeof upcoming>();
    for (const item of upcoming) {
      const key = relativeDayLabel(item.event.day);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(item);
      else byDay.set(key, [item]);
    }
    return Array.from(byDay.entries()).map(([label, items]) => ({
      label,
      date: absoluteDayLabel(items[0].event.day),
      items,
    }));
  }, [events, now]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Próximas aulas</h2>
          <p className="text-[12.5px] text-[var(--muted)]">
            Tudo que está marcado para os próximos 7 dias, do mais cedo ao mais tarde.
          </p>
        </div>
        <Link
          href="/agenda?view=semana"
          className="flex flex-shrink-0 items-center gap-1 text-[12.5px] font-medium text-[var(--accent-text)] hover:underline"
        >
          Ver agenda
          <IconChevronRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {total === 0 ? (
        <div className="mt-4 rounded-md bg-[var(--surface-2)]/50 p-5 text-center">
          <p className="text-[13px] font-medium text-[var(--foreground)]">Nenhuma aula marcada</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
            Não há agendamentos para os próximos 7 dias.
          </p>
          <Link href="/agenda?new=true" className="btn-primary mt-3 inline-flex">
            <IconCalendar className="h-3.5 w-3.5" />
            Agendar aula
          </Link>
        </div>
      ) : (
        // No celular, uma lista por dia empilhada. A partir de md cada dia vira
        // uma coluna — no desktop a lista de coluna única deixava ~800px de
        // espaço morto à direita de cada linha.
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.label} className="min-w-0">
              <div className="flex items-baseline gap-2 border-b border-[var(--border)] pb-1">
                <span className="text-[12.5px] font-semibold text-[var(--foreground)]">{group.label}</span>
                {group.date ? (
                  <span className="text-[12px] text-[var(--muted)]">{group.date}</span>
                ) : null}
                <span className="ml-auto text-[12px] text-[var(--muted)]">
                  {plural(group.items.length, "aula", "aulas")}
                </span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {group.items.map(({ event }) => (
                  <li key={event.id}>
                    <Link
                      href={event.dogId ? `/caes/${event.dogId}` : "/agenda?view=semana"}
                      className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <span className="w-11 flex-shrink-0 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
                        {event.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-[var(--foreground)]">
                          {event.dog}
                        </p>
                        <p className="truncate text-[12.5px] text-[var(--muted)]">{event.client}</p>
                      </div>
                      <span className={`${statusTone(event.status)} flex-shrink-0`}>{event.status}</span>
                      <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
