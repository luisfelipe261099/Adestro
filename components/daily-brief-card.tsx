"use client";

import { useMemo } from "react";

import { useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";

type BriefItem =
  | { kind: "reminder"; key: string; label: string; sublabel: string; waUrl: string }
  | { kind: "charge"; key: string; label: string; sublabel: string; waUrl: string }
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

    // 1) Aulas de amanhã → lembrete WhatsApp para cada tutor
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
        label: `Lembrete: ${event.dog} amanhã ${event.time}`,
        sublabel: `Tutor: ${event.client}${client?.phone ? "" : " • Sem WhatsApp"}`,
        waUrl: buildWaUrl(client?.phone, message),
      });
    }

    // 2) Treinos sem registro (relatórios aguardando aprovação no fluxo de IA)
    const sessionDogIds = new Set(sessions.map((s) => s.dogId).filter(Boolean) as string[]);
    const eventosSemRegistro = events.filter(
      (event) => event.status === "Confirmado" && event.dogId && !sessionDogIds.has(event.dogId),
    );
    for (const event of eventosSemRegistro.slice(0, 3)) {
      list.push({
        kind: "approval",
        key: `approval-${event.id}`,
        label: `Registrar aula de ${event.dog}`,
        sublabel: `Aula de ${event.day} ainda sem registro`,
        href: `/treinos/registro?clientId=${event.clientId ?? ""}&dogId=${event.dogId ?? ""}`,
      });
    }

    return list;
  }, [events, sessions, clients, trainerName]);

  if (items.length === 0) {
    return (
      <article className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">☀️ Brief do dia</span>
        <p className="mt-2 text-xs text-emerald-900">
          Nada urgente para preparar. Amanhã não há aulas confirmadas e os registros estão em dia.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-purple-100 bg-purple-50/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4d2d6c]">☀️ Brief do dia</span>
        <span className="rounded-full bg-purple-200/70 px-2 py-0.5 text-[10px] font-bold text-purple-900">
          {items.length} item(s)
        </span>
      </div>
      <p className="mt-1 text-[10px] text-purple-800">
        Lembretes e tarefas que valem disparar agora. Toque para abrir o WhatsApp ou ir direto ao registro.
      </p>

      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            {item.kind === "approval" ? (
              <a
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">📝 {item.label}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <span className="text-[#145a82]">→</span>
              </a>
            ) : (
              <a
                href={item.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {item.kind === "reminder" ? "💬" : "💰"} {item.label}
                  </p>
                  <p className="truncate text-[10px] text-[var(--muted)]">{item.sublabel}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                  Enviar
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
