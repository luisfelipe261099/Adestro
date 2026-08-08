// Catálogo de exercícios no banco — Categoria > Área > Exercício.
//
// O padrão vem de lib/exercise-tree.ts e é semeado na primeira leitura (e
// re-semeado quando a árvore do código ganha itens novos). Os exercícios que o
// adestrador cria no "+ Outro" ficam na mesma tabela, marcados com o trainerId.

import { prisma } from "@/lib/prisma";
import {
  EXERCISE_TREE,
  EXERCISE_TREE_TOTALS,
  customExerciseKey,
  type CatalogCategory,
  type ExerciseTone,
} from "@/lib/exercise-tree";

const DEFAULT_TRAINER_ID = ""; // catálogo padrão (sem dono)

// Evita as consultas de verificação a cada request do mesmo processo.
let seedPromise: Promise<void> | null = null;

/**
 * Duas instâncias podem semear ao mesmo tempo e disputar a mesma chave única.
 * P2002 aqui significa "o outro processo já criou" — não é erro.
 */
async function ignoreDuplicate<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return null;
    throw error;
  }
}

async function seedCatalog(): Promise<void> {
  for (const category of EXERCISE_TREE) {
    const savedCategory =
      (await ignoreDuplicate(() =>
        prisma.exerciseCategory.upsert({
          where: { key: category.key },
          update: { name: category.name, tone: category.tone, order: category.order },
          create: { key: category.key, name: category.name, tone: category.tone, order: category.order },
        }),
      )) ?? (await prisma.exerciseCategory.findUnique({ where: { key: category.key } }));
    if (!savedCategory) continue;

    for (const area of category.areas) {
      const savedArea =
        (await ignoreDuplicate(() =>
          prisma.exerciseArea.upsert({
            where: { key: area.key },
            update: { name: area.name, order: area.order, categoryId: savedCategory.id },
            create: {
              key: area.key,
              name: area.name,
              order: area.order,
              categoryId: savedCategory.id,
            },
          }),
        )) ?? (await prisma.exerciseArea.findUnique({ where: { key: area.key } }));
      if (!savedArea) continue;

      for (const exercise of area.exercises) {
        await ignoreDuplicate(() =>
          prisma.exercise.upsert({
            where: {
              areaId_trainerId_key: {
                areaId: savedArea.id,
                trainerId: DEFAULT_TRAINER_ID,
                key: exercise.key,
              },
            },
            update: { name: exercise.name, order: exercise.order, archived: false },
            create: {
              areaId: savedArea.id,
              trainerId: DEFAULT_TRAINER_ID,
              key: exercise.key,
              name: exercise.name,
              order: exercise.order,
            },
          }),
        );
      }
    }
  }
}

/**
 * Garante que o catálogo padrão existe no banco. Idempotente: só escreve quando
 * a contagem do banco não bate com a árvore do código (deploy que adicionou
 * exercícios novos, banco recém-criado).
 */
export async function ensureExerciseCatalog(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [categories, areas, exercises] = await Promise.all([
        prisma.exerciseCategory.count(),
        prisma.exerciseArea.count(),
        prisma.exercise.count({ where: { trainerId: DEFAULT_TRAINER_ID } }),
      ]);

      const upToDate =
        categories === EXERCISE_TREE_TOTALS.categories &&
        areas === EXERCISE_TREE_TOTALS.areas &&
        exercises === EXERCISE_TREE_TOTALS.exercises;

      if (!upToDate) await seedCatalog();
    })().catch((error) => {
      seedPromise = null; // permite nova tentativa no próximo request
      throw error;
    });
  }
  return seedPromise;
}

/**
 * Árvore completa para o adestrador: catálogo padrão + os exercícios que ele
 * criou. Ordenada por categoria > área > exercício, com os personalizados no
 * fim de cada área.
 */
export async function loadExerciseCatalog(trainerId: string): Promise<CatalogCategory[]> {
  await ensureExerciseCatalog();

  const categories = await prisma.exerciseCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      areas: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            where: { archived: false, trainerId: { in: [DEFAULT_TRAINER_ID, trainerId] } },
            orderBy: [{ trainerId: "asc" }, { order: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  return categories.map((category) => ({
    key: category.key,
    name: category.name,
    tone: (category.tone || "blue") as ExerciseTone,
    order: category.order,
    areas: category.areas.map((area) => ({
      key: area.key,
      name: area.name,
      order: area.order,
      exercises: area.exercises.map((exercise) => ({
        id: exercise.id,
        key: exercise.key,
        name: exercise.name,
        order: exercise.order,
        custom: exercise.trainerId !== DEFAULT_TRAINER_ID,
      })),
    })),
  }));
}

export type CreatedExercise = {
  id: string;
  key: string;
  name: string;
  areaKey: string;
  areaName: string;
  categoryKey: string;
  categoryName: string;
};

/**
 * "+ Outro": cria um exercício do adestrador dentro de uma Área existente.
 * Repetir o mesmo nome devolve o exercício que já existe em vez de duplicar.
 */
export async function createTrainerExercise(
  trainerId: string,
  areaKey: string,
  name: string,
): Promise<CreatedExercise | null> {
  await ensureExerciseCatalog();

  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) return null;

  const area = await prisma.exerciseArea.findUnique({
    where: { key: areaKey },
    include: { category: true },
  });
  if (!area) return null;

  const key = customExerciseKey(area.key, cleanName);

  // Já existe no catálogo padrão desta área? Reaproveita em vez de criar cópia.
  const standard = await prisma.exercise.findFirst({
    where: { areaId: area.id, trainerId: DEFAULT_TRAINER_ID, name: cleanName, archived: false },
  });
  const existing =
    standard ??
    (await prisma.exercise.upsert({
      where: { areaId_trainerId_key: { areaId: area.id, trainerId, key } },
      update: { name: cleanName, archived: false },
      create: { areaId: area.id, trainerId, key, name: cleanName, order: 900 },
    }));

  return {
    id: existing.id,
    key: existing.key,
    name: existing.name,
    areaKey: area.key,
    areaName: area.name,
    categoryKey: area.category.key,
    categoryName: area.category.name,
  };
}

/** Arquiva um exercício criado pelo próprio adestrador (o padrão nunca some). */
export async function archiveTrainerExercise(trainerId: string, exerciseId: string): Promise<boolean> {
  const result = await prisma.exercise.updateMany({
    where: { id: exerciseId, trainerId },
    data: { archived: true },
  });
  return result.count > 0;
}
