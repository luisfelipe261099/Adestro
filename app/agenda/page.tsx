"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";
import { downloadIcs, googleCalendarUrl, googleMapsLink, type IcsEvent } from "@/lib/calendar-ics";

type EventStatus = "Confirmado" | "Pendente" | "Cancelado" | "Aguardando" | "Recorrente";
type ViewMode = "dia" | "semana" | "mes";

type WeekDay = {
  short: string;
  full: string;
};

const weekDays: WeekDay[] = [
  { short: "DOM", full: "Domingo" },
  { short: "SEG", full: "Segunda" },
  { short: "TER", full: "Terça" },
  { short: "QUA", full: "Quarta" },
  { short: "QUI", full: "Quinta" },
  { short: "SEX", full: "Sexta" },
  { short: "SAB", full: "Sábado" },
];

function statusBadge(status: EventStatus): string {
  if (status === "Confirmado") return "bg-sky-100 text-sky-800";
  if (status === "Pendente" || status === "Aguardando") return "bg-amber-100 text-amber-900";
  if (status === "Recorrente") return "bg-indigo-100 text-indigo-800";
  return "bg-rose-100 text-rose-800";
}

function statusLabel(status: EventStatus): string {
  if (status === "Confirmado") return "Concluída";
  if (status === "Pendente" || status === "Aguardando") return "Agendada";
  if (status === "Recorrente") return "Recorrente";
  return "Cancelada";
}

function timelineDot(status: EventStatus): string {
  if (status === "Confirmado") return "bg-sky-500";
  if (status === "Pendente" || status === "Aguardando") return "bg-amber-500";
  if (status === "Recorrente") return "bg-indigo-500";
  return "bg-rose-500";
}

function TinyIcon({ name }: { name: "back" | "plus" | "filter" | "play" | "notes" | "whats" | "export" | "calendar" }) {
  if (name === "back") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <path d="m9 7 8 5-8 5V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "notes") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.5 9h7M8.5 13h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "export") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
        <path d="M12 3v13M9 6l3-3 3 3M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M7 18h10a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1l-1.2-2H9.2L8 6H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

// Helper to check if event matches date
function isEventOnDate(eventDay: string, date: Date): boolean {
  const clean = eventDay.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return clean === `${y}-${m}-${d}`;
  }
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return clean === `${d}/${m}/${y}`;
  }
  
  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const eventDayLower = clean.toLowerCase();
  const dateDayName = weekdayNames[date.getDay()].toLowerCase();
  
  return eventDayLower.includes(dateDayName);
}

// Generate weekly Date objects
function buildWeekDates(baseDate: Date): Date[] {
  const sunday = new Date(sundayOf(baseDate));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + index);
    return day;
  });
}

function sundayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(date.getDate() - date.getDay());
  return d;
}

// Generate monthly 42 Date objects grid
function buildMonthGrid(baseDate: Date): Date[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startDayOfWeek);
  
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });
}

function formatMonthYear(date: Date): string {
  const raw = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SchedulePage() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const setEventStatus = useAppStore((state) => state.setEventStatus);
  const rescheduleEvent = useAppStore((state) => state.rescheduleEvent);
  const addCalendarEvent = useAppStore((state) => state.addCalendarEvent);

  // States
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [selectedDogId, setSelectedDogId] = useState(clients[0]?.dogs[0]?.id ?? "");
  const [time, setTime] = useState("09:30");
  const [status, setStatus] = useState<EventStatus>("Pendente");
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  // Remarcação (modal)
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDay, setReschedDay] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStatusFilters, setShowStatusFilters] = useState(false);
  const [agendaMessage, setAgendaMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | EventStatus>("Todos");

  // Collective & Recurrence
  const [isCollective, setIsCollective] = useState(false);
  const [collectiveDogName, setCollectiveDogName] = useState("");
  const [collectiveClientName, setCollectiveClientName] = useState("");
  const [collectivePlanName, setCollectivePlanName] = useState("Aula Coletiva");
  const [recurrence, setRecurrence] = useState("none");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId],
  );

  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId],
  );

  const weekDates = useMemo(() => buildWeekDates(currentDate), [currentDate]);
  const monthGrid = useMemo(() => buildMonthGrid(currentDate), [currentDate]);

  // Filter events for selected day
  const eventsForSelectedDay = useMemo(() => {
    return [...events]
      .filter((event) => isEventOnDate(event.day, currentDate))
      .filter((event) => statusFilter === "Todos" || event.status === statusFilter)
      .sort((left, right) => left.time.localeCompare(right.time));
  }, [events, currentDate, statusFilter]);

  // Summary statistics for selected day
  const totalConfirmed = useMemo(
    () => eventsForSelectedDay.filter((event) => event.status === "Confirmado").length,
    [eventsForSelectedDay],
  );

  const totalInProgress = useMemo(
    () => eventsForSelectedDay.filter((event) => event.status === "Pendente" || event.status === "Aguardando").length,
    [eventsForSelectedDay],
  );

  const totalCancelled = useMemo(
    () => eventsForSelectedDay.filter((event) => event.status === "Cancelado").length,
    [eventsForSelectedDay],
  );

  const dogPhotoByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clients) {
      for (const dog of client.dogs) {
        if (dog.photoUrl) map.set(dog.name, dog.photoUrl);
      }
    }
    return map;
  }, [clients]);

  const dogPhotoById = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clients) {
      for (const dog of client.dogs) {
        if (dog.photoUrl) map.set(dog.id, dog.photoUrl);
      }
    }
    return map;
  }, [clients]);

  const clientDogMetaByNames = useMemo(() => {
    const map = new Map<string, { clientId: string; dogId: string; phone: string }>();
    clients.forEach((client) => {
      client.dogs.forEach((dog) => {
        map.set(`${client.name}::${dog.name}`, { clientId: client.id, dogId: dog.id, phone: client.phone || "" });
      });
    });
    return map;
  }, [clients]);

  const clientDogMetaByIds = useMemo(() => {
    const map = new Map<string, { clientId: string; dogId: string; phone: string }>();
    clients.forEach((client) => {
      client.dogs.forEach((dog) => {
        map.set(`${client.id}::${dog.id}`, { clientId: client.id, dogId: dog.id, phone: client.phone || "" });
      });
    });
    return map;
  }, [clients]);

  function parseEventDate(day: string): string {
    // Sempre retorna no formato YYYY-MM-DD usado pela lib ICS.
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(day)) {
      const [d, m, y] = day.split("/");
      return `${y}-${m}-${d}`;
    }
    // Fallback: dia da semana → próxima data correspondente
    const weekdayNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    const idx = weekdayNames.findIndex((name) => day.toLowerCase().includes(name));
    const today = new Date();
    if (idx >= 0) {
      const diff = (idx - today.getDay() + 7) % 7;
      today.setDate(today.getDate() + diff);
    }
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function eventToIcs(event: { id: string; day: string; time: string; dog: string; client: string; plan?: string }): IcsEvent {
    return {
      uid: event.id,
      title: `Adestramento: ${event.dog} (Tutor: ${event.client})`,
      description: event.plan ? `Plano/foco: ${event.plan}` : undefined,
      date: parseEventDate(event.day),
      startTime: event.time || "09:00",
      durationMinutes: 60,
    };
  }

  function handleOpenWhatsApp(phone: string | undefined, dogName: string, event: { day: string; time: string }) {
    if (!phone) {
      setAgendaMessage("Tutor sem WhatsApp válido.");
      window.setTimeout(() => setAgendaMessage(""), 3000);
      return;
    }
    const text = waTemplates.agendamentoCriado({
      tutor: "",
      cao: dogName,
      data: event.day,
      hora: event.time,
    });
    window.open(buildWaUrl(phone, text), "_blank", "noopener,noreferrer");
  }

  function handleSendConfirmation(phone: string | undefined, dogName: string, event: { day: string; time: string }) {
    if (!phone) {
      setAgendaMessage("Tutor sem WhatsApp válido para envio da confirmação.");
      window.setTimeout(() => setAgendaMessage(""), 3000);
      return;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const text = waTemplates.confirmacaoSolicitada({
      cao: dogName,
      data: `${event.day} às ${event.time}`,
      link: `${baseUrl}/portal/cliente`,
    });
    window.open(buildWaUrl(phone, text), "_blank", "noopener,noreferrer");
  }

  function handleOpenMap(event: { client: string; dog: string }) {
    // Usa o nome do tutor + cão como termo de busca quando não há endereço estruturado.
    const meta = clientDogMetaByNames.get(`${event.client}::${event.dog}`);
    const client = meta ? clients.find((c) => c.id === meta.clientId) : null;
    const address = client?.environment?.split("\n")[0] || `${event.client}`;
    window.open(googleMapsLink(address), "_blank", "noopener,noreferrer");
  }

  // Export iCal .ics file
  function handleExportICS(event: { id: string; day: string; time: string; dog: string; client: string; plan?: string }) {
    downloadIcs(`evento-adestramento-${event.id}`, [eventToIcs(event)]);
  }

  function handleOpenGoogleCalendar(event: { id: string; day: string; time: string; dog: string; client: string; plan?: string }) {
    window.open(googleCalendarUrl(eventToIcs(event)), "_blank", "noopener,noreferrer");
  }

  async function handleSetStatus(eventId: string, newStatus: EventStatus) {
    if (busyEventId) return;
    setBusyEventId(eventId);
    try {
      const ok = await setEventStatus(eventId, newStatus);
      if (!ok) {
        setAgendaMessage("Não foi possível sincronizar o status.");
        window.setTimeout(() => setAgendaMessage(""), 3000);
      }
    } finally {
      setBusyEventId(null);
    }
  }

  function handleOpenReschedule(event: { id: string; day: string; time: string }) {
    setReschedId(event.id);
    setReschedDay(parseEventDate(event.day));
    setReschedTime(event.time || "09:30");
  }

  async function handleConfirmReschedule() {
    if (!reschedId || !reschedDay || !reschedTime || busyEventId) return;
    setBusyEventId(reschedId);
    try {
      const ok = await rescheduleEvent(reschedId, reschedDay, reschedTime);
      setAgendaMessage(ok ? "Aula remarcada. Tutor precisa reconfirmar." : "Não foi possível remarcar.");
      window.setTimeout(() => setAgendaMessage(""), 3000);
      if (ok) setReschedId(null);
    } finally {
      setBusyEventId(null);
    }
  }

  // Navigate time
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "dia") next.setDate(currentDate.getDate() - 1);
    else if (viewMode === "semana") next.setDate(currentDate.getDate() - 7);
    else next.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "dia") next.setDate(currentDate.getDate() + 1);
    else if (viewMode === "semana") next.setDate(currentDate.getDate() + 7);
    else next.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    if (!isCollective && (!selectedClient || !selectedDog)) {
      setAgendaMessage("Selecione um tutor e cão.");
      return;
    }
    if (isCollective && !collectiveDogName.trim()) {
      setAgendaMessage("Defina o nome da turma coletiva.");
      return;
    }

    setIsCreating(true);
    const dayStr = formatISODate(currentDate);

    try {
      const ok = await addCalendarEvent({
        clientId: isCollective ? undefined : selectedClient.id,
        dogId: isCollective ? undefined : selectedDog.id,
        day: dayStr,
        time,
        dog: isCollective ? collectiveDogName.trim() : selectedDog.name,
        client: isCollective ? collectiveClientName.trim() || "Coletivo" : selectedClient.name,
        plan: isCollective ? collectivePlanName.trim() : (selectedClient.plan || "Plano personalizado"),
        sessionNumber: events.filter(e => e.clientId === (isCollective ? undefined : selectedClient.id)).length + 1,
        status,
        recurrence,
      });

      if (ok) {
        setStatus("Pendente");
        setRecurrence("none");
        setCollectiveDogName("");
        setCollectiveClientName("");
        setShowForm(false);
        setAgendaMessage("Agendamento cadastrado com sucesso!");
        window.setTimeout(() => setAgendaMessage(""), 3000);
      } else {
        setAgendaMessage("Não foi possível criar o agendamento.");
        window.setTimeout(() => setAgendaMessage(""), 3500);
      }
    } finally {
      setIsCreating(false);
    }
  }

  // Check if date has events
  const getEventsForGridDate = (d: Date) => {
    return events.filter(e => isEventOnDate(e.day, d));
  };

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="page-header">
          <div className="page-header-actions">
            <div className="min-w-0">
              <p className="text-eyebrow mb-1.5">Agenda</p>
              <h1 className="text-display">Calendário</h1>
              <p className="mt-1 text-subtitle">Agendamentos, turmas e recorrências.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="btn-primary text-[12.5px]"
            >
              <TinyIcon name="plus" />
              Novo agendamento
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div data-tour="agenda-tabs" className="tabs">
            {(["dia", "semana", "mes"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                data-active={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className="tab-trigger"
              >
                {mode === "dia" ? "Dia" : mode === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="btn-secondary h-8 text-[12px]"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              ›
            </button>
          </div>
        </div>

          {/* DATE HEADER CONTEXT */}
          <header className="mt-3 flex items-center justify-between text-xs font-bold text-slate-700 bg-white/70 border border-slate-100 rounded-md p-3">
            <span className="flex items-center gap-1">
              <TinyIcon name="calendar" />
              {viewMode === "dia" ? currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) :
               viewMode === "semana" ? `Semana de ${weekDates[0]?.getDate()}/${weekDates[0]?.getMonth() + 1} a ${weekDates[6]?.getDate()}/${weekDates[6]?.getMonth() + 1}` :
               formatMonthYear(currentDate)}
            </span>
            <button type="button" onClick={() => setShowStatusFilters(c => !c)} className="inline-flex items-center gap-1 text-[var(--foreground)]">
              <TinyIcon name="filter" />
              Filtro ({statusFilter === "Todos" ? "Todos" : statusLabel(statusFilter)})
            </button>
          </header>

          {/* STATUS FILTERS BAR */}
          {showStatusFilters && (
            <section className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 animate-in slide-in-from-top-2 duration-150">
              {(["Todos", "Confirmado", "Pendente", "Cancelado"] as const).map((filterValue) => (
                <button
                  key={filterValue}
                  type="button"
                  onClick={() => setStatusFilter(filterValue)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                    statusFilter === filterValue
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {filterValue === "Todos" ? "Todos" : statusLabel(filterValue)}
                </button>
              ))}
            </section>
          )}

          {agendaMessage && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{agendaMessage}</p>
          )}

          {/* ======================================= */}
          {/* VIEW: DAILY LIST */}
          {/* ======================================= */}
          {viewMode === "dia" && (
            <section className="mt-3 space-y-2">
              
              {/* Daily Statistics */}
              <div className="grid grid-cols-3 gap-2">
                <article className="rounded-md border border-[var(--border)] bg-white p-2.5 text-center">
                  <p className="text-xl font-bold text-[var(--foreground)]">{eventsForSelectedDay.length}</p>
                  <p className="text-[10px] text-[var(--muted)]">Aulas no dia</p>
                </article>
                <article className="rounded-md border border-[var(--border)] bg-white p-2.5 text-center">
                  <p className="text-xl font-bold text-amber-600">{totalInProgress}</p>
                  <p className="text-[10px] text-[var(--muted)]">Agendadas</p>
                </article>
                <article className="rounded-md border border-[var(--border)] bg-white p-2.5 text-center">
                  <p className="text-xl font-bold text-sky-600">{totalConfirmed}</p>
                  <p className="text-[10px] text-[var(--muted)]">Concluídas</p>
                </article>
              </div>

              {/* Event Cards */}
              <div className="mt-3 space-y-2.5">
                {eventsForSelectedDay.map((event) => {
                  const photo = (event.dogId ? dogPhotoById.get(event.dogId) : undefined) ?? dogPhotoByName.get(event.dog);
                  const relatedMeta =
                    (event.clientId && event.dogId
                      ? clientDogMetaByIds.get(`${event.clientId}::${event.dogId}`)
                      : undefined) ?? clientDogMetaByNames.get(`${event.client}::${event.dog}`);
                  
                  return (
                    <article key={event.id} className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm hover:border-[#145a82]/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 pt-1 text-right">
                          <p className="text-xs font-bold text-slate-800">{event.time}</p>
                          <span className={`mx-auto mt-1 block h-2.5 w-2.5 rounded-full ${timelineDot(event.status as EventStatus)}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--surface-2)]">
                                <Image
                                  src={photo || "/images/dog-default-bolt.svg"}
                                  alt={`Foto de ${event.dog}`}
                                  fill
                                  sizes="40px"
                                  unoptimized
                                  onError={(ev) => {
                                    ev.currentTarget.src = "/images/dog-default-bolt.svg";
                                  }}
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{event.dog}</p>
                                <p className="text-[11px] text-[var(--muted)]">
                                  {event.client} {event.sessionNumber ? `• Aula ${event.sessionNumber}` : ""}
                                </p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${statusBadge(event.status as EventStatus)}`}>
                              {statusLabel(event.status as EventStatus)}
                            </span>
                          </div>

                          {event.plan && (
                            <p className="text-[10px] text-slate-500 bg-slate-50 rounded px-2 py-0.5 mt-2 inline-block">
                              Plan/Foco: {event.plan}
                            </p>
                          )}

                          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
                            <Link href={relatedMeta ? `/treinos/registro?clientId=${relatedMeta.clientId}&dogId=${relatedMeta.dogId}` : "/treinos/registro"} className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-[var(--foreground)] hover:bg-[var(--surface-2)]">
                              <TinyIcon name="notes" />
                              Registrar
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleSendConfirmation(relatedMeta?.phone, event.dog, { day: event.day, time: event.time })}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-emerald-700 hover:bg-emerald-100"
                              title="Solicita confirmação de presença via WhatsApp"
                            >
                              ✅ Confirmação
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(relatedMeta?.phone, event.dog, { day: event.day, time: event.time })}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-emerald-700 hover:bg-emerald-50"
                            >
                              <TinyIcon name="whats" />
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenMap(event)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-rose-700 hover:bg-rose-50"
                            >
                              📍 Mapa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenGoogleCalendar(event)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-blue-700 hover:bg-blue-50"
                              title="Abrir no Google Calendar"
                            >
                              📆 Google
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportICS(event)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-indigo-700 hover:bg-indigo-50"
                              title="Baixar .ics para Apple Calendar / Outlook"
                            >
                              <TinyIcon name="export" />
                              .ics
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-50">
                            <button
                              type="button"
                              onClick={() => handleSetStatus(event.id, "Confirmado")}
                              disabled={busyEventId === event.id}
                              className="rounded-full border border-sky-300 bg-[var(--surface-2)] px-2 py-0.5 text-[9px] font-semibold text-sky-800 disabled:opacity-50"
                            >
                              Concluir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(event.id, "Pendente")}
                              disabled={busyEventId === event.id}
                              className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-900 disabled:opacity-50"
                            >
                              Agendar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(event.id, "Cancelado")}
                              disabled={busyEventId === event.id}
                              className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-800 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReschedule(event)}
                              disabled={busyEventId === event.id}
                              className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-800 disabled:opacity-50"
                            >
                              Remarcar
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {eventsForSelectedDay.length === 0 ? (
                  <article className="rounded-md border border-dashed border-[var(--border)] bg-white p-6 text-center text-xs text-[var(--muted)]">
                    Nenhuma aula agendada para este dia.
                  </article>
                ) : null}
              </div>
            </section>
          )}

          {/* ======================================= */}
          {/* VIEW: WEEKLY GRID LIST */}
          {/* ======================================= */}
          {viewMode === "semana" && (
            <section className="mt-3 space-y-2.5">
              {weekDates.map((dayDate) => {
                const dayEvents = getEventsForGridDate(dayDate)
                  .filter(e => statusFilter === "Todos" || e.status === statusFilter)
                  .sort((a,b) => a.time.localeCompare(b.time));
                const isSelected = currentDate.getDate() === dayDate.getDate() && currentDate.getMonth() === dayDate.getMonth();
                const isToday = new Date().toDateString() === dayDate.toDateString();

                return (
                  <div
                    key={dayDate.toDateString()}
                    onClick={() => setCurrentDate(dayDate)}
                    className={`rounded-md border p-3 cursor-pointer transition-all bg-white ${
                      isSelected ? "border-[#145a82] ring-1 ring-[#145a82]" : "border-[var(--border)]"
                    }`}
                  >
                    <header className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase ${isSelected ? "text-[var(--foreground)]" : "text-slate-500"}`}>
                          {weekDays[dayDate.getDay()]?.full}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isToday ? "bg-amber-100 text-amber-900 font-bold" : "bg-slate-100 text-slate-700"
                        }`}>
                          Dia {dayDate.getDate()}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayEvents.length} {dayEvents.length === 1 ? "aula" : "aulas"}
                      </span>
                    </header>

                    <div className="mt-2 space-y-1.5">
                      {dayEvents.map(e => (
                        <div key={e.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-[var(--foreground)]">{e.time}</span>
                            <span className="truncate text-slate-800 font-medium">{e.dog} ({e.client})</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${statusBadge(e.status as EventStatus)}`}>
                            {statusLabel(e.status as EventStatus)}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">Sem agendamentos.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* ======================================= */}
          {/* VIEW: MONTHLY GRID */}
          {/* ======================================= */}
          {viewMode === "mes" && (
            <section className="mt-3 bg-white border border-[var(--border)] rounded-md p-2 shadow-sm animate-in fade-in duration-200">
              
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-500 uppercase tracking-wider pb-1">
                {weekDays.map(d => <span key={d.short}>{d.short}</span>)}
              </div>

              {/* Monthly calendar cells */}
              <div className="grid grid-cols-7 gap-1 mt-1">
                {monthGrid.map((dayDate, idx) => {
                  const dayEvents = getEventsForGridDate(dayDate);
                  const isCurrentMonth = dayDate.getMonth() === currentDate.getMonth();
                  const isToday = new Date().toDateString() === dayDate.toDateString();
                  const isSelected = currentDate.getDate() === dayDate.getDate() && currentDate.getMonth() === dayDate.getMonth();

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentDate(dayDate)}
                      className={`relative flex flex-col items-center justify-between h-10 py-1.5 rounded-md border text-center transition-all ${
                        !isCurrentMonth ? "bg-slate-50/40 text-slate-300 border-transparent" : "bg-white text-slate-800 border-slate-100"
                      } ${
                        isSelected ? "border-[#145a82] ring-1 ring-[#145a82] bg-[var(--surface-2)]/30" : ""
                      } ${
                        isToday ? "font-extrabold ring-1 ring-amber-400" : ""
                      }`}
                    >
                      <span className={`text-[11px] leading-none ${isToday ? "text-amber-700" : ""}`}>{dayDate.getDate()}</span>
                      
                      {/* Event dots indicator */}
                      <div className="flex gap-0.5 justify-center mt-1">
                        {dayEvents.slice(0, 3).map((e, index) => (
                          <span key={index} className={`h-1.5 w-1.5 rounded-full ${timelineDot(e.status as EventStatus)}`} />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[7px] text-slate-400 font-bold leading-none">+</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected date events preview */}
              <div className="mt-3.5 border-t border-slate-100 pt-3.5 px-1.5 pb-1">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Aulas em {currentDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}:
                </h3>
                <div className="mt-2 space-y-1.5">
                  {eventsForSelectedDay.map(e => (
                    <div key={e.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--foreground)]">{e.time}</span>
                        <span className="text-slate-800 font-medium">{e.dog} • {e.client}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${statusBadge(e.status as EventStatus)}`}>
                        {statusLabel(e.status as EventStatus)}
                      </span>
                    </div>
                  ))}
                  {eventsForSelectedDay.length === 0 && (
                    <p className="text-xs text-[var(--muted)] italic">Nenhum evento para este dia.</p>
                  )}
                </div>
              </div>

            </section>
          )}

          {/* ======================================= */}
          {/* SECTION: NEW EVENT BUTTON & FORM */}
          {/* ======================================= */}
          <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Novo Agendamento</p>
                <p className="text-[10px] text-[var(--muted)]">Agende para o dia selecionado ({currentDate.getDate()}/{currentDate.getMonth()+1})</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                {showForm ? "Fechar" : "Nova aula"}
              </button>
            </div>
          </section>

          {showForm && (
            <section className="mt-3 rounded-md border border-[var(--border)] bg-white p-4 shadow-sm animate-in slide-in-from-top-4 duration-200">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)] border-b border-slate-100 pb-2">Agendar Aula</p>
              
              <form onSubmit={onSubmit} className="mt-3.5 space-y-3.5">
                
                {/* Individual vs Collective Toggle */}
                <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsCollective(false)}
                    className={`rounded-lg py-1.5 transition ${!isCollective ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCollective(true)}
                    className={`rounded-lg py-1.5 transition ${isCollective ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}
                  >
                    Coletiva (Turma)
                  </button>
                </div>

                {!isCollective ? (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="flex items-center justify-between text-[11px] font-medium text-[var(--muted)]">
                        Tutor
                        <Link href="/clientes" className="text-[9px] font-semibold text-[var(--foreground)] hover:underline">+ Criar Tutor</Link>
                      </span>
                      <select
                        value={selectedClientId ?? ""}
                        onChange={(event) => {
                          const nextClient = clients.find((item) => item.id === event.target.value);
                          setSelectedClientId(event.target.value);
                          setSelectedDogId(nextClient?.dogs[0]?.id ?? "");
                        }}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      >
                        {clients.length === 0 && <option value="">Sem clientes cadastrados</option>}
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="flex items-center justify-between text-[11px] font-medium text-[var(--muted)]">
                        Cão
                        <Link href="/clientes" className="text-[9px] font-semibold text-[var(--foreground)] hover:underline">+ Criar Cão</Link>
                      </span>
                      <select
                        value={selectedDogId ?? ""}
                        onChange={(event) => setSelectedDogId(event.target.value)}
                        disabled={!selectedClient?.dogs.length}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none disabled:opacity-60 focus:border-sky-400"
                      >
                        {!selectedClient?.dogs.length && <option value="">Sem cães</option>}
                        {(selectedClient?.dogs ?? []).map((dog) => (
                          <option key={dog.id} value={dog.id}>{dog.name} • {dog.breed}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2 animate-in fade-in duration-200">
                    <label className="grid gap-1">
                      <span className="text-[11px] font-medium text-[var(--muted)]">Nome da Turma / Evento *</span>
                      <input
                        value={collectiveDogName}
                        onChange={(e) => setCollectiveDogName(e.target.value)}
                        placeholder="Ex: Turma do Parque, Socialização"
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                        required
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[11px] font-medium text-[var(--muted)]">Identificador do Grupo / Local</span>
                      <input
                        value={collectiveClientName}
                        onChange={(e) => setCollectiveClientName(e.target.value)}
                        placeholder="Ex: Sítio Cão Feliz, Praça central"
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-[11px] font-medium text-[var(--muted)]">Foco / Atividades Coletivas</span>
                      <input
                        value={collectivePlanName}
                        onChange={(e) => setCollectivePlanName(e.target.value)}
                        placeholder="Ex: Treino de foco, reatividade com outros cães"
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                    </label>
                  </div>
                )}

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-[11px] font-medium text-[var(--muted)]">Dia do Agendamento</span>
                    <input
                      value={currentDate.toLocaleDateString("pt-BR")}
                      readOnly
                      className="rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-[var(--foreground)]"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[11px] font-medium text-[var(--muted)]">Horário</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-[11px] font-medium text-[var(--muted)]">Status Inicial</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as EventStatus)}
                      className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                    >
                      <option value="Pendente">Agendada</option>
                      <option value="Confirmado">Concluída</option>
                      <option value="Cancelado">Cancelado</option>
                      <option value="Aguardando">Aguardando confirmação</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[11px] font-medium text-[var(--muted)]">Repetição (Recorrência)</span>
                    <select
                      value={recurrence}
                      onChange={(event) => setRecurrence(event.target.value)}
                      className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                    >
                      <option value="none">Não repete</option>
                      <option value="4weeks">Semanal (4 semanas)</option>
                      <option value="8weeks">Semanal (8 semanas)</option>
                      <option value="12weeks">Semanal (12 semanas)</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isCreating || (!isCollective && clients.length === 0)}
                  className="w-full rounded-full bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 transition"
                >
                  {isCreating ? "Criando..." : "Criar Agendamento"}
                </button>
              </form>
            </section>
          )}

        {reschedId && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
            onClick={() => setReschedId(null)}
          >
            <div
              className="w-full max-w-sm rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-[var(--foreground)]">Remarcar aula</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Ao remarcar, a aula volta para “Pendente” e o tutor precisa reconfirmar.
              </p>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-1">
                  <label className="text-[11px] font-medium text-[var(--muted)]">Nova data</label>
                  <input
                    type="date"
                    value={reschedDay}
                    onChange={(e) => setReschedDay(e.target.value)}
                    className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[11px] font-medium text-[var(--muted)]">Novo horário</label>
                  <input
                    type="time"
                    value={reschedTime}
                    onChange={(e) => setReschedTime(e.target.value)}
                    className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReschedId(null)}
                  className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm font-semibold text-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={!reschedDay || !reschedTime || busyEventId === reschedId}
                  className="flex-1 rounded-full bg-[var(--accent)] py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busyEventId === reschedId ? "Remarcando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
