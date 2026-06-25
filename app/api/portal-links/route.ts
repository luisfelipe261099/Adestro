import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  buildPortalToken,
  getPortalExpiryDate,
  getPortalLinkStatus,
  getTokenPrefix,
  hashPortalPin,
  hashPortalToken,
  normalizePortalPin,
  normalizeExpiresInDays,
} from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";

async function ensureTrainer(userId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (trainer) return trainer;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) return null;

  return prisma.trainer.create({
    data: {
      userId,
      name: user.name?.trim() || user.email?.split("@")[0] || "Adestrador",
    },
  });
}

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

function toResponseItem(baseUrl: string, link: {
  id: string;
  clientId: string;
  tokenPrefix: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt: Date | null;
  pinHash: string | null;
}) {
  return {
    id: link.id,
    clientId: link.clientId,
    tokenPrefix: link.tokenPrefix,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    lastAccessAt: link.lastAccessAt,
    hasPin: Boolean(link.pinHash),
    status: getPortalLinkStatus({ revokedAt: link.revokedAt, expiresAt: link.expiresAt }),
    shareUrl: null as string | null,
    previewPath: `/portal/cliente/${link.tokenPrefix}...`,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) {
    return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (clientId) {
    const link = await prisma.portalAccessLink.findFirst({
      where: {
        trainerId: trainer.id,
        clientId,
      },
      select: {
        id: true,
        clientId: true,
        tokenPrefix: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        lastAccessAt: true,
        pinHash: true,
      },
    });

    if (!link) return NextResponse.json({ link: null });

    const baseUrl = await getBaseUrl();
    return NextResponse.json({ link: toResponseItem(baseUrl, link) });
  }

  const links = await prisma.portalAccessLink.findMany({
    where: { trainerId: trainer.id },
    select: {
      id: true,
      clientId: true,
      tokenPrefix: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      lastAccessAt: true,
      pinHash: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const baseUrl = await getBaseUrl();
  return NextResponse.json({ links: links.map((link) => toResponseItem(baseUrl, link)) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) {
    return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as { clientId?: string; expiresInDays?: number; pin?: string | null };
  if (!body.clientId) {
    return NextResponse.json({ error: "clientId obrigatorio" }, { status: 400 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: body.clientId, trainerId: trainer.id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
  }

  const token = buildPortalToken();
  const tokenHash = hashPortalToken(token);
  const tokenPrefix = getTokenPrefix(token);
  const expiresAt = getPortalExpiryDate(normalizeExpiresInDays(body.expiresInDays));
  const normalizedPin = normalizePortalPin(body.pin ?? undefined);
  if (body.pin && !normalizedPin) {
    return NextResponse.json({ error: "PIN invalido. Use 4 digitos." }, { status: 400 });
  }
  const pinHash = normalizedPin ? hashPortalPin(normalizedPin) : null;

  const link = await prisma.portalAccessLink.upsert({
    where: { clientId: client.id },
    update: {
      trainerId: trainer.id,
      tokenHash,
      pinHash,
      tokenPrefix,
      expiresAt,
      revokedAt: null,
    },
    create: {
      trainerId: trainer.id,
      clientId: client.id,
      tokenHash,
      pinHash,
      tokenPrefix,
      expiresAt,
    },
    select: {
      id: true,
      clientId: true,
      tokenPrefix: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      lastAccessAt: true,
      pinHash: true,
    },
  });

  const baseUrl = await getBaseUrl();

  return NextResponse.json({
    link: {
      ...toResponseItem(baseUrl, link),
      shareUrl: `${baseUrl}/portal/cliente/${token}`,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) {
    return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as { clientId?: string; action?: "revoke" };
  if (!body.clientId) {
    return NextResponse.json({ error: "clientId obrigatorio" }, { status: 400 });
  }

  if (body.action !== "revoke") {
    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  }

  const updated = await prisma.portalAccessLink.updateMany({
    where: { trainerId: trainer.id, clientId: body.clientId },
    data: { revokedAt: new Date() },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Link nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
