import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chat
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  // Se passou clientId, retorna o histórico de chat daquele cliente
  if (clientId) {
    const messages = await prisma.portalFeedback.findMany({
      where: {
        trainerId: trainer.id,
        clientId: clientId,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }

  // Senão, retorna a lista de contatos (tutores) ativos do adestrador com a última mensagem
  const clients = await prisma.clientProfile.findMany({
    where: { trainerId: trainer.id },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      dogs: {
        select: {
          name: true,
          breed: true,
        },
      },
    },
  });

  const chatList = await Promise.all(
    clients.map(async (client) => {
      const lastMessage = await prisma.portalFeedback.findFirst({
        where: {
          trainerId: trainer.id,
          clientId: client.id,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        ...client,
        lastMessage: lastMessage ? {
          message: lastMessage.message,
          author: lastMessage.author,
          createdAt: lastMessage.createdAt,
        } : null,
      };
    })
  );

  // Ordenar contatos pela última mensagem recebida/enviada
  chatList.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  return NextResponse.json(chatList);
}

// POST /api/chat
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { clientId: string; message: string };
  if (!body.clientId || !body.message?.trim()) {
    return NextResponse.json({ error: "clientId e message são obrigatórios" }, { status: 400 });
  }

  const createdMessage = await prisma.portalFeedback.create({
    data: {
      trainerId: trainer.id,
      clientId: body.clientId,
      author: "Adestrador",
      message: body.message.trim(),
    },
  });

  return NextResponse.json(createdMessage, { status: 201 });
}
