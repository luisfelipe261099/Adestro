import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function authzRole(session: Awaited<ReturnType<typeof auth>>) {
  return ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
}

async function getTrainer(userId: string) {
  return prisma.trainer.findUnique({ where: { userId } });
}

// Confirma que o evento pertence ao adestrador autenticado.
async function eventBelongsToTrainer(eventId: string, trainerId: string) {
  const ev = await prisma.calendarEvent.findFirst({ where: { id: eventId, trainerId }, select: { id: true } });
  return Boolean(ev);
}

// GET /api/events/participants?eventId=...
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });
  if (!(await eventBelongsToTrainer(eventId, trainer.id))) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 403 });
  }

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(participants);
}

// POST /api/events/participants  { eventId, dogId } → adiciona um cão à turma
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { eventId?: string; dogId?: string };
  if (!body.eventId || !body.dogId) {
    return NextResponse.json({ error: "eventId e dogId são obrigatórios" }, { status: 400 });
  }
  if (!(await eventBelongsToTrainer(body.eventId, trainer.id))) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 403 });
  }

  // Resolve cão/tutor garantindo que pertencem ao adestrador.
  const dog = await prisma.dog.findFirst({
    where: { id: body.dogId, client: { trainerId: trainer.id } },
    select: { id: true, name: true, client: { select: { id: true, name: true } } },
  });
  if (!dog) return NextResponse.json({ error: "Cão inválido para este adestrador" }, { status: 403 });

  // Evita duplicar o mesmo cão na mesma turma.
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId: body.eventId, dogId: dog.id },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Cão já está na turma" }, { status: 409 });

  const created = await prisma.eventParticipant.create({
    data: {
      eventId: body.eventId,
      dogId: dog.id,
      clientId: dog.client.id,
      dogName: dog.name,
      clientName: dog.client.name,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

// PATCH /api/events/participants  { id, status } → confirma/recusa um cão
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { id?: string; status?: string };
  const allowed = new Set(["Pendente", "Confirmado", "Recusado"]);
  if (!body.id || !allowed.has(body.status ?? "")) {
    return NextResponse.json({ error: "id e status válido são obrigatórios" }, { status: 400 });
  }

  // updateMany com filtro pelo evento do adestrador garante o escopo.
  const updated = await prisma.eventParticipant.updateMany({
    where: { id: body.id, event: { trainerId: trainer.id } },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: updated.count > 0 });
}

// DELETE /api/events/participants  { id } → remove um cão da turma
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (authzRole(session) !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const trainer = await getTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const deleted = await prisma.eventParticipant.deleteMany({
    where: { id: body.id, event: { trainerId: trainer.id } },
  });
  return NextResponse.json({ ok: deleted.count > 0 });
}
