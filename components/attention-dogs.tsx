"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

import { IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { computeDogAttention, type AttentionLevel } from "@/lib/home-agenda";

const DEFAULT_DOG_PHOTO = "/images/dog-default-bolt.svg";

const DOT: Record<AttentionLevel, string> = {
  red: "bg-[var(--danger)]",
  amber: "bg-[var(--warning)]",
  green: "bg-[var(--success)]",
};

export function AttentionDogs() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);

  const items = useMemo(
    () => computeDogAttention(clients, events, sessions, new Date().getTime()),
    [events, clients, sessions],
  );

  const needAttention = items.filter((item) => item.level !== "green");
  const shown = needAttention.slice(0, 4);
  const remaining = needAttention.length - shown.length;

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Evolução dos cães</h2>
          <p className="text-[11.5px] text-[var(--muted)]">Quem precisa da sua atenção agora</p>
        </div>
        {needAttention.length > 0 ? (
          <span className="text-[11px] font-medium text-[var(--muted)]">
            {needAttention.length} {needAttention.length === 1 ? "cão" : "cães"}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[var(--success)]">Tudo em dia</span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[var(--muted)]">
          Cadastre clientes e cães para acompanhar a evolução aqui.
        </p>
      ) : needAttention.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Todos os cães estão em dia.
        </div>
      ) : (
        <>
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {shown.map((item) => (
            <li key={`${item.clientId}-${item.dog.id}`}>
              <Link
                href={item.href}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
                  <Image
                    src={item.dog.photoUrl || DEFAULT_DOG_PHOTO}
                    alt={`Foto de ${item.dog.name}`}
                    fill
                    sizes="36px"
                    unoptimized
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_DOG_PHOTO;
                    }}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{item.dog.name}</p>
                  <p className="truncate text-[11.5px] text-[var(--muted)]">
                    {item.clientName}
                    {item.dog.breed ? ` · ${item.dog.breed}` : ""}
                  </p>
                  <p className="truncate text-[11px] text-[var(--muted)]">
                    {item.sessionsTotal > 0
                      ? `Sessão ${item.sessionCount}/${item.sessionsTotal} · ${item.phaseLabel}`
                      : `${item.sessionCount} ${item.sessionCount === 1 ? "treino registrado" : "treinos registrados"}`}
                  </p>
                  {item.sessionsTotal > 0 && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--muted-strong)]">
                  <span className={`h-2 w-2 rounded-full ${DOT[item.level]}`} />
                  {item.label}
                </span>
                <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
              </Link>
            </li>
          ))}
        </ul>
        {remaining > 0 && (
          <Link
            href="/evolucao"
            className="mt-1 flex items-center justify-center gap-1 rounded-md py-2 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Ver todos os {needAttention.length} cães
            <IconChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
        </>
      )}
    </section>
  );
}
