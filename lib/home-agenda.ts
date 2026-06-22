// Helpers puros para a home escolher e rotular a "próxima sessão".
//
// O campo `CalendarEvent.day` é heterogêneo: pode ser uma data ISO
// ("2026-06-22"), uma data "dd/mm/yyyy", ou o nome de um dia da semana
// ("Segunda", para aulas recorrentes). Estas funções espelham a lógica de
// `parseEventDate`/`isEventOnDate` de `app/agenda/page.tsx` sem precisar alterar
// a agenda — mantemos uma cópia pequena e pura aqui.

const WEEKDAYS_LOWER = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Resolve um `day` (data ISO, dd/mm/yyyy ou nome de dia da semana) para
 * `YYYY-MM-DD`. Para nomes de dia da semana, retorna a próxima ocorrência
 * (o próprio dia de hoje conta).
 */
export function resolveEventDate(day: string, now: Date = new Date()): string {
  const clean = day.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/");
    return `${y}-${m}-${d}`;
  }
  const idx = WEEKDAYS_LOWER.findIndex((name) => clean.toLowerCase().includes(name));
  const base = startOfDay(now);
  if (idx >= 0) {
    const diff = (idx - base.getDay() + 7) % 7;
    base.setDate(base.getDate() + diff);
  }
  return ymd(base);
}

/** Timestamp (ms) combinando data resolvida + hora, para ordenar/comparar. */
export function eventTimestamp(day: string, time: string, now: Date = new Date()): number {
  const [y, m, d] = resolveEventDate(day, now).split("-").map(Number);
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  const hh = match ? Number(match[1]) : 0;
  const mm = match ? Number(match[2]) : 0;
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/** Rótulo humano: "Hoje", "Amanhã", dia da semana (próximos 7 dias) ou "dd/mm". */
export function relativeDayLabel(day: string, now: Date = new Date()): string {
  const [y, m, d] = resolveEventDate(day, now).split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = startOfDay(now);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays > 1 && diffDays < 7) return WEEKDAYS_LABEL[target.getDay()];
  return target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
