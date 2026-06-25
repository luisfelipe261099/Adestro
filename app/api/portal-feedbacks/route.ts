import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/portal-feedbacks
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const feedbacks = await prisma.portalFeedback.findMany({
    where: {
      trainerId: trainer.id,
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(feedbacks);
}

// POST /api/portal-feedbacks
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = await request.json() as { message: string; author?: string; clientId?: string };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
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

  const allowedAuthors = new Set(["Tutor", "Adestrador"]);
  const author = allowedAuthors.has(body.author ?? "") ? (body.author as string) : "Tutor";

  const feedback = await prisma.portalFeedback.create({
    data: {
      trainerId: trainer.id,
      clientId: body.clientId ?? null,
      author,
      message:   body.message.trim(),
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
