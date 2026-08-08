import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  archiveTrainerExercise,
  createTrainerExercise,
  loadExerciseCatalog,
} from "@/lib/exercise-catalog";
import { EXERCISE_TREE } from "@/lib/exercise-tree";

type TrainerContext =
  | { trainer: { id: string }; error: null }
  | { trainer: null; error: NextResponse };

async function currentTrainer(): Promise<TrainerContext> {
  const session = await auth();
  if (!session?.user?.id) {
    return { trainer: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return { trainer: null, error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) {
    return { trainer: null, error: NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 }) };
  }

  return { trainer, error: null };
}

// GET /api/exercises — árvore Categoria > Área > Exercício (padrão + os do adestrador).
export async function GET() {
  const { trainer, error } = await currentTrainer();
  if (error) return error;

  try {
    const categories = await loadExerciseCatalog(trainer.id);
    return NextResponse.json({ categories });
  } catch {
    // Banco fora do ar ou catálogo ainda não semeado: a tela continua usável
    // com a árvore padrão do código (só não terá os exercícios personalizados).
    return NextResponse.json({ categories: EXERCISE_TREE, fallback: true });
  }
}

// POST /api/exercises — "+ Outro": exercício novo dentro de uma Área.
export async function POST(request: Request) {
  const { trainer, error } = await currentTrainer();
  if (error) return error;

  const body = (await request.json()) as { areaKey?: string; name?: string };
  const areaKey = (body.areaKey ?? "").trim();
  const name = (body.name ?? "").trim();

  if (!areaKey || !name) {
    return NextResponse.json({ error: "Área e nome do exercício são obrigatórios" }, { status: 400 });
  }

  const created = await createTrainerExercise(trainer.id, areaKey, name);
  if (!created) return NextResponse.json({ error: "Área não encontrada" }, { status: 404 });

  return NextResponse.json({ exercise: created }, { status: 201 });
}

// DELETE /api/exercises?id=... — arquiva um exercício criado pelo adestrador.
export async function DELETE(request: Request) {
  const { trainer, error } = await currentTrainer();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const archived = await archiveTrainerExercise(trainer.id, id);
  if (!archived) {
    return NextResponse.json({ error: "Exercício não encontrado ou é do catálogo padrão" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
