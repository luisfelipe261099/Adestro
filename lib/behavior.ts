// Categorias de evolução comportamental (Fase 2 — análise GPT).
// Compartilhado entre o registro de treino, o histórico e a tela de Evolução.
//
// Reestruturado a pedido do adestrador: dois blocos separados (emocional vs
// técnico) e TODAS as escalas com lógica positiva — mais estrelas = melhor.
// "Reatividade" e "Ansiedade" (onde 5 era RUIM) viraram "Estabilidade
// emocional": 5/5 = cão calmo e equilibrado.

export type BehaviorCategory = { key: string; label: string; hint?: string };

export const BEHAVIOR_BLOCKS: Array<{
  key: string;
  title: string;
  subtitle: string;
  categories: BehaviorCategory[];
}> = [
  {
    key: "emocional",
    title: "Estado comportamental & emocional",
    subtitle: "O psicológico do cão — mais estrelas = mais equilibrado",
    categories: [
      {
        key: "estabilidade",
        label: "Estabilidade emocional",
        hint: "Substitui Reatividade/Ansiedade: 5/5 = cão calmo; 1/5 = muito ansioso/reativo",
      },
      { key: "socializacao", label: "Sociabilidade", hint: "Interações amigáveis com cães e pessoas" },
      {
        key: "controleImpulsos",
        label: "Tolerância à frustração & impulsos",
        hint: "Como lida quando não consegue o que quer na hora",
      },
      { key: "independencia", label: "Independência", hint: "Fica bem sozinho — prevenção de ansiedade de separação" },
    ],
  },
  {
    key: "tecnico",
    title: "Habilidades & respostas técnicas",
    subtitle: "Os comandos — respostas de adestramento",
    categories: [
      { key: "foco", label: "Foco & engajamento", hint: "Atenção no condutor mesmo sob distração" },
      { key: "obediencia", label: "Obediência básica", hint: "Senta, deita, fica, junto" },
      { key: "recall", label: "Recall (chamado)", hint: "Resposta ao ser chamado — crucial para segurança" },
      { key: "passeio", label: "Comportamento em passeio", hint: "Andar sem puxar a guia, comportamento na rua" },
    ],
  },
];

export const BEHAVIOR_CATEGORIES: BehaviorCategory[] = BEHAVIOR_BLOCKS.flatMap(
  (block) => block.categories,
);

const LABELS: Record<string, string> = {
  ...Object.fromEntries(BEHAVIOR_CATEGORIES.map((c) => [c.key, c.label])),
  // Chaves antigas que podem existir em registros já salvos — continuam legíveis.
  reatividade: "Reatividade (escala antiga)",
  ansiedade: "Ansiedade (escala antiga)",
};

export function behaviorLabel(key: string): string {
  return LABELS[key] ?? key;
}
