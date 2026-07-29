"use client";

// Prioridades — o que exige uma ação sua agora, não uma leitura.
// Duas fontes: lembretes de WhatsApp das aulas das próximas 48h (hoje que ainda
// não aconteceram + amanhã) e treinos já dados que faltam registrar.
//
// O nome antigo era "Prioridades de hoje", mas a janela era só AMANHÃ — quem
// agendava uma aula para outro dia não via nada e achava que tinha sumido.
// A lista de tudo que está marcado vive no quadro "Próximas aulas".
import { useMemo } from "react";
import Link from "next/link";

import { IconChevronRight, IconWhatsApp } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import {
  computeDogAttention,
  listUpcomingSessions,
  relativeDayLabel,
} from "@/lib/home-agenda";
import { useNow } from "@/lib/use-now";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";

type BriefItem =
  | { kind: "reminder"; key: string; label: string; sublabel: string; waUrl: string }
  | { kind: "approval"; key: string; label: string; sublabel: string; href: string };

/** Horizonte dos lembretes, em dias. 2 = restante de hoje + amanhã. */
const REMINDER_WINDOW_DAYS = 2;

export function DailyBriefCard() {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const clients = useAppStore((state) => state.clients);
  const trainerName = useAppStore((state) => state.trainerName);
  const now = useNow();

  const items: BriefItem[] = useMemo(() => {
    const list: BriefItem[] = [];

    // 1) Lembretes das próximas 48h — já sem canceladas, já em ordem de horário.
    const upcoming = listUpcomingSessions(events, now, {
      withinDays: REMINDER_WINDOW_DAYS,
      limit: 6,
    });

    for (const { event } of upcoming) {
      const client = clients.find((c) => c.id === event.clientId || c.name === event.client);
      const message = waTemplates.lembreteTreino({
        cao: event.dog,
        hora: event.time,
        adestrador: trainerName || "Adestrador",
      });
      list.push({
        kind: "reminder",
        key: `reminder-${event.id}`,
        label: `${event.dog} • ${relativeDayLabel(event.day)} ${event.time}`,
        sublabel: `${event.client}${client?.phone ? "" : " — sem WhatsApp cadastrado"}`,
        waUrl: buildWaUrl(client?.phone, message),
      });
    }

    // 2) Treinos a registrar — mesma regra do "Foco nos cães" (nível vermelho),
    // para que os dois painéis nunca apontem números diferentes.
    const missingRecord = computeDogAttention(clients, events, sessions, now, {
      includeInactive: false,
    }).filter(
      (item) => item.level === "red",
    );

    for (const item of missingRecord.slice(0, 3)) {
      list.push({
        kind: "approval",
        key: `approval-${item.dog.id}`,
        label: `Registrar treino de ${item.dog.name}`,
        sublabel: `${item.clientName} — aula da última semana sem registro`,
        href: `/treinos/registro?clientId=${item.clientId}&dogId=${item.dog.id}`,
      });
    }

    return list;
  }, [events, sessions, clients, trainerName, now]);

  if (items.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Prioridades</h2>
          <span className="text-[12px] text-[var(--success)]">Tudo em dia</span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
          Nenhuma aula nas próximas 48h e nenhum treino pendente de registro. Quando houver, os
          lembretes de WhatsApp aparecem aqui prontos para enviar.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Prioridades</h2>
        <span className="text-[12px] font-medium text-[var(--muted)]">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
      </div>
      <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted)]">
        Lembretes de WhatsApp das aulas das próximas 48h e treinos a registrar. Toque para resolver
        cada item.
      </p>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li key={item.key}>
            {item.kind === "approval" ? (
              <Link
                href={item.href}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-[var(--foreground)]">{item.label}</p>
                  <p className="truncate text-[12.5px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
              </Link>
            ) : (
              <a
                href={item.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-[var(--foreground)]">{item.label}</p>
                  <p className="truncate text-[12.5px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <span className="flex h-7 flex-shrink-0 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] font-medium text-[var(--muted-strong)]">
                  <IconWhatsApp className="h-3.5 w-3.5" />
                  Enviar
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
