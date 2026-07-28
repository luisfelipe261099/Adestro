import type { CalendarEvent, ClientProfile, TrainingSession } from "@/lib/app-store";

// Seletores puros compartilhados pela home, pelo Quadro do dia e pelos painéis.
//
// Por que este arquivo existe: o campo `CalendarEvent.day` é heterogêneo — pode
// ser uma data ISO ("2026-06-22"), "dd/mm/yyyy", ou o nome de um dia da semana
// ("Segunda", resíduo de dados de demonstração/seed). Antes, cada tela
// reimplementava "é hoje?" e "está cancelado?" à sua maneira, e as respostas
// divergiam: o card "Agenda do dia" contava aulas canceladas e o Quadro do dia
// não, então o card dizia 3 e o quadro mostrava 0. Aqui a regra é uma só.

const WEEKDAYS_LOWER = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const WEEKDAYS_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Janela em que uma aula já iniciada continua sendo "a de agora". */
export const IN_PROGRESS_WINDOW_MS = 90 * 60_000;

const DAY_MS = 86_400_000;

/** Remove acentos e caixa — dados de seed gravam "Sabado" sem acento. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Um evento cancelado não conta em lugar nenhum: nem no card, nem no quadro,
 * nem como "próxima sessão". Predicado único para os três casarem.
 */
export function isCancelled(status: string | undefined | null): boolean {
  return /cancel/i.test(status ?? "");
}

export function isActiveEvent(event: Pick<CalendarEvent, "status">): boolean {
  return !isCancelled(event.status);
}

/**
 * Resolve um `day` para `YYYY-MM-DD`.
 *
 * Retorna `null` quando não reconhece o formato. Isso é deliberado: a versão
 * anterior devolvia "hoje" para qualquer lixo, o que fazia entradas corrompidas
 * aparecerem como aula fantasma na agenda de todo dia.
 *
 * Para nome de dia da semana (dados legados), devolve a próxima ocorrência —
 * hoje conta como ocorrência.
 */
export function resolveEventDate(day: string, now: Date = new Date()): string | null {
  const clean = (day ?? "").trim();
  if (!clean) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Aceita "01/08/2026" e "1/8/2026" — `toLocaleDateString("pt-BR")` não
  // garante zero à esquerda em toda plataforma, e é assim que os vencimentos
  // de cobrança são gravados.
  const brDate = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, d, m, y] = brDate;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const normalized = normalize(clean);
  const idx = WEEKDAYS_LOWER.findIndex((name) => normalized.includes(name));
  if (idx < 0) return null;

  const base = startOfDay(now);
  base.setDate(base.getDate() + ((idx - base.getDay() + 7) % 7));
  return ymd(base);
}

/** `true` quando o `day` é nome de dia da semana (aula recorrente legada). */
export function isWeekdayPattern(day: string): boolean {
  const clean = (day ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) return false;
  return WEEKDAYS_LOWER.some((name) => normalize(clean).includes(name));
}

/** Timestamp (ms) combinando data resolvida + hora. `null` se a data não resolve. */
export function eventTimestamp(day: string, time: string, now: Date = new Date()): number | null {
  const resolved = resolveEventDate(day, now);
  if (!resolved) return null;
  const [y, m, d] = resolved.split("-").map(Number);
  const match = (time ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  const hh = match ? Number(match[1]) : 0;
  const mm = match ? Number(match[2]) : 0;
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/** O evento cai no dia informado? Compara datas resolvidas, nunca substring solta. */
export function isEventOnDay(
  event: Pick<CalendarEvent, "day">,
  date: Date,
  now: Date = new Date(),
): boolean {
  const resolved = resolveEventDate(event.day, now);
  return resolved !== null && resolved === ymd(date);
}

/** Rótulo humano: "Hoje", "Amanhã", dia da semana (próximos 7 dias) ou "dd/mm". */
export function relativeDayLabel(day: string, now: Date = new Date()): string {
  const resolved = resolveEventDate(day, now);
  if (!resolved) return day;
  const [y, m, d] = resolved.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const diffDays = Math.round((target.getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays > 1 && diffDays < 7) return WEEKDAYS_LABEL[target.getDay()];
  return target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Data absoluta curta ("29/07") — acompanha o rótulo relativo para tirar ambiguidade. */
export function absoluteDayLabel(day: string, now: Date = new Date()): string | null {
  const resolved = resolveEventDate(day, now);
  if (!resolved) return null;
  const [y, m, d] = resolved.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Domingo 00:00 → sábado 23:59:59 da semana que contém `now`. */
export function weekRangeOf(now: Date = new Date()): { start: Date; end: Date } {
  const start = startOfDay(now);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Aulas ativas (não canceladas) de um dia, ordenadas por horário. */
export function eventsOnDay(
  events: CalendarEvent[],
  date: Date,
  now: Date = new Date(),
): CalendarEvent[] {
  return events
    .filter(isActiveEvent)
    .filter((event) => isEventOnDay(event, date, now))
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Aulas ativas dentro da semana corrente, ordenadas por data+hora. */
export function eventsInWeek(events: CalendarEvent[], now: Date = new Date()): CalendarEvent[] {
  const { start, end } = weekRangeOf(now);
  return events
    .filter(isActiveEvent)
    .map((event) => ({ event, ts: eventTimestamp(event.day, event.time, now) }))
    .filter((item): item is { event: CalendarEvent; ts: number } => item.ts !== null)
    .filter((item) => item.ts >= start.getTime() && item.ts <= end.getTime())
    .sort((a, b) => a.ts - b.ts)
    .map((item) => item.event);
}

/**
 * A próxima sessão: evento ativo mais próximo, incluindo o que começou há até
 * 90min (aula em andamento continua sendo o foco da tela).
 *
 * Seletor único — antes esta lógica estava duplicada byte a byte no card e no
 * cabeçalho do dashboard, e as duas cópias elegiam aulas canceladas.
 */
export function pickNextSession(
  events: CalendarEvent[],
  now: number = Date.now(),
): CalendarEvent | null {
  const reference = new Date(now);
  return (
    events
      .filter(isActiveEvent)
      .map((event) => ({ event, ts: eventTimestamp(event.day, event.time, reference) }))
      .filter((item): item is { event: CalendarEvent; ts: number } => item.ts !== null)
      .filter((item) => item.ts >= now - IN_PROGRESS_WINDOW_MS)
      .sort((a, b) => a.ts - b.ts)[0]?.event ?? null
  );
}

export type UpcomingSession = { event: CalendarEvent; ts: number };

/**
 * Próximas aulas ordenadas por data+hora, a partir de agora.
 * `withinDays` limita o horizonte (7 = resto da semana móvel).
 */
export function listUpcomingSessions(
  events: CalendarEvent[],
  now: number = Date.now(),
  options: { withinDays?: number; limit?: number } = {},
): UpcomingSession[] {
  const reference = new Date(now);
  const horizon =
    options.withinDays === undefined ? Number.POSITIVE_INFINITY : now + options.withinDays * DAY_MS;

  const list = events
    .filter(isActiveEvent)
    .map((event) => ({ event, ts: eventTimestamp(event.day, event.time, reference) }))
    .filter((item): item is UpcomingSession => item.ts !== null)
    .filter((item) => item.ts >= now - IN_PROGRESS_WINDOW_MS && item.ts <= horizon)
    .sort((a, b) => a.ts - b.ts);

  return options.limit ? list.slice(0, options.limit) : list;
}

/**
 * Total de aulas derivado do nome do plano quando ele contém "N aulas"
 * (ex.: "Pacote 8 aulas" → 8). Caso contrário `null` — não inventamos
 * denominador para "Sessão X/Y".
 */
export function parsePlanTotal(plan: string | undefined | null): number | null {
  if (!plan) return null;
  const match = plan.match(/(\d+)\s*aulas?/i);
  return match ? Number(match[1]) : null;
}

export type AttentionLevel = "red" | "amber" | "green";

export type DogAttention = {
  clientId: string;
  clientName: string;
  dog: ClientProfile["dogs"][number];
  level: AttentionLevel;
  label: string;
  reason: string; // explicação em linguagem de negócio, mostrada ao usuário
  href: string;
  sessionCount: number; // treinos já registrados deste cão (progresso)
  plan: string; // plano do cliente
  sessionsTotal: number; // total de sessões do contrato ativo (0 = sem plano)
  progressPct: number; // 0-100 (sessionCount / sessionsTotal)
  phaseLabel: string; // Inicial / Intermediário / Avançado / Formado / Sem plano
};

const ATTENTION_ORDER: Record<AttentionLevel, number> = { red: 0, amber: 1, green: 2 };

/** Fases em que o cão já saiu do fluxo de trabalho corrente. */
const INACTIVE_DOG_STATUSES = new Set(["Completo", "Cancelado"]);

export type DogAttentionOptions = {
  /**
   * Incluir cães já finalizados/cancelados. Padrão `true`.
   *
   * O kanban de clientes precisa deles — tem uma coluna para cada fase, e sem
   * eles ficaria impossível arrastar um cão de volta para "Ativo". Já os
   * painéis da home pedem `false`: um cão formado não é uma pendência.
   */
  includeInactive?: boolean;
};

/** Um cão participa do evento por vínculo direto ou como participante de turma. */
function eventIncludesDog(
  event: CalendarEvent,
  dog: ClientProfile["dogs"][number],
  clientId: string,
): boolean {
  if (event.dogId) return event.dogId === dog.id;
  if (event.participantDogIds?.length) return event.participantDogIds.includes(dog.id);
  // Fallback por nome só vale dentro do mesmo cliente — dois cães homônimos de
  // clientes diferentes não podem compartilhar a mesma agenda.
  return event.dog === dog.name && (!event.clientId || event.clientId === clientId);
}

/**
 * Carteira de cães com semáforo — o quadro "Foco nos cães".
 *
 * Regra, em linguagem de negócio (janela de 7 dias, como o usuário pediu):
 *  - vermelho: teve aula nos últimos 7 dias e o treino não foi registrado;
 *  - amarelo:  não tem nenhuma aula marcada nos próximos 7 dias;
 *  - verde:    tem aula marcada e nada atrasado.
 *
 * Função pura para que o painel, o kanban e a métrica do dashboard usem a MESMA
 * regra. Não atribui atraso de pagamento por cão (o store não liga pagamento a
 * cliente).
 */
export function computeDogAttention(
  clients: ClientProfile[],
  events: CalendarEvent[],
  sessions: TrainingSession[],
  now: number,
  options: DogAttentionOptions = {},
): DogAttention[] {
  const { includeInactive = true } = options;
  const reference = new Date(now);

  // Conta sessões por cão considerando também os cães de uma aula coletiva,
  // que ficam em `dogSessions` e não no `dogId` da sessão.
  const countByDog = new Map<string, number>();
  const bump = (dogId?: string | null) => {
    if (!dogId) return;
    countByDog.set(dogId, (countByDog.get(dogId) ?? 0) + 1);
  };
  for (const session of sessions) {
    bump(session.dogId);
    for (const dogSession of session.dogSessions ?? []) {
      if (dogSession.dogId && dogSession.dogId !== session.dogId) bump(dogSession.dogId);
    }
  }

  const activeEvents = events.filter(isActiveEvent);
  const list: DogAttention[] = [];

  for (const client of clients) {
    for (const dog of client.dogs) {
      if (!includeInactive && dog.trainingStatus && INACTIVE_DOG_STATUSES.has(dog.trainingStatus)) {
        continue;
      }

      const dogEvents = activeEvents
        .filter((event) => eventIncludesDog(event, dog, client.id))
        .map((event) => ({ event, ts: eventTimestamp(event.day, event.time, reference) }))
        .filter((item): item is { event: CalendarEvent; ts: number } => item.ts !== null);

      const hasUpcoming = dogEvents.some((item) => item.ts >= now && item.ts <= now + 7 * DAY_MS);
      const sessionCount = countByDog.get(dog.id) ?? 0;

      // Aula que já aconteceu na última semana sem nenhum treino registrado.
      const pastWeekEvents = dogEvents.filter(
        (item) => item.ts < now && item.ts >= now - 7 * DAY_MS,
      );
      const missingRecord = pastWeekEvents.length > 0 && sessionCount === 0;

      let level: AttentionLevel;
      let label: string;
      let reason: string;
      if (missingRecord) {
        level = "red";
        label = "Treino sem registro";
        reason = "Teve aula nos últimos 7 dias e o treino ainda não foi registrado.";
      } else if (!hasUpcoming) {
        level = "amber";
        label = "Sem próxima aula";
        reason = "Não há aula marcada para este cão nos próximos 7 dias.";
      } else {
        level = "green";
        label = "Em dia";
        reason = "Tem aula marcada nos próximos 7 dias e nenhum treino atrasado.";
      }

      const sessionsTotal = dog.sessionsTotal ?? 0;
      const progressPct =
        sessionsTotal > 0 ? Math.min(100, Math.round((sessionCount / sessionsTotal) * 100)) : 0;
      const phaseLabel =
        sessionsTotal === 0
          ? "Sem plano"
          : progressPct >= 100
            ? "Formado"
            : progressPct >= 67
              ? "Avançado"
              : progressPct >= 34
                ? "Intermediário"
                : "Inicial";

      list.push({
        clientId: client.id,
        clientName: client.name,
        dog,
        level,
        label,
        reason,
        // O card inteiro leva ao perfil do cão, onde estão histórico e ações.
        href: `/caes/${dog.id}`,
        sessionCount,
        plan: client.plan,
        sessionsTotal,
        progressPct,
        phaseLabel,
      });
    }
  }

  return list.sort((a, b) => ATTENTION_ORDER[a.level] - ATTENTION_ORDER[b.level]);
}
