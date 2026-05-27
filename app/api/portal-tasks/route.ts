import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/portal-tasks
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const tasks = await prisma.portalTask.findMany({
    where: {
      trainerId: trainer.id,
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

// POST /api/portal-tasks
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = await request.json() as { title: string; description?: string; clientId?: string };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  if (body.clientId) {
    const client = await prisma.clientProfile.findFirst({
      where: { id: body.clientId, trainerId: trainer.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
  }

  const task = await prisma.portalTask.create({
    data: {
      trainerId:   trainer.id,
      clientId:    body.clientId ?? null,
      title:       body.title.trim(),
      description: body.description?.trim() ?? null,
      completed:   false,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

// PATCH /api/portal-tasks – alterna completed
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = await request.json() as { id: string; completed: boolean };

  const updated = await prisma.portalTask.updateMany({
    where: { id: body.id, trainerId: trainer.id },
    data: { completed: body.completed },
  });

  return NextResponse.json({ ok: updated.count > 0 });
}

// DELETE /api/portal-tasks
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  const deleted = await prisma.portalTask.deleteMany({
    where: { id, trainerId: trainer.id },
  });

  return NextResponse.json({ ok: deleted.count > 0 });
}
