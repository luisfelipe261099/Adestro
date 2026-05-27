import { NextResponse } from "next/server";

import { isPortalPinValid, isPortalTokenActive, hashPortalToken } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";

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
    tasks,
    feedbacks,
    linkMeta: {
      expiresAt: link.expiresAt,
      status: "Ativo",
    },
  });
}

export async function POST(request: Request, { params }: Params) {
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

  const body = (await request.json()) as { message?: string; author?: string };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Mensagem obrigatoria" }, { status: 400 });
  }

  const author = body.author === "Adestrador" ? "Adestrador" : "Tutor";

  const feedback = await prisma.portalFeedback.create({
    data: {
      trainerId: link.trainerId,
      clientId: link.clientId,
      author,
      message,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}

export async function PATCH(request: Request, { params }: Params) {
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

  const body = (await request.json()) as { taskId?: string; completed?: boolean; evidenceUrl?: string | null };
  if (!body.taskId || typeof body.completed !== "boolean") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const updated = await prisma.portalTask.updateMany({
    where: {
      id: body.taskId,
      trainerId: link.trainerId,
      clientId: link.clientId,
    },
    data: {
      completed: body.completed,
      ...(body.evidenceUrl !== undefined ? { evidenceUrl: body.evidenceUrl } : {}),
    },
  });

  return NextResponse.json({ ok: updated.count > 0 });
}
