// Rótulos que aparecem em mais de uma tela. Ficam juntos para que a correção
// seja feita uma vez só — "cão(ões)" e "Plano Plano Pro" estavam escritos à mão
// em telas diferentes, e cada uma errava do seu jeito.

/** "Nenhum cão" · "1 cão" · "3 cães" — nunca "1 cão(ões)". */
export function dogCountLabel(count: number): string {
  if (count <= 0) return "Nenhum cão";
  return count === 1 ? "1 cão" : `${count} cães`;
}

/**
 * Nome do plano pronto para exibir.
 *
 * Os planos são cadastrados com nomes livres e muitos já começam com "Plano"
 * ("Plano Pro - 8 aulas"). Prefixar sem checar produzia "Plano Plano Pro".
 */
export function planLabel(plan: string | undefined | null): string {
  const clean = (plan ?? "").trim();
  if (!clean) return "Plano personalizado";
  return /^plano\b/i.test(clean) ? clean : `Plano ${clean}`;
}

/**
 * Progresso do pacote: "4/8 aulas". `null` quando não há pacote contratado —
 * não inventamos denominador.
 */
export function packageProgressLabel(done: number, total: number): string | null {
  if (!total || total <= 0) return null;
  return `${done}/${total} aulas`;
}

/** Passou do que foi contratado — merece aviso, não só um número maior. */
export function isOverPackage(done: number, total: number): boolean {
  return total > 0 && done > total;
}
