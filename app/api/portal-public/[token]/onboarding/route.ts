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
          email: true,
          birthDate: true,
          cpf: true,
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

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const requestUrl = new URL(request.url);
  const pin = requestUrl.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatório ou inválido", code: "PIN_REQUIRED" }, { status: 401 });
  }

  if (!link) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }

  const body = (await request.json()) as {
    // Tutor
    clientName?: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    cpf?: string;
    addresses?: Array<{
      nickname: string;
      zipCode?: string;
      street: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      isDefault?: boolean;
    }>;

    // Dog
    dogName: string;
    breed?: string;
    age?: string;
    weight?: string;
    photoUrl?: string;
    sex?: string;
    castrated?: boolean;
    microchip?: string;
    color?: string;
    vaccines?: any[];
    dietRestrictions?: string;
    healthConditions?: string;
    veterinarian?: string;
    temperament?: any;
    routine?: any;
    trainingGoals?: any;
    environmentalAnalysis?: any;
  };

  if (!body.dogName) {
    return NextResponse.json({ error: "Nome do cão é obrigatório" }, { status: 400 });
  }

  // 1. Atualizar ClientProfile (mudar status para "Rascunho" para aprovação do adestrador)
  await prisma.clientProfile.update({
    where: { id: link.clientId },
    data: {
      name: body.clientName || link.client.name,
      phone: body.phone ?? link.client.phone,
      email: body.email ?? link.client.email,
      birthDate: body.birthDate ?? link.client.birthDate,
      cpf: body.cpf ?? link.client.cpf,
      status: "Rascunho", // Torna-se rascunho para aprovação
    },
  });

  // 2. Atualizar Endereços
  await prisma.address.deleteMany({
    where: { clientProfileId: link.clientId },
  });

  if (body.addresses && body.addresses.length > 0) {
    await prisma.address.createMany({
      data: body.addresses.map((addr) => ({
        clientProfileId: link.clientId,
        nickname: addr.nickname || "Casa",
        zipCode: addr.zipCode || "",
        street: addr.street || "",
        number: addr.number || "",
        complement: addr.complement || "",
        neighborhood: addr.neighborhood || "",
        city: addr.city || "",
        state: addr.state || "",
        isDefault: !!addr.isDefault,
      })),
    });
  }

  // 3. Atualizar ou Criar Dog
  const firstDog = link.client.dogs[0];
  if (firstDog) {
    await prisma.dog.update({
      where: { id: firstDog.id },
      data: {
        name: body.dogName || firstDog.name,
        breed: body.breed ?? firstDog.breed,
        age: body.age ?? firstDog.age,
        weight: body.weight ?? firstDog.weight,
        photoUrl: body.photoUrl ?? firstDog.photoUrl,
        sex: body.sex ?? firstDog.sex,
        castrated: typeof body.castrated === "boolean" ? body.castrated : firstDog.castrated,
        microchip: body.microchip ?? firstDog.microchip,
        color: body.color ?? firstDog.color,
        vaccines: body.vaccines ? JSON.stringify(body.vaccines) : firstDog.vaccines,
        dietRestrictions: body.dietRestrictions ?? firstDog.dietRestrictions,
        healthConditions: body.healthConditions ?? firstDog.healthConditions,
        veterinarian: body.veterinarian ?? firstDog.veterinarian,
        temperament: body.temperament ? JSON.stringify(body.temperament) : firstDog.temperament,
        routine: body.routine ? JSON.stringify(body.routine) : firstDog.routine,
        trainingGoals: body.trainingGoals ? JSON.stringify(body.trainingGoals) : firstDog.trainingGoals,
        environmentalAnalysis: body.environmentalAnalysis ? JSON.stringify(body.environmentalAnalysis) : firstDog.environmentalAnalysis,
      },
    });
  } else {
    await prisma.dog.create({
      data: {
        clientId: link.clientId,
        name: body.dogName || "Cão",
        breed: body.breed || "",
        age: body.age || "",
        weight: body.weight || "",
        photoUrl: body.photoUrl || "",
        trainingTypes: "[]",
        sex: body.sex || "",
        castrated: !!body.castrated,
        microchip: body.microchip || "",
        color: body.color || "",
        vaccines: JSON.stringify(body.vaccines ?? []),
        dietRestrictions: body.dietRestrictions || "",
        healthConditions: body.healthConditions || "",
        veterinarian: body.veterinarian || "",
        temperament: JSON.stringify(body.temperament ?? {}),
        routine: JSON.stringify(body.routine ?? {}),
        trainingGoals: JSON.stringify(body.trainingGoals ?? {}),
        environmentalAnalysis: JSON.stringify(body.environmentalAnalysis ?? {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
