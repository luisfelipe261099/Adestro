"use client";

import { useMemo } from "react";

import { IconChevronRight, IconWhatsApp } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";

type BriefItem =
  | { kind: "reminder"; key: string; label: string; sublabel: string; waUrl: string }
  | { kind: "approval"; key: string; label: string; sublabel: string; href: string };

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTomorrowWeekdayPt(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return names[tomorrow.getDay()] ?? "";
}

export function DailyBriefCard() {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const clients = useAppStore((state) => state.clients);
  const trainerName = useAppStore((state) => state.trainerName);

  const items: BriefItem[] = useMemo(() => {
    const list: BriefItem[] = [];
    const tomorrowStr = getTomorrowDateString();
    const tomorrowName = getTomorrowWeekdayPt();

    const eventsForTomorrow = events.filter((event) => {
      const day = event.day.trim();
      if (day === tomorrowStr) return true;
      if (day.toLowerCase().includes(tomorrowName.toLowerCase())) return true;
      return false;
    });

    for (const event of eventsForTomorrow.slice(0, 6)) {
      const client = clients.find((c) => c.id === event.clientId || c.name === event.client);
      const message = waTemplates.lembreteTreino({
        cao: event.dog,
        hora: event.time,
        adestrador: trainerName || "Adestrador",
      });
      list.push({
        kind: "reminder",
        key: `reminder-${event.id}`,
        label: `${event.dog} • ${event.time}`,
        sublabel: `${event.client}${client?.phone ? "" : " — sem WhatsApp cadastrado"}`,
        waUrl: buildWaUrl(client?.phone, message),
      });
    }

    const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);
    const eventosSemRegistro = events.filter(
      (event) => event.status === "Confirmado" && event.dogId && !sessionDogIds.has(event.dogId),
    );
    for (const event of eventosSemRegistro.slice(0, 3)) {
      list.push({
        kind: "approval",
        key: `approval-${event.id}`,
        label: `Registrar treino de ${event.dog}`,
        sublabel: `Aula de ${event.day} sem registro`,
        href: `/treinos/registro?clientId=${event.clientId ?? ""}&dogId=${event.dogId ?? ""}`,
      });
    }

    return list;
  }, [events, sessions, clients, trainerName]);

  if (items.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Brief do dia <span className="font-normal text-[var(--muted)]">(resumo automático)</span></h2>
          <span className="text-[11px] text-[var(--success)]">Tudo em dia</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
          O Brief é o resumo automático do seu dia: lembretes prontos de WhatsApp para os clientes
          que têm aula amanhã e treinos que ainda faltam registrar. Quando houver algo a fazer,
          aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Brief do dia <span className="font-normal text-[var(--muted)]">(resumo automático)</span></h2>
        <span className="text-[11px] font-medium text-[var(--muted)]">{items.length} {items.length === 1 ? "item" : "itens"}</span>
      </div>
      <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
        Resumo do dia: lembretes de WhatsApp e treinos a registrar. Toque para resolver cada item.
      </p>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li key={item.key}>
            {item.kind === "approval" ? (
              <a
                href={item.href}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-[13px] transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--foreground)]">{item.label}</p>
                  <p className="truncate text-[11.5px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <IconChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted)]" />
              </a>
            ) : (
              <a
                href={item.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{item.label}</p>
                  <p className="truncate text-[11.5px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <span className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--muted)]">
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
