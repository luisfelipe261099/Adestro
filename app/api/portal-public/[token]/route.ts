import { NextResponse } from "next/server";

import { isPortalPinValid, isPortalTokenActive, hashPortalToken } from "@/lib/portal-access";
import { serializeTaskForToday } from "@/lib/portal-tasks-shared";
import { prisma } from "@/lib/prisma";
import { requireRateLimit } from "@/lib/rate-limit";
import { badRequest, portalFeedbackSchema, portalTaskUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

async function resolveLink(rawToken: string, pin?: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  const tokenHash = hashPortalToken(token);

  const link = await prisma.portalAccessLink.findUnique({
    where: { tokenHash },
    include: {
      trainer: { select: { id: true, name: true, phone: true } },
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          plan: true,
          dogs: true,
        },
      },
    },
  });

  if (!link) return null;
  if (!isPortalTokenActive({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) return null;
  if (!isPortalPinValid(link.pinHash, pin)) {
    return "PIN_INVALID";
  }

  return link;
}

function mapSessionNotes(rawNotes: string | null) {
  try {
    const parsed = JSON.parse(rawNotes || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapSessionMedia(rawMedia: string | null) {
  try {
    const parsed = JSON.parse(rawMedia || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const requestUrl = new URL(_request.url);
  const pin = requestUrl.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }

  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const [events, sessions, tasks, feedbacks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        trainerId: link.trainerId,
        OR: [
          { clientId: link.clientId },
          { clientId: null, client: link.client.name },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.trainingSession.findMany({
      where: {
        trainerId: link.trainerId,
        OR: [
          { clientName: link.client.name },
          {
            dog: {
              clientId: link.clientId,
            },
          },
        ],
      },
      include: {
        dogSessions: {
          include: {
            dog: {
              select: {
                name: true,
                breed: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.portalTask.findMany({
      where: {
        trainerId: link.trainerId,
        clientId: link.clientId,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.portalFeedback.findMany({
      where: {
        trainerId: link.trainerId,
        clientId: link.clientId,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  await prisma.portalAccessLink.update({
    where: { id: link.id },
    data: { lastAccessAt: new Date() },
  });

  const clientDogNames = new Set(link.client.dogs.map((dog) => dog.name));
  const clientDogIds = new Set(link.client.dogs.map((dog) => dog.id));
  const filteredEvents = events
    .filter((event) => {
      if (event.clientId && event.clientId !== link.clientId) return false;
      if (event.dogId) {
        if (!clientDogIds.size) return true;
        return clientDogIds.has(event.dogId);
      }
      if (!clientDogNames.size) return true;
      return clientDogNames.has(event.dog);
    })
    .slice(0, 20);

  return NextResponse.json({
    trainer: {
      id: link.trainer.id,
      name: link.trainer.name,
      phone: link.trainer.phone,
    },
    client: {
      id: link.client.id,
      name: link.client.name,
      phone: link.client.phone,
      plan: link.client.plan,
      dogs: link.client.dogs,
    },
    events: filteredEvents,
    sessions: sessions.map((session) => {
      const tutorDogIds = new Set(link.client.dogs.map((d) => d.id));
      const filteredDogSessions = (session.dogSessions || [])
        .filter((ds) => tutorDogIds.has(ds.dogId))
        .map((ds) => {
          const approved = ds.aiApproved;
          return {
            ...ds,
            activities: mapSessionNotes(ds.activities),
            commands: mapSessionNotes(ds.commands),
            media: mapSessionMedia(ds.media),
            nextCommands: mapSessionNotes(ds.nextCommands),
            aiSummary: approved ? ds.aiSummary : null,
            nextTasks: approved ? mapSessionNotes(ds.nextTasks) : [],
          };
        });

      return {
        ...session,
        notes: mapSessionNotes(session.notes),
        media: mapSessionMedia(session.media),
        dogSessions: filteredDogSessions,
      };
    }),
    // Tarefa recorrente "reinicia" a cada dia: `completed` aqui significa
    // "concluída HOJE" (derivado do histórico), nunca o flag cru do banco.
    tasks: tasks.map((task) => serializeTaskForToday(task)),
    feedbacks,
    linkMeta: {
      expiresAt: link.expiresAt,
      status: "Ativo",
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const limited = requireRateLimit(request, {
    suffix: "portal-feedback",
    config: { capacity: 20, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const { token } = await params;
  const requestUrl = new URL(request.url);
  const pin = requestUrl.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }

  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const rawBody = await request.json();
  const parsed = portalFeedbackSchema.safeParse(rawBody);
  if (!parsed.success) return badRequest("Payload invalido", parsed.error.flatten());

  const feedback = await prisma.portalFeedback.create({
    data: {
      trainerId: link.trainerId,
      clientId: link.clientId,
      author: parsed.data.author ?? "Tutor",
      message: parsed.data.message,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}

export async function PATCH(request: Request, { params }: Params) {
  const limited = requireRateLimit(request, {
    suffix: "portal-task",
    config: { capacity: 30, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const { token } = await params;
  const requestUrl = new URL(request.url);
  const pin = requestUrl.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }

  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const rawBody = await request.json();
  const parsed = portalTaskUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return badRequest("Payload invalido", parsed.error.flatten());

  // Busca a tarefa para saber se é recorrente.
  const task = await prisma.portalTask.findFirst({
    where: {
      id: parsed.data.taskId,
      trainerId: link.trainerId,
      clientId: link.clientId,
    },
  });
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

  const recurrence = (task as { recurrence?: string }).recurrence ?? "once";

  if (recurrence === "once") {
    const updated = await prisma.portalTask.updateMany({
      where: { id: task.id, trainerId: link.trainerId, clientId: link.clientId },
      data: {
        completed: parsed.data.completed,
        ...(parsed.data.evidenceUrl !== undefined ? { evidenceUrl: parsed.data.evidenceUrl } : {}),
      },
    });
    return NextResponse.json({ ok: updated.count > 0 });
  }

  // Recorrente: marca/desmarca a data de HOJE na lista de conclusões.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let completions: string[] = [];
  try {
    const raw = JSON.parse((task as { completions?: string }).completions ?? "[]");
    if (Array.isArray(raw)) completions = raw.filter((d): d is string => typeof d === "string");
  } catch {
    completions = [];
  }
  if (parsed.data.completed) {
    if (!completions.includes(todayStr)) completions.push(todayStr);
  } else {
    completions = completions.filter((d) => d !== todayStr);
  }

  const updated = await prisma.portalTask.updateMany({
    where: { id: task.id, trainerId: link.trainerId, clientId: link.clientId },
    data: {
      completions: JSON.stringify(completions.slice(-180)),
      // `completed` reflete "feito hoje" (para gamificação e contagem).
      completed: completions.includes(todayStr),
      ...(parsed.data.evidenceUrl !== undefined ? { evidenceUrl: parsed.data.evidenceUrl } : {}),
    },
  });

  return NextResponse.json({ ok: updated.count > 0 });
}
