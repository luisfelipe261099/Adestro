"use client";

// Foco nos cães — o radar de quem precisa de ação nos próximos/últimos 7 dias.
// Não é um histórico de evolução: é uma fila de trabalho. A regra vive em
// computeDogAttention (lib/home-agenda.ts) e é a mesma usada pelo card
// "Pendências" e pelo kanban de clientes.
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

import { IconChevronRight } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { computeDogAttention, type AttentionLevel, type DogAttention } from "@/lib/home-agenda";
import { isOverPackage, packageProgressLabel, plural } from "@/lib/labels";
import { useNow } from "@/lib/use-now";

const DEFAULT_DOG_PHOTO = "/images/dog-default-bolt.svg";

const DOT: Record<AttentionLevel, string> = {
  red: "bg-[var(--danger)]",
  amber: "bg-[var(--warning)]",
  green: "bg-[var(--success)]",
};

/** A ação que resolve cada nível — leva direto ao lugar certo. */
function primaryAction(item: DogAttention): { label: string; href: string } {
  if (item.level === "red") {
    return {
      label: "Registrar treino",
      href: `/treinos/registro?clientId=${item.clientId}&dogId=${item.dog.id}`,
    };
  }
  return {
    label: "Agendar aula",
    href: `/agenda?new=true&clientId=${item.clientId}&dogId=${item.dog.id}`,
  };
}

export function AttentionDogs() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);
  const now = useNow();

  const items = useMemo(
    () => computeDogAttention(clients, events, sessions, now, { includeInactive: false }),
    [events, clients, sessions, now],
  );

  const needAttention = items.filter((item) => item.level !== "green");
  const shown = needAttention.slice(0, 4);
  const remaining = needAttention.length - shown.length;

  return (
    <section className="card p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Foco nos cães</h2>
          <p className="text-[12.5px] leading-snug text-[var(--muted)]">
            Cães que precisam de ação: teve aula nos últimos 7 dias sem treino registrado, ou está
            sem nenhuma aula marcada para os próximos 7 dias.
          </p>
        </div>
        {needAttention.length > 0 ? (
          <span className="flex-shrink-0 text-[12px] font-medium text-[var(--muted)]">
            {needAttention.length} {needAttention.length === 1 ? "cão" : "cães"}
          </span>
        ) : (
          <span className="flex-shrink-0 text-[12px] font-medium text-[var(--success)]">Tudo em dia</span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          Cadastre clientes e cães para acompanhar a evolução aqui.
        </p>
      ) : needAttention.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Todos os {items.length} cães têm aula marcada e treinos em dia.
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {shown.map((item) => {
              const action = primaryAction(item);
              return (
                <li key={`${item.clientId}-${item.dog.id}`} className="py-2">
                  <div className="flex items-center gap-3">
                    {/* O card inteiro leva ao perfil do cão: histórico, ficha e ações. */}
                    <Link
                      href={item.href}
                      className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
                        <Image
                          src={item.dog.photoUrl || DEFAULT_DOG_PHOTO}
                          alt={`Foto de ${item.dog.name}`}
                          fill
                          sizes="40px"
                          unoptimized
                          onError={(event) => {
                            event.currentTarget.src = DEFAULT_DOG_PHOTO;
                          }}
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-[var(--foreground)]">
                          {item.dog.name}
                        </p>
                        <p className="truncate text-[12.5px] text-[var(--muted)]">
                          {item.clientName}
                          {item.dog.breed ? ` · ${item.dog.breed}` : ""}
                        </p>
                        {/* Mesmo formato do quadro kanban: "4/8 aulas" e o aviso
                            de excedente. O rótulo de fase ("Formado") saiu — o
                            cliente pediu, e ele repetia o que a barra já diz. */}
                        <p className="truncate text-[12px] text-[var(--muted)]">
                          {item.sessionsTotal > 0 ? (
                            <>
                              <span className="font-medium text-[var(--foreground)]">
                                {packageProgressLabel(item.sessionCount, item.sessionsTotal)}
                              </span>
                              {isOverPackage(item.sessionCount, item.sessionsTotal) ? (
                                <span className="ml-1.5 rounded bg-[var(--warning-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--warning)]">
                                  passou do pacote
                                </span>
                              ) : null}
                            </>
                          ) : (
                            plural(item.sessionCount, "treino registrado", "treinos registrados")
                          )}
                        </p>
                        {item.sessionsTotal > 0 && (
                          <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${item.progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[var(--muted-strong)]">
                        <span className={`h-2 w-2 rounded-full ${DOT[item.level]}`} />
                        {item.label}
                      </span>
                      <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 pl-[52px]">
                    <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--muted)]">{item.reason}</p>
                    <Link
                      href={action.href}
                      className="flex-shrink-0 text-[12.5px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      {action.label}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          {remaining > 0 && (
            <Link
              href="/clientes"
              className="mt-1 flex items-center justify-center gap-1 rounded-md py-2 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--surface-2)]"
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
