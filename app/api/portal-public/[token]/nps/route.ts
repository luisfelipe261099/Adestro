import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { hashPortalToken, isPortalPinValid, isPortalTokenActive } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { requireRateLimit } from "@/lib/rate-limit";
import { badRequest, npsResponseSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

async function resolveLink(rawToken: string, pin?: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  const link = await prisma.portalAccessLink.findUnique({
    where: { tokenHash: hashPortalToken(token) },
    select: { id: true, trainerId: true, clientId: true, pinHash: true, revokedAt: true, expiresAt: true },
  });

  if (!link) return null;
  if (!isPortalTokenActive({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) return null;
  if (!isPortalPinValid(link.pinHash, pin)) return "PIN_INVALID" as const;

  return link;
}

export async function POST(request: Request, { params }: Params) {
  const limited = requireRateLimit(request, {
    suffix: "nps",
    config: { capacity: 5, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const { token } = await params;
  const pin = new URL(request.url).searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido" }, { status: 401 });
  }
  if (!link) return NextResponse.json({ error: "Link invalido" }, { status: 404 });

  const rawBody = await request.json();
  const parsed = npsResponseSchema.safeParse(rawBody);
  if (!parsed.success) return badRequest("Payload invalido", parsed.error.flatten());

  const session = await prisma.trainingSession.findFirst({
    where: { id: parsed.data.sessionId, trainerId: link.trainerId },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Sessao nao encontrada" }, { status: 404 });

  const response = await prisma.npsResponse.upsert({
    where: {
      sessionId_clientId: { sessionId: session.id, clientId: link.clientId },
    },
    update: {
      score: parsed.data.score,
      comment: parsed.data.comment ?? null,
    },
    create: {
      sessionId: session.id,
      clientId: link.clientId,
      score: parsed.data.score,
      comment: parsed.data.comment ?? null,
    },
  });

  await audit({
    trainerId: link.trainerId,
    action: "session.nps",
    resourceId: session.id,
    detail: { score: parsed.data.score },
    request,
  });

  return NextResponse.json({ ok: true, id: response.id });
}
