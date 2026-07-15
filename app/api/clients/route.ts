import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkLimit } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

const DOG_BREED_DEFAULTS: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["golden retriever", "golden"],
    url: "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg",
  },
  {
    keywords: ["labrador"],
    url: "https://images.dog.ceo/breeds/labrador/n02099712_6856.jpg",
  },
  {
    keywords: ["border collie", "collie"],
    url: "https://images.dog.ceo/breeds/collie-border/n02106166_355.jpg",
  },
  {
    keywords: ["pastor alemao", "german shepherd", "pastor"],
    url: "https://images.dog.ceo/breeds/germanshepherd/n02106662_24175.jpg",
  },
  {
    keywords: ["poodle"],
    url: "https://images.dog.ceo/breeds/poodle-standard/n02113799_2280.jpg",
  },
  {
    keywords: ["spitz", "lulu da pomerania", "pomerania"],
    url: "https://images.dog.ceo/breeds/pomeranian/n02112018_1002.jpg",
  },
  {
    keywords: ["bulldog"],
    url: "https://images.dog.ceo/breeds/bulldog-french/n02108915_5306.jpg",
  },
  {
    keywords: ["beagle"],
    url: "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg",
  },
  {
    keywords: ["rottweiler", "rott"],
    url: "https://images.dog.ceo/breeds/rottweiler/n02106550_10620.jpg",
  },
  {
    keywords: ["shih tzu", "shitzu"],
    url: "https://images.dog.ceo/breeds/shihtzu/n02086240_2329.jpg",
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sanitizePhotoUrl(photoUrl?: string): string | undefined {
  const value = (photoUrl ?? "").trim();
  if (!value) return undefined;

  // A coluna photoUrl é VARCHAR(191). Data URLs (base64) e URLs muito longas
  // estouram esse limite e quebram o INSERT ("value too long for column").
  // Nesses casos descartamos a foto (cai no padrão por raça). Para PERSISTIR a
  // foto enviada, a coluna precisa virar @db.Text (ver nota no fim do arquivo).
  if (value.length > 191) return undefined;
  if (/^https?:\/\//i.test(value)) return value;

  return undefined;
}

function getDefaultDogPhotoByBreed(breed?: string): string | undefined {
  const normalizedBreed = normalizeText(breed ?? "");
  if (!normalizedBreed) return undefined;

  for (const item of DOG_BREED_DEFAULTS) {
    if (item.keywords.some((keyword) => normalizedBreed.includes(normalizeText(keyword)))) {
      return item.url;
    }
  }

  return undefined;
}

/**
 * Garante que o adestrador logado tenha um perfil na tabela Trainer. Algumas
 * contas (criadas pelo admin ou em versões antigas) têm User role=TRAINER mas
 * nenhum registro Trainer — o que fazia o cadastro de cliente dar 404 "sem
 * adestrador" para sempre. Mesmo padrão já usado em /api/trainer/settings e
 * /api/portal-links. Cria sob demanda; null só se o próprio User sumiu.
 */
async function ensureTrainer(userId: string) {
  const existing = await prisma.trainer.findUnique({ where: { userId } });
  if (existing) return existing;
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

// GET /api/clients
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const clients = await prisma.clientProfile.findMany({
    where:   { trainerId: trainer.id },
    include: { dogs: true },
    orderBy: { createdAt: "desc" },
  });

  // Total de sessões por cão = soma de sessionsCount dos contratos ATIVOS.
  // Alimenta "Sessão X de Y" e o progresso do card do cão (Fase 2 — análise GPT).
  const contracts = await prisma.clientContract.findMany({
    where:  { trainerId: trainer.id, status: "Ativo" },
    select: { dogId: true, sessionsCount: true },
  });
  const totalByDog = new Map<string, number>();
  for (const c of contracts) {
    if (c.dogId) totalByDog.set(c.dogId, (totalByDog.get(c.dogId) ?? 0) + c.sessionsCount);
  }

  const withTotals = clients.map((client) => ({
    ...client,
    dogs: client.dogs.map((dog) => ({ ...dog, sessionsTotal: totalByDog.get(dog.id) ?? 0 })),
  }));

  return NextResponse.json(withTotals);
}

// POST /api/clients
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  // Enforcement de limite de clientes por plano (módulo 1 §SaaS)
  const currentClientCount = await prisma.clientProfile.count({ where: { trainerId: trainer.id } });
  const limitCheck = checkLimit({
    plan: trainer.plan,
    resource: "client",
    currentCount: currentClientCount,
  });
  if (!limitCheck.ok) {
    return NextResponse.json(
      { error: limitCheck.reason, code: "PLAN_LIMIT", limit: limitCheck.limit, current: limitCheck.current },
      { status: 402 },
    );
  }

  const body = await request.json() as {
    // Dados do Cliente
    clientName: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    cpf?: string;
    clientPhotoUrl?: string;
    privateNotes?: string;
    status?: string;
    propertyType?: string;
    environment?: string;
    plan?: string;
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

    // Dados do Cão
    dogName: string;
    breed?: string;
    age?: string;
    weight?: string;
    photoUrl?: string;
    trainingTypes?: string[];
    sex?: string;
    castrated?: boolean;
    microchip?: string;
    color?: string;
    photos?: string[];
    videos?: string[];
    vaccines?: any[];
    dietRestrictions?: string;
    healthConditions?: string;
    veterinarian?: string;
    temperament?: any;
    routine?: any;
    trainingGoals?: any;
    environmentalAnalysis?: any;
  };

  const resolvedDogPhotoUrl = sanitizePhotoUrl(body.photoUrl) ?? getDefaultDogPhotoByBreed(body.breed);

  try {
    const client = await prisma.clientProfile.create({
    data: {
      trainerId:      trainer.id,
      name:           body.clientName,
      phone:          body.phone          ?? "",
      email:          body.email          ?? "",
      birthDate:      body.birthDate      ?? "",
      cpf:            body.cpf            ?? "",
      photoUrl:       sanitizePhotoUrl(body.clientPhotoUrl) ?? "",
      privateNotes:   body.privateNotes   ?? "",
      status:         body.status         ?? "Ativo",
      propertyType:   body.propertyType   ?? "",
      environment:    body.environment    ?? "",
      plan:           body.plan           ?? "",
      
      addresses: {
        create: (body.addresses ?? []).map(addr => ({
          nickname:     addr.nickname,
          zipCode:      addr.zipCode      ?? "",
          street:       addr.street,
          number:       addr.number       ?? "",
          complement:   addr.complement   ?? "",
          neighborhood: addr.neighborhood ?? "",
          city:         addr.city         ?? "",
          state:        addr.state        ?? "",
          isDefault:    !!addr.isDefault,
        }))
      },

      dogs: {
        create: {
          name:                  body.dogName,
          breed:                 body.breed                 ?? "",
          age:                   body.age                   ?? "",
          weight:                body.weight                ?? "",
          photoUrl:              resolvedDogPhotoUrl,
          trainingTypes:         JSON.stringify(body.trainingTypes ?? []),
          sex:                   body.sex                   ?? "",
          castrated:             !!body.castrated,
          microchip:             body.microchip             ?? "",
          color:                 body.color                 ?? "",
          photos:                JSON.stringify(body.photos ?? []),
          videos:                JSON.stringify(body.videos ?? []),
          vaccines:              JSON.stringify(body.vaccines ?? []),
          dietRestrictions:      body.dietRestrictions      ?? "",
          healthConditions:      body.healthConditions      ?? "",
          veterinarian:          body.veterinarian          ?? "",
          temperament:           JSON.stringify(body.temperament           ?? {}),
          routine:               JSON.stringify(body.routine               ?? {}),
          trainingGoals:         JSON.stringify(body.trainingGoals         ?? {}),
          environmentalAnalysis: JSON.stringify(body.environmentalAnalysis ?? {}),
        },
      },
    },
    include: {
      dogs: true,
      addresses: true,
    },
  });

    await audit({
      trainerId: trainer.id,
      action: "client.created",
      resourceId: client.id,
      detail: { name: client.name, dogName: body.dogName },
      actorEmail: session.user.email ?? null,
      request,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    // Sem try/catch, um erro do Prisma virava 500 SEM corpo JSON e o app só
    // mostrava o fallback genérico. Agora devolvemos a mensagem real do banco
    // para diagnóstico (ex.: "Can't reach database server", violação de
    // constraint, coluna ausente).
    console.error("[clients.POST] erro ao criar cliente:", err);
    const detail = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json(
      { error: `Não foi possível salvar no banco. ${detail}` },
      { status: 500 },
    );
  }
}

// PATCH /api/clients
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    clientId: string;
    status?: string;
    // Edição dos dados do cliente:
    name?: string;
    phone?: string;
    email?: string;
    propertyType?: string;
    environment?: string;
    // Edição de UM cão existente:
    dog?: { id: string; name?: string; breed?: string; age?: string; trainingStatus?: string };
    // Adicionar um cão novo a este cliente:
    addDog?: { name: string; breed?: string; age?: string };
  };
  if (!body.clientId) {
    return NextResponse.json({ error: "clientId é obrigatório" }, { status: 400 });
  }

  // Confirma que o cliente pertence a este adestrador (segurança).
  const owned = await prisma.clientProfile.findFirst({
    where: { id: body.clientId, trainerId: trainer.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  try {
    // Campos do cliente (só os que vieram).
    const clientData: {
      status?: string; name?: string; phone?: string; email?: string;
      propertyType?: string; environment?: string;
    } = {};
    if (body.status !== undefined) clientData.status = body.status;
    if (body.name !== undefined) clientData.name = body.name;
    if (body.phone !== undefined) clientData.phone = body.phone;
    if (body.email !== undefined) clientData.email = body.email;
    if (body.propertyType !== undefined) clientData.propertyType = body.propertyType;
    if (body.environment !== undefined) clientData.environment = body.environment;
    if (Object.keys(clientData).length > 0) {
      await prisma.clientProfile.update({ where: { id: body.clientId }, data: clientData });
    }

    // Editar um cão existente (garante que é deste cliente).
    if (body.dog?.id) {
      const dogData: { name?: string; breed?: string; age?: string; trainingStatus?: string } = {};
      if (body.dog.name !== undefined) dogData.name = body.dog.name;
      if (body.dog.breed !== undefined) dogData.breed = body.dog.breed;
      if (body.dog.age !== undefined) dogData.age = body.dog.age;
      if (body.dog.trainingStatus !== undefined) {
        const allowed = ["Ficha", "Ativo", "Completo", "Pausado", "Cancelado"];
        if (!allowed.includes(body.dog.trainingStatus)) {
          return NextResponse.json({ error: "trainingStatus inválido" }, { status: 400 });
        }
        dogData.trainingStatus = body.dog.trainingStatus;
      }
      if (Object.keys(dogData).length > 0) {
        await prisma.dog.updateMany({ where: { id: body.dog.id, clientId: body.clientId }, data: dogData });
      }
    }

    // Adicionar um cão novo.
    if (body.addDog?.name) {
      await prisma.dog.create({
        data: {
          clientId: body.clientId,
          name: body.addDog.name,
          breed: body.addDog.breed ?? "",
          age: body.addDog.age ?? "",
          trainingTypes: JSON.stringify([]),
        },
      });
    }

    const updatedClient = await prisma.clientProfile.findUnique({
      where: { id: body.clientId },
      include: { dogs: true },
    });
    return NextResponse.json(updatedClient);
  } catch (err) {
    console.error("[clients.PATCH] erro ao editar:", err);
    const detail = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: `Não foi possível salvar. ${detail}` }, { status: 500 });
  }
}

