import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Garante que o cão pertence ao adestrador autenticado.
async function dogBelongsToTrainer(dogId: string, trainerId: string) {
  const dog = await prisma.dog.findFirst({
    where: { id: dogId, client: { trainerId } },
    select: { id: true },
  });
  return Boolean(dog);
}

async function getTrainer(userId: string) {
  return prisma.trainer.findUnique({ where: { userId } });
}

function authzRole(session: Awaited<ReturnType<typeof auth>>) {
  return ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
}

// GET /api/relatorios?dogId=...  → lista relatórios salvos (do cão ou de todos)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const dogId = searchParams.get("dogId");

  const reports = await prisma.evolutionReport.findMany({
    where: { trainerId: trainer.id, ...(dogId ? { dogId } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      dogId: r.dogId,
      month: r.month,
      status: r.status,
      sentAt: r.sentAt,
      updatedAt: r.updatedAt,
      content: safeParse(r.content),
    })),
  );
}

// POST /api/relatorios  → salva (upsert por cão+mês) um relatório editado
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    dogId?: string;
    month?: string;
    status?: string;
    content?: unknown;
  };

  if (!body.dogId || !body.month || body.content === undefined) {
    return NextResponse.json({ error: "dogId, month e content são obrigatórios" }, { status: 400 });
  }
  if (!(await dogBelongsToTrainer(body.dogId, trainer.id))) {
    return NextResponse.json({ error: "Cão inválido para este adestrador" }, { status: 403 });
  }

  const allowed = new Set(["Rascunho", "Aguardando", "Enviado"]);
  const status = allowed.has(body.status ?? "") ? (body.status as string) : "Rascunho";
  const contentJson = JSON.stringify(body.content).slice(0, 200_000);

  // Upsert manual por (trainer, dog, month) — sem unique composto no schema.
  const existing = await prisma.evolutionReport.findFirst({
    where: { trainerId: trainer.id, dogId: body.dogId, month: body.month },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.evolutionReport.update({
        where: { id: existing.id },
        data: { content: contentJson, status, sentAt: status === "Enviado" ? new Date() : null },
      })
    : await prisma.evolutionReport.create({
        data: {
          trainerId: trainer.id,
          dogId: body.dogId,
          month: body.month,
          content: contentJson,
          status,
          sentAt: status === "Enviado" ? new Date() : null,
        },
      });

  return NextResponse.json({ id: saved.id, status: saved.status, month: saved.month });
}

// PATCH /api/relatorios  → muda só o status (ex.: marcar como Enviado)
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { id?: string; status?: string };
  const allowed = new Set(["Rascunho", "Aguardando", "Enviado"]);
  if (!body.id || !allowed.has(body.status ?? "")) {
    return NextResponse.json({ error: "id e status válido são obrigatórios" }, { status: 400 });
  }

  const updated = await prisma.evolutionReport.updateMany({
    where: { id: body.id, trainerId: trainer.id },
    data: { status: body.status, sentAt: body.status === "Enviado" ? new Date() : null },
  });

  return NextResponse.json({ ok: updated.count > 0 });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
