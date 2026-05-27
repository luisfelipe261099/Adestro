import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { hashPortalToken, isPortalPinValid, isPortalTokenActive } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { requireRateLimit } from "@/lib/rate-limit";
import { badRequest, confirmPresenceSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

async function resolveLink(rawToken: string, pin?: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  const tokenHash = hashPortalToken(token);

  const link = await prisma.portalAccessLink.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      trainerId: true,
      clientId: true,
      pinHash: true,
      revokedAt: true,
      expiresAt: true,
      client: { select: { name: true } },
    },
  });

  if (!link) return null;
  if (!isPortalTokenActive({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) return null;
  if (!isPortalPinValid(link.pinHash, pin)) return "PIN_INVALID" as const;

  return link;
}

export async function POST(request: Request, { params }: Params) {
  const limited = requireRateLimit(request, {
    suffix: "portal-confirm",
    config: { capacity: 10, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const { token } = await params;
  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }
  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const rawBody = await request.json();
  const parsed = confirmPresenceSchema.safeParse(rawBody);
  if (!parsed.success) return badRequest("Payload invalido", parsed.error.flatten());
  const body = parsed.data;

  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: body.eventId,
      trainerId: link.trainerId,
      OR: [{ clientId: link.clientId }, { clientId: null, client: link.client.name }],
    },
    select: { id: true, dog: true, day: true, time: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 });
  }

  const nextStatus = body.confirmed ? "Confirmado" : "Cancelado";

  await prisma.calendarEvent.update({
    where: { id: event.id },
    data: { status: nextStatus },
  });

  const reasonText = body.reason?.trim();
  const message = body.confirmed
    ? `✅ Presença confirmada pelo tutor para ${event.dog} em ${event.day} às ${event.time}.`
    : `❌ Tutor recusou presença para ${event.dog} em ${event.day} às ${event.time}.${reasonText ? ` Motivo: ${reasonText}` : ""}`;

  await prisma.portalFeedback.create({
    data: {
      trainerId: link.trainerId,
      clientId: link.clientId,
      author: "Tutor",
      message,
    },
  });

  await audit({
    trainerId: link.trainerId,
    action: body.confirmed ? "session.updated" : "session.updated",
    resourceId: event.id,
    detail: { source: "portal-confirm", confirmed: body.confirmed, reason: reasonText },
    request,
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
