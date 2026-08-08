// Árvore de seleção de treino — Categoria > Área > Exercício.
//
// Conceito único: "Exercícios Trabalhados". Acabou a separação
// Atividade/Comando: cada item da árvore é um exercício e a avaliação por
// estrelas (1-5) fica SEMPRE no 3º nível (o exercício), nunca na Categoria nem
// na Área.
//
// A hierarquia existe no banco (Categories → Areas → Exercises) porque é o
// jeito certo de guardar e de gerar relatório agrupado. Na tela ela NÃO vira
// três toques: a lista mostra os exercícios direto como botões, com a
// categoria/área servindo só de filtro e agrupador visual.
//
// Este arquivo é a fonte da verdade do catálogo padrão. O banco é semeado a
// partir daqui (lib/exercise-catalog.ts) e os exercícios criados pelo
// adestrador ("+ Outro") entram como linhas novas na mesma tabela — sem mexer
// no schema.

// Cores dos cards do design system (globals.css) — uma por categoria, para o
// olho separar o assunto antes de ler.
export type ExerciseTone = "blue" | "sky" | "green" | "orange" | "purple";

/**
 * Variáveis CSS de cada tom. O Tailwind não gera classe com nome dinâmico,
 * então a cor da categoria entra por style inline a partir daqui.
 */
export const EXERCISE_TONE_VARS: Record<ExerciseTone, { fg: string; bg: string; border: string }> = {
  blue: { fg: "var(--card-blue)", bg: "var(--card-blue-bg)", border: "var(--card-blue-border)" },
  sky: { fg: "var(--card-sky)", bg: "var(--card-sky-bg)", border: "var(--card-sky-border)" },
  green: { fg: "var(--card-green)", bg: "var(--card-green-bg)", border: "var(--card-green-border)" },
  orange: { fg: "var(--card-orange)", bg: "var(--card-orange-bg)", border: "var(--card-orange-border)" },
  purple: { fg: "var(--card-purple)", bg: "var(--card-purple-bg)", border: "var(--card-purple-border)" },
};

export type CatalogExercise = {
  /** Chave estável: "categoria.area.exercicio". */
  key: string;
  name: string;
  order: number;
  /** id da linha em `Exercise` quando o catálogo vem do banco. */
  id?: string;
  /** Criado pelo adestrador via "+ Outro". */
  custom?: boolean;
};

export type CatalogArea = {
  /** Chave estável: "categoria.area". */
  key: string;
  name: string;
  order: number;
  exercises: CatalogExercise[];
};

export type CatalogCategory = {
  key: string;
  name: string;
  tone: ExerciseTone;
  order: number;
  areas: CatalogArea[];
};

/**
 * Exercício marcado numa sessão. Guarda o caminho completo (categoria/área)
 * como cópia, não como referência: se o catálogo mudar depois, o histórico e os
 * relatórios continuam mostrando o que foi realmente trabalhado naquele dia.
 */
export type SessionExercise = {
  key: string;
  name: string;
  areaKey: string;
  areaName: string;
  categoryKey: string;
  categoryName: string;
  /** 1 a 5 estrelas — a avaliação vive aqui, no 3º nível. */
  rating: number;
  notes: string;
  exerciseId?: string;
  custom?: boolean;
};

// ─── Catálogo padrão ─────────────────────────────────────────────────────────

type RawCategory = {
  key: string;
  name: string;
  tone: ExerciseTone;
  areas: Array<{ key: string; name: string; exercises: string[] }>;
};

const RAW_TREE: RawCategory[] = [
  {
    key: "fundamentos",
    name: "Fundamentos",
    tone: "blue",
    areas: [
      { key: "foco", name: "Foco", exercises: ["Nome", "Contato visual", "Check-in", "Ignorar distrações"] },
      {
        key: "engajamento",
        name: "Engajamento",
        exercises: ["Seguir condutor", "Proximidade", "Motivação para treino"],
      },
      {
        key: "controle-impulsos",
        name: "Controle de Impulsos",
        exercises: ["Espera", "Porta/Portão", "Comida", "Liberação"],
      },
      { key: "marcadores", name: "Marcadores", exercises: ["Clicker", "Marcador verbal"] },
    ],
  },
  {
    key: "obediencia",
    name: "Obediência",
    tone: "sky",
    areas: [
      { key: "posicoes", name: "Posições", exercises: ["Senta", "Deita", "Em pé"] },
      { key: "permanencia", name: "Permanência", exercises: ["Fica", "Distância", "Duração"] },
      {
        key: "caminhada",
        name: "Caminhada",
        exercises: ["Junto", "Caminhada estruturada", "Sem puxar guia"],
      },
      { key: "chamado", name: "Chamado", exercises: ["Recall", "Recall com distrações"] },
      { key: "direcionamento", name: "Direcionamento", exercises: ["Vem", "Lugar", "Place"] },
      { key: "liberacao", name: "Liberação", exercises: ["Solta", "Deixa", "Fora"] },
    ],
  },
  {
    key: "socializacao",
    name: "Socialização",
    tone: "green",
    areas: [
      { key: "pessoas", name: "Pessoas", exercises: ["Adultos", "Crianças", "Estranhos"] },
      {
        key: "caes",
        name: "Cães",
        exercises: ["Observação", "Interação controlada", "Neutralidade"],
      },
      { key: "ambientes", name: "Ambientes", exercises: ["Rua", "Praça", "Pet Shop", "Veterinário"] },
      { key: "estimulos", name: "Estímulos", exercises: ["Sons", "Veículos", "Objetos"] },
    ],
  },
  {
    key: "comportamento",
    name: "Comportamento",
    tone: "orange",
    areas: [
      { key: "reatividade", name: "Reatividade", exercises: ["Pessoas", "Cães", "Veículos"] },
      { key: "medos", name: "Medos", exercises: ["Sons", "Ambientes", "Objetos"] },
      { key: "ansiedade", name: "Ansiedade", exercises: ["Separação", "Excitação"] },
      { key: "convivencia", name: "Convivência", exercises: ["Pular", "Latir", "Mordiscar", "Visitas"] },
    ],
  },
  {
    key: "manejo",
    name: "Manejo & Rotina",
    tone: "purple",
    areas: [
      { key: "acomodacao", name: "Acomodação", exercises: ["Caixa de transporte / Toca"] },
      { key: "cuidados", name: "Cuidados", exercises: ["Manuseio veterinário", "Higiene"] },
      { key: "equipamentos", name: "Equipamentos", exercises: ["Habituação à focinheira", "Guia"] },
      { key: "rotina", name: "Rotina", exercises: ["Necessidades no lugar certo"] },
    ],
  },
];

/** "Ignorar distrações" -> "ignorar-distracoes". Base das chaves de exercício. */
export function slugifyExercise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const EXERCISE_TREE: CatalogCategory[] = RAW_TREE.map((category, categoryIndex) => ({
  key: category.key,
  name: category.name,
  tone: category.tone,
  order: categoryIndex,
  areas: category.areas.map((area, areaIndex) => {
    const areaKey = `${category.key}.${area.key}`;
    return {
      key: areaKey,
      name: area.name,
      order: areaIndex,
      exercises: area.exercises.map((name, exerciseIndex) => ({
        key: `${areaKey}.${slugifyExercise(name)}`,
        name,
        order: exerciseIndex,
      })),
    };
  }),
}));

/** Chave do exercício criado pelo adestrador dentro de uma área. */
export function customExerciseKey(areaKey: string, name: string): string {
  return `${areaKey}.custom-${slugifyExercise(name)}`;
}

// ─── Navegação no catálogo ───────────────────────────────────────────────────

export type FlatExercise = {
  exercise: CatalogExercise;
  area: CatalogArea;
  category: CatalogCategory;
};

/** Todos os exercícios numa lista só — é assim que a tela desenha os botões. */
export function flattenCatalog(tree: CatalogCategory[] = EXERCISE_TREE): FlatExercise[] {
  return tree.flatMap((category) =>
    category.areas.flatMap((area) =>
      area.exercises.map((exercise) => ({ exercise, area, category })),
    ),
  );
}

export function findCatalogExercise(
  key: string,
  tree: CatalogCategory[] = EXERCISE_TREE,
): FlatExercise | undefined {
  return flattenCatalog(tree).find((item) => item.exercise.key === key);
}

export function categoryTone(categoryKey: string, tree: CatalogCategory[] = EXERCISE_TREE): ExerciseTone {
  return tree.find((category) => category.key === categoryKey)?.tone ?? "blue";
}

/** Monta o registro da sessão a partir de um item do catálogo. */
export function toSessionExercise(item: FlatExercise, rating = 3, notes = ""): SessionExercise {
  return {
    key: item.exercise.key,
    name: item.exercise.name,
    areaKey: item.area.key,
    areaName: item.area.name,
    categoryKey: item.category.key,
    categoryName: item.category.name,
    rating,
    notes,
    exerciseId: item.exercise.id,
    custom: item.exercise.custom,
  };
}

// ─── Relatório: agrupamento por categoria ────────────────────────────────────

export type ExerciseCategoryGroup = {
  categoryKey: string;
  categoryName: string;
  tone: ExerciseTone;
  items: SessionExercise[];
  /** Média das estrelas dos exercícios da categoria (1 casa decimal). */
  average: number;
};

/**
 * Agrupa os exercícios marcados por Categoria — o resumo que vai pro tutor sai
 * daqui, sem o adestrador precisar organizar nada na mão.
 */
export function groupExercisesByCategory(
  items: SessionExercise[],
  tree: CatalogCategory[] = EXERCISE_TREE,
): ExerciseCategoryGroup[] {
  const groups = new Map<string, ExerciseCategoryGroup>();

  for (const item of items) {
    const key = item.categoryKey || "outros";
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      categoryKey: key,
      categoryName: item.categoryName || "Outros",
      tone: categoryTone(key, tree),
      items: [item],
      average: 0,
    });
  }

  const order = new Map(tree.map((category, index) => [category.key, index]));

  return Array.from(groups.values())
    .map((group) => ({ ...group, average: averageRating(group.items) }))
    .sort((a, b) => (order.get(a.categoryKey) ?? 99) - (order.get(b.categoryKey) ?? 99));
}

export type ExerciseCategorySummary = {
  categoryKey: string;
  categoryName: string;
  tone: ExerciseTone;
  /** Média das estrelas da categoria no período. */
  average: number;
  /** Quantas marcações entraram na média. */
  count: number;
  exercises: Array<{ name: string; average: number; count: number }>;
};

/**
 * Resumo do período por categoria — é isso que o relatório mensal e o resumo
 * do tutor mostram. Junta as repetições do mesmo exercício numa média só.
 */
export function summarizeExercisesByCategory(
  items: SessionExercise[],
  tree: CatalogCategory[] = EXERCISE_TREE,
): ExerciseCategorySummary[] {
  return groupExercisesByCategory(items, tree).map((group) => {
    const byName = new Map<string, { total: number; count: number }>();
    for (const item of group.items) {
      const current = byName.get(item.name) ?? { total: 0, count: 0 };
      current.total += item.rating;
      current.count += 1;
      byName.set(item.name, current);
    }

    return {
      categoryKey: group.categoryKey,
      categoryName: group.categoryName,
      tone: group.tone,
      average: group.average,
      count: group.items.length,
      exercises: Array.from(byName.entries())
        .map(([name, value]) => ({
          name,
          average: Math.round((value.total / value.count) * 10) / 10,
          count: value.count,
        }))
        .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name)),
    };
  });
}

export function averageRating(items: SessionExercise[]): number {
  const rated = items.filter((item) => Number.isFinite(item.rating) && item.rating > 0);
  if (!rated.length) return 0;
  const total = rated.reduce((sum, item) => sum + item.rating, 0);
  return Math.round((total / rated.length) * 10) / 10;
}

// ─── Compatibilidade com os registros antigos ────────────────────────────────

export type LegacyActivity = { name?: string; completed?: boolean; notes?: string };
export type LegacyCommand = { command?: string; rating?: number; notes?: string };

/** JSON de coluna do banco -> lista, sem estourar quando o campo está vazio. */
export function parseJsonList<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Lista de exercícios de um registro do banco (colunas JSON), no formato novo
 * ou convertida do antigo. Ponto único de leitura dos relatórios e do portal.
 */
export function sessionExercisesOf(record: {
  exercises?: string | null;
  activities?: string | null;
  commands?: string | null;
}): SessionExercise[] {
  const saved = parseSessionExercises(parseJsonList(record.exercises));
  if (saved.length) return saved;
  return legacyToSessionExercises(
    parseJsonList<LegacyActivity>(record.activities),
    parseJsonList<LegacyCommand>(record.commands),
  );
}

/** Mesma leitura, para quando o registro já veio com os campos desserializados. */
export function sessionExercisesFromParsed(record: {
  exercises?: unknown;
  activities?: LegacyActivity[];
  commands?: LegacyCommand[];
}): SessionExercise[] {
  const saved = parseSessionExercises(record.exercises);
  if (saved.length) return saved;
  return legacyToSessionExercises(record.activities, record.commands);
}

/**
 * Projeção do formato antigo (`commands`), mantida para o portal do tutor, os
 * relatórios e a IA continuarem lendo o mesmo campo de sempre enquanto a base
 * tem sessões dos dois formatos.
 */
export function toLegacyCommands(
  items: SessionExercise[],
): Array<{ command: string; rating: number; notes: string }> {
  return items.map((item) => ({ command: item.name, rating: item.rating, notes: item.notes ?? "" }));
}

/**
 * Converte um registro antigo (atividades + comandos) em exercícios, casando
 * pelo nome com o catálogo. O que não casa vira item avulso — nada se perde ao
 * abrir um treino antigo para edição ou ao montar o relatório do mês.
 */
export function legacyToSessionExercises(
  activities: LegacyActivity[] | undefined,
  commands: LegacyCommand[] | undefined,
  tree: CatalogCategory[] = EXERCISE_TREE,
): SessionExercise[] {
  const flat = flattenCatalog(tree);
  const byName = new Map(flat.map((item) => [item.exercise.name.toLowerCase(), item]));
  const result: SessionExercise[] = [];
  const seen = new Set<string>();

  const push = (name: string, rating: number, notes: string) => {
    const clean = (name ?? "").trim();
    if (!clean) return;
    const match = byName.get(clean.toLowerCase());
    const key = match ? match.exercise.key : `legado.${slugifyExercise(clean)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(
      match
        ? toSessionExercise(match, rating, notes)
        : {
            key,
            name: clean,
            areaKey: "legado.itens",
            areaName: "Registros anteriores",
            categoryKey: "legado",
            categoryName: "Registros anteriores",
            rating,
            notes,
            custom: true,
          },
    );
  };

  for (const command of commands ?? []) {
    push(command?.command ?? "", clampRating(command?.rating ?? 3), command?.notes ?? "");
  }
  // Atividades antigas não tinham estrela: "feito" vira 4, "não feito" vira 2 —
  // o suficiente para o gráfico do relatório não ficar vazio no histórico.
  for (const activity of activities ?? []) {
    push(activity?.name ?? "", activity?.completed ? 4 : 2, activity?.notes ?? "");
  }

  return result;
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

/** Normaliza o que veio do banco/JSON antes de usar na tela ou no relatório. */
export function parseSessionExercises(raw: unknown): SessionExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      key: String(item.key ?? ""),
      name: String(item.name ?? ""),
      areaKey: String(item.areaKey ?? ""),
      areaName: String(item.areaName ?? ""),
      categoryKey: String(item.categoryKey ?? ""),
      categoryName: String(item.categoryName ?? ""),
      rating: clampRating(Number(item.rating ?? 3)),
      notes: typeof item.notes === "string" ? item.notes : "",
      exerciseId: typeof item.exerciseId === "string" ? item.exerciseId : undefined,
      custom: Boolean(item.custom),
    }))
    .filter((item) => item.key && item.name);
}

export const EXERCISE_TREE_TOTALS = {
  categories: EXERCISE_TREE.length,
  areas: EXERCISE_TREE.reduce((sum, category) => sum + category.areas.length, 0),
  exercises: flattenCatalog(EXERCISE_TREE).length,
};
