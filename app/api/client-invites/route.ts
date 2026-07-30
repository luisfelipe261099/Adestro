import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getInviteExpiryDate, getInviteStatus, normalizeInviteDays } from "@/lib/client-invite";
import { checkLimit } from "@/lib/plan-limits";
import { buildPortalToken, getTokenPrefix, hashPortalToken } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";

// Mesmo helper das outras rotas: o adestrador pode existir só como User.
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

type Guard =
  | { error: NextResponse; trainer?: undefined; actorEmail?: undefined }
  | { error?: undefined; trainer: { id: string; plan: string }; actorEmail: string | null };

async function requireTrainer(): Promise<Guard> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) {
    return { error: NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 }) };
  }
  return { trainer, actorEmail: session.user.email ?? null };
}

type InviteRow = {
  id: string;
  label: string | null;
  tokenPrefix: string;
  expiresAt: Date;
  revokedAt: Date | null;
  clientId: string | null;
  createdAt: Date;
  client: { name: string } | null;
};

const SELECT = {
  id: true,
  label: true,
  tokenPrefix: true,
  expiresAt: true,
  revokedAt: true,
  clientId: true,
  createdAt: true,
  client: { select: { name: true } },
} as const;

function toItem(invite: InviteRow) {
  return {
    id: invite.id,
    label: invite.label,
    tokenPrefix: invite.tokenPrefix,
    status: getInviteStatus({
      revokedAt: invite.revokedAt,
      expiresAt: invite.expiresAt,
      clientId: invite.clientId,
    }),
    expiresAt: invite.expiresAt,
    clientId: invite.clientId,
    clientName: invite.client?.name ?? null,
    createdAt: invite.createdAt,
  };
}

export async function GET() {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;

  const invites = await prisma.clientInvite.findMany({
    where: { trainerId: guard.trainer.id },
    select: SELECT,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ invites: invites.map(toItem) });
}

export async function POST(request: Request) {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;
  const trainer = guard.trainer;

  // Barrar aqui, e não no envio: melhor não gerar o link do que deixar o tutor
  // preencher a ficha inteira para levar erro no fim.
  // Rascunho não conta — só ocupa vaga quem o adestrador já aprovou.
  const currentClientCount = await prisma.clientProfile.count({
    where: { trainerId: trainer.id, status: { not: "Rascunho" } },
  });
  const limitCheck = checkLimit({
    plan: trainer.plan,
    resource: "client",
    currentCount: currentClientCount,
  });
  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        error: limitCheck.reason,
        code: "PLAN_LIMIT",
        limit: limitCheck.limit,
        current: limitCheck.current,
      },
      { status: 402 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    expiresInDays?: number;
  };

  const token = buildPortalToken();
  const invite = await prisma.clientInvite.create({
    data: {
      trainerId: trainer.id,
      label: body.label?.trim() || null,
      tokenHash: hashPortalToken(token),
      tokenPrefix: getTokenPrefix(token),
      expiresAt: getInviteExpiryDate(normalizeInviteDays(body.expiresInDays)),
    },
    select: SELECT,
  });

  await audit({
    trainerId: trainer.id,
    action: "invite.created",
    resourceId: invite.id,
    detail: { label: invite.label, expiresAt: invite.expiresAt },
    actorEmail: guard.actorEmail,
    request,
  });

  const baseUrl = await getBaseUrl();

  // Única vez que o token existe em texto puro. Depois daqui, só o hash.
  return NextResponse.json({
    invite: toItem(invite),
    shareUrl: `${baseUrl}/convite/${token}`,
  });
}

export async function PATCH(request: Request) {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;

  const body = (await request.json().catch(() => ({}))) as { id?: string; action?: "revoke" };
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  if (body.action !== "revoke") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const updated = await prisma.clientInvite.updateMany({
    where: { id: body.id, trainerId: guard.trainer.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (!updated.count) {
    return NextResponse.json(
      { error: "Convite não encontrado ou já revogado" },
      { status: 404 },
    );
  }

  await audit({
    trainerId: guard.trainer.id,
    action: "invite.revoked",
    resourceId: body.id,
    actorEmail: guard.actorEmail,
    request,
  });

  return NextResponse.json({ ok: true });
}
