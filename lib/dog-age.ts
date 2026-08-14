// Idade do cão a partir da data de nascimento.
//
// O adestrador pediu a idade com a unidade menor junto — "1 ano, 8 meses e 12
// dias" — porque em filhote a diferença de semanas muda o protocolo inteiro
// (janela de socialização, troca de dentes, maturidade sexual). Antes o campo
// `age` era texto livre digitado à mão, que envelhecia sozinho no banco: um cão
// cadastrado como "2 meses" continuava "2 meses" um ano depois.
//
// Fonte da verdade é `birthDate` (ISO YYYY-MM-DD). O texto é sempre calculado
// na hora. Quando não há data de nascimento, cai no texto antigo digitado.

export type DogAgeParts = {
  years: number;
  months: number;
  days: number;
  /** Total de dias de vida — usado para decidir se ainda é filhote. */
  totalDays: number;
};

/** Aceita "2024-11-18" e "18/11/2024". Devolve null quando não reconhece. */
export function parseBirthDate(value?: string | null): Date | null {
  const clean = (value ?? "").trim();
  if (!clean) return null;

  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const br = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Soma meses preservando o fim do mês: 31/01 + 1 mês = 28/02, não 03/03.
 * Sem isso a conta de dias fica negativa quando o dia do nascimento não existe
 * no mês de destino (nasceu dia 30, mês de destino é fevereiro).
 */
function addMonths(date: Date, months: number): Date {
  const alvo = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  if (alvo.getDate() !== date.getDate()) {
    // O dia estourou e o JS jogou para o mês seguinte — volta para o último dia.
    alvo.setDate(0);
  }
  return alvo;
}

/**
 * Anos, meses e dias completos entre o nascimento e hoje.
 *
 * Conta por meses de calendário inteiros e mede o resto em dias, em vez de
 * subtrair campo a campo: assim fevereiro, meses de 31 dias e ano bissexto
 * caem certo — é justamente em filhote, onde uma semana muda o protocolo, que
 * o erro apareceria.
 */
export function getDogAgeParts(birthDate?: string | null, now: Date = new Date()): DogAgeParts | null {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  if (birth.getTime() > now.getTime()) return null;

  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalMonths = (hoje.getFullYear() - birth.getFullYear()) * 12 + (hoje.getMonth() - birth.getMonth());
  if (addMonths(birth, totalMonths).getTime() > hoje.getTime()) totalMonths -= 1;
  if (totalMonths < 0) totalMonths = 0;

  const marco = addMonths(birth, totalMonths);
  const days = Math.floor((hoje.getTime() - marco.getTime()) / 86_400_000);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    totalDays: Math.floor((hoje.getTime() - birth.getTime()) / 86_400_000),
  };
}

function plural(valor: number, singular: string, plural_: string): string {
  return `${valor} ${valor === 1 ? singular : plural_}`;
}

/**
 * Texto completo: "1 ano, 8 meses e 12 dias".
 *
 * Partes zeradas somem, menos quando o cão tem menos de um mês — aí o que
 * interessa são justamente os dias.
 */
export function formatDogAge(birthDate?: string | null, fallback?: string | null, now: Date = new Date()): string {
  const partes = getDogAgeParts(birthDate, now);
  if (!partes) return (fallback ?? "").trim();

  const { years, months, days } = partes;
  const pedacos: string[] = [];
  if (years > 0) pedacos.push(plural(years, "ano", "anos"));
  if (months > 0) pedacos.push(plural(months, "mês", "meses"));
  if (days > 0 || pedacos.length === 0) pedacos.push(plural(days, "dia", "dias"));

  if (pedacos.length === 1) return pedacos[0];
  return `${pedacos.slice(0, -1).join(", ")} e ${pedacos[pedacos.length - 1]}`;
}

/** Versão curta para cabeçalho e lista: "1a 8m" (ou "3 meses" em filhote). */
export function formatDogAgeShort(birthDate?: string | null, fallback?: string | null, now: Date = new Date()): string {
  const partes = getDogAgeParts(birthDate, now);
  if (!partes) return (fallback ?? "").trim();
  const { years, months, days } = partes;
  if (years === 0 && months === 0) return plural(days, "dia", "dias");
  if (years === 0) return plural(months, "mês", "meses");
  return months > 0 ? `${years}a ${months}m` : plural(years, "ano", "anos");
}

/** Até 6 meses o protocolo é de filhote — usado para destacar a idade. */
export function isPuppy(birthDate?: string | null, now: Date = new Date()): boolean {
  const partes = getDogAgeParts(birthDate, now);
  if (!partes) return false;
  return partes.totalDays < 183;
}
