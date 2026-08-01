import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/sessions
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const sessions = await prisma.trainingSession.findMany({
    where: { trainerId: trainer.id },
    include: {
      dogSessions: {
        include: {
          dog: {
            select: {
              name: true,
              breed: true,
              photoUrl: true,
              clientId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      ...s,
      notes: JSON.parse(s.notes || "[]"),
      media: JSON.parse(s.media || "[]"),
      dogSessions: s.dogSessions.map((ds) => ({
        ...ds,
        activities: JSON.parse(ds.activities || "[]"),
        commands: JSON.parse(ds.commands || "[]"),
        media: JSON.parse(ds.media || "[]"),
        nextCommands: JSON.parse(ds.nextCommands || "[]"),
        nextTasks: JSON.parse(ds.nextTasks || "[]"),
        behaviorScores: JSON.parse(ds.behaviorScores || "{}"),
      })),
    }))
  );
}

// POST /api/sessions
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    number?: number;
    title: string;
    date: string;
    time?: string;
    duration?: string;
    location?: string;
    type?: string; // Individual / Coletivo
    status?: string;
    clientId?: string;
    clientName?: string;
    dogId?: string;
    dogName?: string;
    notes?: unknown[];
    media?: unknown[];
    dogSessions?: Array<{
      dogId: string;
      activities?: unknown[];
      commands?: unknown[];
      description?: string;
      privateNotes?: string;
      aiSummary?: string;
      aiApproved?: boolean;
      media?: unknown[];
      nextFocus?: string;
      nextCommands?: string[];
      nextTasks?: string[];
      behaviorScores?: Record<string, number>;
    }>;
  };

  const safeMedia = Array.isArray(body.media) ? body.media.slice(0, 5) : [];

  const created = await prisma.trainingSession.create({
    data: {
      trainerId: trainer.id,
      number: body.number ?? 1,
      title: body.title,
      date: body.date,
      time: body.time ?? null,
      duration: body.duration ?? null,
      location: body.location ?? null,
      type: body.type ?? "Individual",
      status: body.status ?? "Realizado",
      clientName: body.clientName ?? "",
      dogId: body.dogId ?? null,
      dogName: body.dogName ?? "",
      notes: JSON.stringify(body.notes ?? []),
      media: JSON.stringify(safeMedia),
    },
  });

  // Criar registros filhos de cães na sessão
  if (Array.isArray(body.dogSessions) && body.dogSessions.length > 0) {
    for (const ds of body.dogSessions) {
      await prisma.dogTrainingSession.create({
        data: {
          sessionId: created.id,
          dogId: ds.dogId,
          activities: JSON.stringify(ds.activities ?? []),
          commands: JSON.stringify(ds.commands ?? []),
          description: ds.description ?? "",
          privateNotes: ds.privateNotes ?? "",
          aiSummary: ds.aiSummary ?? "",
          aiApproved: ds.aiApproved ?? false,
          media: JSON.stringify(ds.media ?? []),
          nextFocus: ds.nextFocus ?? "",
          nextCommands: JSON.stringify(ds.nextCommands ?? []),
          nextTasks: JSON.stringify(ds.nextTasks ?? []),
          behaviorScores: JSON.stringify(ds.behaviorScores ?? {}),
        },
      });

      // Criar tarefas de dever de casa automaticamente se aprovado
      if (ds.aiApproved && Array.isArray(ds.nextTasks) && ds.nextTasks.length > 0) {
        const dog = await prisma.dog.findUnique({
          where: { id: ds.dogId },
          select: { clientId: true },
        });
        if (dog?.clientId) {
          for (const taskText of ds.nextTasks) {
            const textStr = typeof taskText === "string" ? taskText : "";
            if (textStr.trim()) {
              // Dedup por título, SEM filtrar por completed: uma tarefa diária
              // com completed=true de ontem é a mesma tarefa — filtrar por
              // completed:false criava uma duplicata a cada novo registro.
              const existingTask = await prisma.portalTask.findFirst({
                where: {
                  trainerId: trainer.id,
                  clientId: dog.clientId,
                  title: textStr.trim(),
                },
              });
              if (!existingTask) {
                // Frequência escolhida no registro (Seção 8) → recorrência do PortalTask,
                // para o cliente marcar todos os dias / nos dias certos, não só uma vez.
                const opts = (ds as {
                  nextTaskOptions?: Array<{ text?: string; recurrence?: string; weekdays?: number[] }>;
                }).nextTaskOptions;
                const opt = Array.isArray(opts) ? opts.find((o) => o?.text === textStr) : undefined;
                const recurrence = ["once", "daily", "weekly"].includes(opt?.recurrence ?? "")
                  ? (opt!.recurrence as string)
                  : "once";
                const weekdays =
                  recurrence === "weekly" && Array.isArray(opt?.weekdays)
                    ? opt!.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
                    : [];
                await prisma.portalTask.create({
                  data: {
                    trainerId: trainer.id,
                    clientId: dog.clientId,
                    title: textStr.trim(),
                    description: "Tarefa recomendada de dever de casa.",
                    completed: false,
                    recurrence,
                    weekdays: recurrence === "weekly" ? JSON.stringify(weekdays) : null,
                    completions: "[]",
                  },
                });
              }
            }
          }
        }
      }
    }
  } else if (body.dogId) {
    // Fallback de compatibilidade
    await prisma.dogTrainingSession.create({
      data: {
        sessionId: created.id,
        dogId: body.dogId,
        activities: "[]",
        commands: JSON.stringify(body.notes ?? []),
        description: body.notes?.[0] && typeof body.notes[0] === "object" ? (body.notes[0] as { comment?: string }).comment ?? "" : "",
        aiApproved: false,
        media: JSON.stringify(safeMedia),
      },
    });
  }

  return NextResponse.json({ ...created, notes: body.notes ?? [], media: safeMedia }, { status: 201 });
}

// PATCH /api/sessions — edita um treino JÁ existente (não cria outro).
// Corrige o bug em que "editar" gravava um novo registro a cada vez.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    id: string;
    title?: string;
    date?: string;
    location?: string;
    type?: string;
    status?: string;
    clientName?: string;
    dogId?: string;
    dogName?: string;
    notes?: unknown[];
    media?: unknown[];
    dogSessions?: Array<{
      dogId: string;
      activities?: unknown[];
      commands?: unknown[];
      description?: string;
      privateNotes?: string;
      aiSummary?: string;
      aiApproved?: boolean;
      media?: unknown[];
      nextFocus?: string;
      nextCommands?: string[];
      nextTasks?: string[];
      behaviorScores?: Record<string, number>;
    }>;
  };

  if (!body.id) return NextResponse.json({ error: "ID do treino obrigatório" }, { status: 400 });

  // Garante que o treino pertence a este adestrador.
  const existing = await prisma.trainingSession.findFirst({
    where: { id: body.id, trainerId: trainer.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });

  const safeMedia = Array.isArray(body.media) ? body.media.slice(0, 5) : undefined;

  await prisma.trainingSession.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.date !== undefined ? { date: body.date } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.clientName !== undefined ? { clientName: body.clientName } : {}),
      ...(body.dogId !== undefined ? { dogId: body.dogId } : {}),
      ...(body.dogName !== undefined ? { dogName: body.dogName } : {}),
      ...(body.notes !== undefined ? { notes: JSON.stringify(body.notes) } : {}),
      ...(safeMedia !== undefined ? { media: JSON.stringify(safeMedia) } : {}),
    },
  });

  // Substitui os registros por cão (atualiza em vez de acumular).
  if (Array.isArray(body.dogSessions)) {
    await prisma.dogTrainingSession.deleteMany({ where: { sessionId: body.id } });
    for (const ds of body.dogSessions) {
      await prisma.dogTrainingSession.create({
        data: {
          sessionId: body.id,
          dogId: ds.dogId,
          activities: JSON.stringify(ds.activities ?? []),
          commands: JSON.stringify(ds.commands ?? []),
          description: ds.description ?? "",
          privateNotes: ds.privateNotes ?? "",
          aiSummary: ds.aiSummary ?? "",
          aiApproved: ds.aiApproved ?? false,
          media: JSON.stringify(ds.media ?? []),
          nextFocus: ds.nextFocus ?? "",
          nextCommands: JSON.stringify(ds.nextCommands ?? []),
          nextTasks: JSON.stringify(ds.nextTasks ?? []),
          behaviorScores: JSON.stringify(ds.behaviorScores ?? {}),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
