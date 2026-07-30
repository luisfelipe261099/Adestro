import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { canReenterInvite, getInviteStatus } from "@/lib/client-invite";
import {
  PORTAL_LINK_DEFAULT_DAYS,
  buildPortalToken,
  getPortalExpiryDate,
  getTokenPrefix,
  hashPortalToken,
} from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { clientInviteSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function resolveInvite(rawToken: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  return prisma.clientInvite.findUnique({
    where: { tokenHash: hashPortalToken(token) },
    select: {
      id: true,
      trainerId: true,
      expiresAt: true,
      revokedAt: true,
      clientId: true,
      trainer: { select: { id: true, name: true } },
    },
  });
}

// Mensagem específica por motivo: esta tela é vista por um cliente final, que
// não tem como agir sobre "erro genérico".
function messageForStatus(status: string): string {
  if (status === "Revogado") {
    return "Este convite foi cancelado pelo adestrador. Peça um link novo.";
  }
  if (status === "Expirado") {
    return "Este convite venceu. Peça um link novo ao seu adestrador.";
  }
  return "Convite inválido. Confira o link que você recebeu.";
}

export async function GET(request: Request, { params }: Params) {
  const limit = rateLimit(getClientKey(request, "invite-get"));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { token } = await params;
  const invite = await resolveInvite(token);
  if (!invite) {
    return NextResponse.json({ error: messageForStatus("Inexistente") }, { status: 404 });
  }

  const status = getInviteStatus(invite);
  const reentry = canReenterInvite(invite);

  if (status !== "Pendente" && !reentry) {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  // Nunca devolver dados do cliente: a rota é pública.
  return NextResponse.json({
    trainerName: invite.trainer.name,
    status,
    alreadyUsed: reentry,
  });
}

export async function POST(request: Request, { params }: Params) {
  const limit = rateLimit(getClientKey(request, "invite-post"));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { token } = await params;
  const invite = await resolveInvite(token);
  if (!invite) {
    return NextResponse.json({ error: messageForStatus("Inexistente") }, { status: 404 });
  }

  const baseUrl = await getBaseUrl();

  // Reentrada: a pessoa já se cadastrou e perdeu o link do portal. Só temos o
  // hash do token antigo, então o único caminho é emitir um novo.
  if (canReenterInvite(invite) && invite.clientId) {
    const portalToken = buildPortalToken();
    const portalData = {
      tokenHash: hashPortalToken(portalToken),
      tokenPrefix: getTokenPrefix(portalToken),
      expiresAt: getPortalExpiryDate(PORTAL_LINK_DEFAULT_DAYS),
    };

    await prisma.portalAccessLink.upsert({
      where: { clientId: invite.clientId },
      update: { ...portalData, trainerId: invite.trainerId, revokedAt: null },
      create: { ...portalData, trainerId: invite.trainerId, clientId: invite.clientId },
    });

    return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
  }

  const status = getInviteStatus(invite);
  if (status !== "Pendente") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const parsed = clientInviteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const portalToken = buildPortalToken();

  // Transação: sem ela, uma falha ao criar o cão deixa cliente órfão e convite
  // queimado — a pessoa recarrega e não consegue mais entrar.
  await prisma.$transaction(async (tx) => {
    const client = await tx.clientProfile.create({
      data: {
        trainerId: invite.trainerId,
        name: data.clientName,
        phone: data.phone ?? "",
        email: data.email ?? "",
        status: "Rascunho", // aguarda aprovação do adestrador
      },
    });

    await tx.dog.create({
      data: {
        clientId: client.id,
        name: data.dogName,
        breed: data.breed ?? "",
        trainingTypes: "[]",
      },
    });

    await tx.portalAccessLink.create({
      data: {
        trainerId: invite.trainerId,
        clientId: client.id,
        tokenHash: hashPortalToken(portalToken),
        tokenPrefix: getTokenPrefix(portalToken),
        expiresAt: getPortalExpiryDate(PORTAL_LINK_DEFAULT_DAYS),
      },
    });

    await tx.clientInvite.update({
      where: { id: invite.id },
      data: { clientId: client.id },
    });
  });

  // Fora da transação de propósito: push é efeito colateral externo. Serviço de
  // push fora do ar não pode derrubar o cadastro do cliente — por isso a função
  // engole os próprios erros. É aguardado, e não disparado solto, porque em
  // serverless o processo morre junto com a resposta.
  await notifyTrainer(invite.trainerId, data.clientName, data.dogName);

  return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
}

async function notifyTrainer(trainerId: string, clientName: string, dogName: string) {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { trainerId } });
    await Promise.all(
      subs.map((sub) =>
        sendPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
          {
            title: "Novo cadastro pelo convite",
            body: `${clientName} cadastrou ${dogName}. Aguardando sua aprovação.`,
            url: "/clientes?status=rascunho",
            tag: "novo-cadastro",
          },
        ),
      ),
    );
  } catch (error) {
    // O cadastro já foi salvo; notificação é bônus.
    console.error("[convite] falha ao notificar o adestrador", error);
  }
}
