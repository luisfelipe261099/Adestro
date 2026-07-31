import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { canReenterInvite, getInviteResumeStep, getInviteStatus } from "@/lib/client-invite";
import { inviteBehaviorSchema, inviteClientSchema, inviteDogSchema } from "@/lib/invite-form";
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
      completedAt: true,
      trainer: { select: { id: true, name: true } },
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          cpf: true,
          propertyType: true,
          secondContactName: true,
          secondContactPhone: true,
          addresses: { take: 1, orderBy: { createdAt: "asc" } },
          dogs: { take: 1, orderBy: { id: "asc" } },
        },
      },
    },
  });
}

type ResolvedInvite = NonNullable<Awaited<ReturnType<typeof resolveInvite>>>;

const firstDog = (invite: ResolvedInvite) => invite.client?.dogs?.[0] ?? null;

function progressOf(invite: ResolvedInvite) {
  return {
    clientId: invite.clientId,
    hasDog: !!firstDog(invite),
    completedAt: invite.completedAt,
  };
}

// JSON gravado por versões anteriores pode estar malformado; um throw aqui
// derrubaria a tela do tutor por causa de um campo de exibição.
function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

  // "Em preenchimento" é atendível: é exatamente quem precisa voltar ao
  // formulário. Só Revogado e Expirado fecham a porta.
  if (status === "Revogado" || status === "Expirado") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const dog = firstDog(invite);
  const address = invite.client?.addresses?.[0] ?? null;

  // Só dados DESTE cadastro, alcançados pelo clientId do próprio convite.
  // A rota é pública: nada de outros clientes do adestrador.
  const prefill = invite.client
    ? {
        clientName: invite.client.name,
        phone: invite.client.phone ?? "",
        email: invite.client.email ?? "",
        cpf: invite.client.cpf ?? "",
        emergencyName: invite.client.secondContactName ?? "",
        emergencyPhone: invite.client.secondContactPhone ?? "",
        propertyType: invite.client.propertyType ?? "",
        address: address
          ? {
              zipCode: address.zipCode ?? "",
              street: address.street ?? "",
              number: address.number ?? "",
              complement: address.complement ?? "",
              neighborhood: address.neighborhood ?? "",
              city: address.city ?? "",
              state: address.state ?? "",
            }
          : null,
        dog: dog
          ? {
              dogName: dog.name,
              breed: dog.breed ?? "",
              birthDate: dog.birthDate ?? "",
              age: dog.age ?? "",
              sex: dog.sex ?? "",
              castrated: !!dog.castrated,
              weight: dog.weight ?? "",
              microchip: dog.microchip ?? "",
              color: dog.color ?? "",
              preventiveCare: dog.preventiveCare ?? "",
              dietRestrictions: dog.dietRestrictions ?? "",
              healthConditions: dog.healthConditions ?? "",
              veterinarian: dog.veterinarian ?? "",
              photoUrl: dog.photoUrl ?? "",
              vaccines: safeJson(dog.vaccines, [] as unknown[]),
              temperament: safeJson(dog.temperament, {} as Record<string, unknown>),
              routine: safeJson(dog.routine, {} as Record<string, unknown>),
              environmentalAnalysis: safeJson(
                dog.environmentalAnalysis,
                {} as Record<string, unknown>,
              ),
              trainingGoals: safeJson(dog.trainingGoals, {} as Record<string, unknown>),
            }
          : null,
      }
    : null;

  return NextResponse.json({
    trainerName: invite.trainer.name,
    status,
    alreadyUsed: canReenterInvite(invite),
    resumeStep: getInviteResumeStep(progressOf(invite)),
    prefill,
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

  // Reentrada: a pessoa já TERMINOU e perdeu o link do portal. Só temos o hash
  // do token antigo, então o único caminho é emitir um novo.
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
  if (status === "Revogado" || status === "Expirado") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const body = (await request.json().catch(() => ({}))) as { section?: number; data?: unknown };

  // ── Seção 1: cria o cadastro. É aqui que o lead deixa de se perder ─────────
  if (body.section === 1) {
    const parsed = inviteClientSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const addressFields = data.address
      ? {
          nickname: "Casa",
          zipCode: data.address.zipCode ?? "",
          street: data.address.street ?? "",
          number: data.address.number ?? "",
          complement: data.address.complement ?? "",
          neighborhood: data.address.neighborhood ?? "",
          city: data.address.city ?? "",
          state: data.address.state ?? "",
          isDefault: true,
        }
      : null;

    // Voltou e reenviou a seção 1: atualiza, não duplica.
    if (invite.clientId) {
      // Só o que veio. O tutor pode voltar e reenviar esta seção, e um campo
      // ausente aqui significa "não perguntei", não "apague" — o adestrador
      // pode ter preenchido esse dado à mão na ficha.
      await prisma.clientProfile.update({
        where: { id: invite.clientId },
        data: {
          name: data.clientName,
          phone: data.phone,
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.cpf !== undefined ? { cpf: data.cpf } : {}),
          ...(data.emergencyName !== undefined
            ? { secondContactName: data.emergencyName }
            : {}),
          ...(data.emergencyPhone !== undefined
            ? { secondContactPhone: data.emergencyPhone }
            : {}),
        },
      });

      if (addressFields) {
        const existing = await prisma.address.findFirst({
          where: { clientProfileId: invite.clientId },
          orderBy: { createdAt: "asc" },
        });
        if (existing) {
          await prisma.address.update({ where: { id: existing.id }, data: addressFields });
        } else {
          await prisma.address.create({
            data: { ...addressFields, clientProfileId: invite.clientId },
          });
        }
      }

      return NextResponse.json({ ok: true, resumeStep: 2 });
    }

    const portalToken = buildPortalToken();

    // Transação: sem ela, uma falha ao criar o portal deixa cliente órfão e
    // convite queimado — a pessoa recarrega e não consegue mais entrar.
    await prisma.$transaction(async (tx) => {
      const client = await tx.clientProfile.create({
        data: {
          trainerId: invite.trainerId,
          name: data.clientName,
          phone: data.phone,
          email: data.email ?? "",
          cpf: data.cpf ?? "",
          secondContactName: data.emergencyName ?? null,
          secondContactPhone: data.emergencyPhone ?? null,
          status: "Rascunho", // aguarda aprovação do adestrador
        },
      });

      if (addressFields) {
        await tx.address.create({ data: { ...addressFields, clientProfileId: client.id } });
      }

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

    return NextResponse.json({ ok: true, resumeStep: 2 });
  }

  // Seções 2 e 3 atualizam o que a seção 1 criou. Sem clientId não há o que
  // atualizar, e criar aqui produziria cadastro sem nome nem telefone.
  if (!invite.clientId) {
    return NextResponse.json(
      { error: "Comece pelo primeiro passo do formulário." },
      { status: 409 },
    );
  }

  // ── Seção 2: o cão ─────────────────────────────────────────────────────────
  if (body.section === 2) {
    const parsed = inviteDogSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    // Campo ausente não apaga: o formulário do convite pergunta um subconjunto,
    // e o adestrador preenche o resto na ficha do cão.
    const only = <T,>(v: T | undefined, key: string) =>
      v === undefined ? {} : { [key]: v };
    const dogData = {
      name: data.dogName,
      castrated: data.castrated ?? false,
      ...only(data.breed, "breed"),
      ...only(data.birthDate, "birthDate"),
      ...only(data.age, "age"),
      ...only(data.sex, "sex"),
      ...only(data.weight, "weight"),
      ...only(data.microchip, "microchip"),
      ...only(data.color, "color"),
      ...only(data.preventiveCare, "preventiveCare"),
      ...only(data.dietRestrictions, "dietRestrictions"),
      ...only(data.healthConditions, "healthConditions"),
      ...only(data.veterinarian, "veterinarian"),
      ...(data.vaccines ? { vaccines: JSON.stringify(data.vaccines) } : {}),
      ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
    };

    const existing = firstDog(invite);
    if (existing) {
      await prisma.dog.update({ where: { id: existing.id }, data: dogData });
    } else {
      await prisma.dog.create({
        data: { ...dogData, clientId: invite.clientId, trainingTypes: "[]" },
      });
    }

    return NextResponse.json({ ok: true, resumeStep: 3 });
  }

  // ── Seção 3: comportamento; fecha o convite ────────────────────────────────
  if (body.section === 3) {
    const parsed = inviteBehaviorSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const dog = firstDog(invite);
    if (!dog) {
      return NextResponse.json(
        { error: "Preencha os dados do cão antes de continuar." },
        { status: 409 },
      );
    }

    await prisma.dog.update({
      where: { id: dog.id },
      data: {
        temperament: data.temperament ? JSON.stringify(data.temperament) : dog.temperament,
        routine: data.routine ? JSON.stringify(data.routine) : dog.routine,
        environmentalAnalysis: data.environmentalAnalysis
          ? JSON.stringify(data.environmentalAnalysis)
          : dog.environmentalAnalysis,
        trainingGoals: data.trainingGoals ? JSON.stringify(data.trainingGoals) : dog.trainingGoals,
      },
    });

    if (data.propertyType) {
      await prisma.clientProfile.update({
        where: { id: invite.clientId },
        data: { propertyType: data.propertyType },
      });
    }

    await prisma.clientInvite.update({
      where: { id: invite.id },
      data: { completedAt: new Date() },
    });

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

    // Fora da transação de propósito: push é efeito colateral externo. Serviço
    // de push fora do ar não pode derrubar o cadastro — por isso a função engole
    // os próprios erros. É aguardado, e não disparado solto, porque em
    // serverless o processo morre junto com a resposta.
    await notifyTrainer(invite.trainerId, invite.client?.name ?? "Novo cliente", dog.name);

    return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
  }

  return NextResponse.json({ error: "Passo inválido do formulário." }, { status: 400 });
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
