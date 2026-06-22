"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useAppStore } from "@/lib/app-store";
import { relativeDayLabel } from "@/lib/home-agenda";

type Period = "manha" | "tarde" | "noite";

const PERIOD_LABEL: Record<Period, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const PERIOD_ORDER: Period[] = ["manha", "tarde", "noite"];

function statusColor(status: string): string {
  if (status === "Confirmado") return "bg-[var(--success)]";
  if (status === "Recorrente") return "bg-[var(--info)]";
  if (status === "Cancelado") return "bg-[var(--danger)]";
  return "bg-[var(--warning)]";
}

function periodOf(time: string): Period {
  const match = time.trim().match(/^(\d{1,2}):/);
  const hour = match ? Number(match[1]) : 0;
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

export function TodayTimeline() {
  const events = useAppStore((state) => state.calendarEvents);

  const groups = useMemo(() => {
    const today = events
      .filter((event) => relativeDayLabel(event.day) === "Hoje")
      .sort((a, b) => a.time.localeCompare(b.time));
    const by: Record<Period, typeof today> = { manha: [], tarde: [], noite: [] };
    for (const event of today) by[periodOf(event.time)].push(event);
    return by;
  }, [events]);

  const total = groups.manha.length + groups.tarde.length + groups.noite.length;

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Agenda de hoje</h2>
        <Link href="/agenda" className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
          Ver agenda
        </Link>
      </header>

      {total === 0 ? (
        <p className="mt-3 text-[12.5px] text-[var(--muted)]">
          Nenhuma sessão hoje. Bom momento para registrar treinos pendentes.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {PERIOD_ORDER.map((period) =>
            groups[period].length ? (
              <div key={period}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {PERIOD_LABEL[period]}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {groups[period].map((event) => (
                    <li key={event.id}>
                      <Link
                        href="/agenda"
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${statusColor(event.status)}`} />
                        <span className="w-12 flex-shrink-0 text-[12.5px] font-semibold text-[var(--foreground)]">
                          {event.time}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--foreground)]">{event.dog}</span>
                        <span className="hidden max-w-[40%] truncate text-[11.5px] text-[var(--muted)] sm:block">
                          {event.client}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}
