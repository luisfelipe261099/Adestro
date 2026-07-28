import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ensureTrainer(userId: string) {
  const existing = await prisma.trainer.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) return null;

  const fallbackName = user.email?.split("@")[0]?.trim() || "Adestrador";

  return prisma.trainer.create({
    data: {
      userId,
      name: user.name?.trim() || fallbackName,
    },
  });
}

// GET /api/events
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const [events, clients] = await Promise.all([
    prisma.calendarEvent.findMany({
      where:   { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
      // Participantes acompanham o evento: numa aula coletiva o vínculo com o
      // cão mora aqui, não em `dogId`. Sem isso os painéis da home tratavam
      // todo cão de turma como "sem próxima aula".
      include: { participants: { select: { dogId: true } } },
    }),
    prisma.clientProfile.findMany({
      where:  { trainerId: trainer.id },
      select: { name: true },
    }),
  ]);

  // Esconde agendamentos órfãos: o cliente foi excluído (a relação usa
  // onDelete:SetNull → clientId vira nulo), mas o evento sobrevive com o nome
  // gravado e continuaria aparecendo na agenda/dashboard. Turmas/coletivos têm
  // `client` vazio e eventos ligados a um cliente atual (clientId preenchido) não
  // são afetados. Rede de segurança para órfãos criados antes do fix do DELETE
  // /api/clients — o registro fica no banco, mas some das telas.
  const currentNames = new Set(clients.map((c) => c.name));
  const visible = events.filter(
    (ev) => !(ev.clientId === null && !!ev.client && !currentNames.has(ev.client)),
  );

  return NextResponse.json(
    visible.map(({ participants, ...event }) => ({
      ...event,
      participantDogIds: participants.map((p) => p.dogId).filter(Boolean),
    })),
  );
}

function addWeeksToDate(dateStr: string, weeks: number): string {
  // Se for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + weeks * 7);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  // Se for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + weeks * 7);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  }

  return dateStr;
}

// POST /api/events
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = await request.json() as {
    clientId?: string;
    dogId?: string;
    day: string;
    time: string;
    dog?: string;
    client?: string;
    plan?: string;
    sessionNumber?: number;
    status?: "Confirmado" | "Pendente" | "Aguardando" | "Recorrente" | "Cancelado";
    recurrence?: "none" | "4weeks" | "8weeks" | "12weeks";
    /** Criar mesmo havendo choque de horário (turma coletiva, encaixe combinado). */
    allowOverlap?: boolean;
  };

  const clientId = body.clientId ? String(body.clientId).trim() : null;
  const dogId = body.dogId ? String(body.dogId).trim() : null;

  let dogName = body.dog ? String(body.dog).trim() : "Turma";
  let clientName = body.client ? String(body.client).trim() : "Coletivo";
  let planName = body.plan ? String(body.plan).trim() : "Aula Coletiva";

  if (clientId && dogId) {
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        clientId,
        client: {
          trainerId: trainer.id,
        },
      },
      select: {
        id: true,
        name: true,
        client: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    if (!dog) {
      return NextResponse.json({ error: "Cliente ou cão inválido para este adestrador" }, { status: 404 });
    }

    dogName = dog.name;
    clientName = dog.client.name;
    planName = body.plan?.trim() || dog.client.plan || "";
  } else {
    // Para agendamentos coletivos, precisamos do nome do evento/turma
    if (!body.dog) {
      return NextResponse.json({ error: "Nome da turma/evento é obrigatório para agendamento coletivo" }, { status: 400 });
    }
  }

  let repeatCount = 1;
  if (body.recurrence === "4weeks") repeatCount = 4;
  else if (body.recurrence === "8weeks") repeatCount = 8;
  else if (body.recurrence === "12weeks") repeatCount = 12;

  const eventsData = [];
  for (let i = 0; i < repeatCount; i++) {
    const eventDay = addWeeksToDate(body.day, i);
    eventsData.push({
      trainerId:     trainer.id,
      clientId,
      dogId,
      day:           eventDay,
      time:          body.time,
      dog:           dogName,
      client:        clientName,
      plan:          planName,
      sessionNumber: (body.sessionNumber ?? 1) + i,
      status:        body.status        ?? "Pendente",
    });
  }

  // Choque de horário: a validação tem de estar aqui, no servidor. Antes existia
  // apenas um banner de aviso na tela, que não impedia nada — dava para criar
  // três aulas no mesmo horário. Toda data gerada pela recorrência é conferida.
  if (!body.allowOverlap) {
    const conflicts = await prisma.calendarEvent.findMany({
      where: {
        trainerId: trainer.id,
        day:       { in: eventsData.map((data) => data.day) },
        time:      body.time,
        NOT:       { status: "Cancelado" },
      },
      select: { day: true, time: true, dog: true, client: true },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Já existe aula marcada neste horário.",
          code: "TIME_CONFLICT",
          conflicts,
        },
        { status: 409 },
      );
    }
  }

  const createdEvents = await Promise.all(
    eventsData.map((data) => prisma.calendarEvent.create({ data }))
  );

  return NextResponse.json(createdEvents[0], { status: 201 });
}


// PATCH /api/events – atualiza status de um evento
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = await request.json() as {
    id: string;
    status?: "Confirmado" | "Pendente" | "Aguardando" | "Recorrente" | "Cancelado";
    day?: string;   // remarcação: nova data
    time?: string;  // remarcação: novo horário
  };

  if (!body.id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  const data: { status?: string; day?: string; time?: string } = {};

  if (body.status !== undefined) {
    const allowedStatuses = new Set(["Confirmado", "Pendente", "Aguardando", "Recorrente", "Cancelado"]);
    if (!allowedStatuses.has(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = body.status;
  }

  // Remarcar: aceita nova data e/ou horário. Ao remarcar, o evento volta a
  // "Pendente" (aguardando nova confirmação do cliente), salvo status explícito.
  if (body.day !== undefined && body.day.trim()) {
    data.day = body.day.trim();
    if (body.status === undefined) data.status = "Pendente";
  }
  if (body.time !== undefined && body.time.trim()) {
    data.time = body.time.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const updated = await prisma.calendarEvent.updateMany({
    where: { id: body.id, trainerId: trainer.id },
    data,
  });

  return NextResponse.json({ ok: updated.count > 0 });
}
