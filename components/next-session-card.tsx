"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

import { IconArrowRight, IconClock, IconDog, IconPlus, IconWhatsApp } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { eventTimestamp, parsePlanTotal, relativeDayLabel } from "@/lib/home-agenda";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";

const DEFAULT_DOG_PHOTO = "/images/dog-default-bolt.svg";

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "Confirmado":
      return { label: "Confirmado", cls: "badge-success" };
    case "Recorrente":
      return { label: "Recorrente", cls: "badge-info" };
    case "Cancelado":
      return { label: "Cancelado", cls: "badge-danger" };
    default:
      return { label: "Aguardando", cls: "badge-warning" };
  }
}

export function NextSessionCard() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const trainerName = useAppStore((state) => state.trainerName);

  // A próxima sessão = evento futuro mais próximo. Incluímos sessões iniciadas há
  // até 90min para que a aula "em andamento" continue sendo o foco da tela.
  const next = useMemo(() => {
    const now = new Date().getTime();
    return (
      events
        .map((event) => ({ event, ts: eventTimestamp(event.day, event.time) }))
        .filter((item) => item.ts >= now - 90 * 60_000)
        .sort((a, b) => a.ts - b.ts)[0]?.event ?? null
    );
  }, [events]);

  if (!next) {
    return (
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[var(--border-strong)]" />
        <span className="text-eyebrow flex items-center gap-1.5 text-[var(--muted)]">
          <IconClock className="h-3.5 w-3.5" />
          Próxima sessão
        </span>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
            <IconDog className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--foreground)]">Nenhuma sessão agendada</p>
            <p className="text-[12.5px] text-[var(--muted)]">
              Quando você agendar uma aula, ela aparece aqui com as ações rápidas.
            </p>
          </div>
        </div>
        <Link href="/agenda?new=true" className="btn-primary mt-4 inline-flex w-fit text-[12.5px]">
          <IconPlus className="h-3.5 w-3.5" />
          Criar agendamento
        </Link>
      </section>
    );
  }

  const client = clients.find((c) => c.id === next.clientId || c.name === next.client);
  const dog = client?.dogs.find((d) => d.id === next.dogId || d.name === next.dog);
  const total = parsePlanTotal(next.plan);
  const sessionLabel = next.sessionNumber
    ? total
      ? `Sessão ${next.sessionNumber}/${total}`
      : `Sessão ${next.sessionNumber}`
    : null;
  const trainingType = dog?.trainingTypes?.[0] || next.plan || null;
  const badge = statusBadge(next.status);
  const dayLabel = relativeDayLabel(next.day);
  const waUrl = buildWaUrl(
    client?.phone,
    waTemplates.lembreteTreino({ cao: next.dog, hora: next.time, adestrador: trainerName || "Adestrador" }),
  );
  const registroHref = `/treinos/registro?clientId=${next.clientId ?? ""}&dogId=${next.dogId ?? ""}`;

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6" data-tour="next-session">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[var(--accent)]" />

      <div className="flex items-center justify-between">
        <span className="text-eyebrow flex items-center gap-1.5 text-[var(--accent-text)]">
          <IconClock className="h-3.5 w-3.5" />
          Próxima sessão
        </span>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="mt-4 flex items-start gap-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
          <Image
            src={dog?.photoUrl || DEFAULT_DOG_PHOTO}
            alt={`Foto de ${next.dog}`}
            fill
            sizes="64px"
            unoptimized
            onError={(event) => {
              event.currentTarget.src = DEFAULT_DOG_PHOTO;
            }}
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[26px] font-bold leading-none tracking-tight text-[var(--foreground)]">
              {next.time}
            </span>
            <span className="text-[13px] font-medium text-[var(--muted)]">{dayLabel}</span>
          </div>
          <p className="mt-1.5 truncate text-[16px] font-semibold text-[var(--foreground)]">
            {next.dog}
            {dog?.breed ? <span className="font-normal text-[var(--muted)]"> · {dog.breed}</span> : null}
            {dog?.age ? <span className="font-normal text-[var(--muted)]"> · {dog.age}</span> : null}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--muted)]">
            {next.client}
            {sessionLabel ? ` · ${sessionLabel}` : ""}
            {trainingType ? ` · ${trainingType}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={registroHref} className="btn-primary text-[12.5px]">
          <IconArrowRight className="h-3.5 w-3.5" />
          Registrar treino
        </Link>
        <Link href="/clientes" className="btn-secondary text-[12.5px]">
          Ver ficha
        </Link>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-[12.5px]">
          <IconWhatsApp className="h-3.5 w-3.5" />
          WhatsApp
        </a>
        <Link href="/agenda" className="btn-secondary text-[12.5px]">
          Remarcar
        </Link>
      </div>
    </section>
  );
}
