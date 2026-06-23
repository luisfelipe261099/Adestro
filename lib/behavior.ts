// Categorias de evolução comportamental (Fase 2 — análise GPT).
// Compartilhado entre o registro de treino, o histórico e a tela de Evolução.
export const BEHAVIOR_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "obediencia", label: "Obediência" },
  { key: "reatividade", label: "Reatividade" },
  { key: "socializacao", label: "Socialização" },
  { key: "ansiedade", label: "Ansiedade" },
  { key: "passeio", label: "Passeio" },
  { key: "recall", label: "Recall" },
  { key: "controleImpulsos", label: "Controle de impulsos" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  BEHAVIOR_CATEGORIES.map((c) => [c.key, c.label]),
);

export function behaviorLabel(key: string): string {
  return LABELS[key] ?? key;
}
