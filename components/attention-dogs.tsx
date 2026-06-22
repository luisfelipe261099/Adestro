"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

import { IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import type { CalendarEvent } from "@/lib/app-store";
import { eventTimestamp } from "@/lib/home-agenda";

const DEFAULT_DOG_PHOTO = "/images/dog-default-bolt.svg";

type Level = "red" | "amber" | "green";

type AttentionItem = {
  key: string;
  dogName: string;
  breed: string;
  clientName: string;
  photoUrl?: string;
  level: Level;
  label: string;
  href: string;
};

const LEVEL_ORDER: Record<Level, number> = { red: 0, amber: 1, green: 2 };
const DOT: Record<Level, string> = {
  red: "bg-[var(--danger)]",
  amber: "bg-[var(--warning)]",
  green: "bg-[var(--success)]",
};

export function AttentionDogs() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);

  const items = useMemo<AttentionItem[]>(() => {
    const now = new Date().getTime();
    const recorded = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);
    const list: AttentionItem[] = [];

    for (const client of clients) {
      for (const dog of client.dogs) {
        const matches = (ev: CalendarEvent) => ev.dogId === dog.id || ev.dog === dog.name;
        const hasFuture = events.some(
          (ev) => matches(ev) && ev.status !== "Cancelado" && eventTimestamp(ev.day, ev.time) >= now,
        );
        const unregistered = events.some(
          (ev) => ev.dogId === dog.id && ev.status === "Confirmado" && !recorded.has(dog.id),
        );

        let level: Level;
        let label: string;
        let href: string;
        if (unregistered) {
          level = "red";
          label = "Treino sem registro";
          href = `/treinos/registro?clientId=${client.id}&dogId=${dog.id}`;
        } else if (!hasFuture) {
          level = "amber";
          label = "Sem próxima aula";
          href = "/agenda?new=true";
        } else {
          level = "green";
          label = "Em dia";
          href = "/clientes";
        }

        list.push({
          key: `${client.id}-${dog.id}`,
          dogName: dog.name,
          breed: dog.breed,
          clientName: client.name,
          photoUrl: dog.photoUrl,
          level,
          label,
          href,
        });
      }
    }

    return list.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  }, [events, clients, sessions]);

  const needAttention = items.filter((item) => item.level !== "green");
  const shown = needAttention.slice(0, 5);

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Cães em atenção</h2>
        {needAttention.length > 0 ? (
          <span className="text-[11px] font-medium text-[var(--muted)]">
            {needAttention.length} {needAttention.length === 1 ? "precisa de ação" : "precisam de ação"}
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
          Todos os cães estão em dia. 🎉
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {shown.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
                  <Image
                    src={item.photoUrl || DEFAULT_DOG_PHOTO}
                    alt={`Foto de ${item.dogName}`}
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
                  <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{item.dogName}</p>
                  <p className="truncate text-[11.5px] text-[var(--muted)]">
                    {item.clientName}
                    {item.breed ? ` · ${item.breed}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--muted-strong)]">
                  <span className={`h-2 w-2 rounded-full ${DOT[item.level]}`} />
                  {item.label}
                </span>
                <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
