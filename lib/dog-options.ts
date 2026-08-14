// Listas do cadastro do cão: comportamento e foco do adestramento.
//
// As opções vieram do adestrador e são a linguagem que ele usa no dia a dia.
// "Outros" não é um valor guardado: quem escolhe digita o novo item, que entra
// na lista **daquele adestrador** e passa a aparecer nos próximos cadastros —
// sem alteração de schema, guardado junto dos demais modelos dele.

export const BEHAVIOR_OPTIONS = [
  "Sociável",
  "Reservado",
  "Reativo - Medo - Fuga",
  "Reativo - Medo - Agressivo",
  "Agressivo",
] as const;

export const TRAINING_FOCUS_OPTIONS = [
  "Obediência Básica",
  "Modificação Comportamental",
  "Socialização e Filhotes",
  "Foco e Autocontrole",
  "Cães de Trabalho e Serviço",
] as const;

/** Rótulo da opção que abre o campo livre. */
export const OTHER_OPTION = "Outros";

/**
 * Junta a lista padrão com o que o adestrador já criou, sem repetir e sem
 * perder a ordem de quem veio primeiro.
 */
export function mergeOptions(padrao: readonly string[], doAdestrador?: string[] | null): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const item of [...padrao, ...(doAdestrador ?? [])]) {
    const limpo = (item ?? "").trim();
    if (!limpo) continue;
    const chave = limpo.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(limpo);
  }
  return saida;
}

/**
 * Acrescenta um item digitado no "Outros". Devolve a lista nova do adestrador
 * (só o que é dele — o padrão não é reescrito) ou `null` quando não há nada a
 * salvar: vazio, repetido ou já presente no padrão.
 */
export function addCustomOption(
  padrao: readonly string[],
  doAdestrador: string[] | null | undefined,
  novo: string,
): string[] | null {
  const limpo = (novo ?? "").trim().slice(0, 60);
  if (!limpo) return null;
  const existentes = mergeOptions(padrao, doAdestrador);
  if (existentes.some((item) => item.toLowerCase() === limpo.toLowerCase())) return null;
  return [...(doAdestrador ?? []), limpo];
}
