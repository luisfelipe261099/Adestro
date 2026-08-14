import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SettingsPayload = {
  reminderHoursBefore?: number;
  chargeReminderDaysBefore?: number;
  morningBriefHour?: number;
  defaultStreakTolerance?: number;
  defaultActivities?: string[];
  defaultCommands?: string[];
  defaultTutorTasks?: string[];
  // Cadastro pessoal do adestrador
  name?: string;
  email?: string;
  whatsapp?: string;
  photoUrl?: string;
  signatureUrl?: string;
  // Dados do negócio (módulo 10.1)
  businessName?: string;
  businessDocument?: string;
  businessAddress?: string;
  businessHours?: string;
  logoUrl?: string;
};

const FALLBACK_ACTIVITIES = [
  "Aquecimento",
  "Caminhada estruturada",
  "Treino de foco / Place",
  "Recall (volta ao chamado)",
  "Socialização supervisionada",
  "Sessão livre / brincadeira guiada",
];

const FALLBACK_COMMANDS = ["Senta", "Fica", "Vem", "Junto", "Deita", "Fora", "Solta"];

const FALLBACK_TASKS = [
  "Passeio",
  "Alimentação no horário",
  "Hora de brincar",
  "Tempo de descanso/cama",
  "Treino de senta",
  "Treino de fica",
  "Treino de desce",
  "Socialização com pessoas",
  "Socialização com outros cães",
  "Ignorar estímulos externos",
];

function parseList(raw?: string | null, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : fallback;
  } catch {
    return fallback;
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function ensureTrainer(userId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (trainer) return trainer;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return null;
  return prisma.trainer.create({
    data: {
      userId,
      name: user.name?.trim() || user.email?.split("@")[0] || "Adestrador",
    },
  });
}

// Resposta única de GET e PATCH: a tela recarrega o estado do que voltou daqui,
// então as duas rotas precisam devolver exatamente os mesmos campos.
type TrainerRow = Awaited<ReturnType<typeof ensureTrainer>>;

async function serialize(trainer: NonNullable<TrainerRow>, loginEmail?: string | null) {
  return {
    // Cadastro pessoal. O e-mail de contato cai para o e-mail de login enquanto
    // o adestrador não preencher um — assim a tela nunca abre vazia.
    name: trainer.name ?? "",
    email: trainer.email ?? loginEmail ?? "",
    whatsapp: trainer.whatsapp ?? trainer.phone ?? "",
    photoUrl: trainer.photoUrl ?? "",
    signatureUrl: trainer.signatureUrl ?? "",
    reminderHoursBefore: trainer.reminderHoursBefore,
    chargeReminderDaysBefore: trainer.chargeReminderDaysBefore,
    morningBriefHour: trainer.morningBriefHour,
    defaultStreakTolerance: trainer.defaultStreakTolerance,
    defaultActivities: parseList(trainer.defaultActivities, FALLBACK_ACTIVITIES),
    defaultCommands: parseList(trainer.defaultCommands, FALLBACK_COMMANDS),
    defaultTutorTasks: parseList(trainer.defaultTutorTasks, FALLBACK_TASKS),
    businessName: trainer.businessName ?? "",
    businessDocument: trainer.businessDocument ?? "",
    businessAddress: trainer.businessAddress ?? "",
    businessHours: trainer.businessHours ?? "",
    logoUrl: trainer.logoUrl ?? "",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  return NextResponse.json(await serialize(trainer, session.user.email));
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = (await request.json()) as SettingsPayload;

  const data: Record<string, unknown> = {};

  if (body.reminderHoursBefore !== undefined) {
    data.reminderHoursBefore = clampInt(body.reminderHoursBefore, 1, 168, 24);
  }
  if (body.chargeReminderDaysBefore !== undefined) {
    data.chargeReminderDaysBefore = clampInt(body.chargeReminderDaysBefore, 0, 30, 3);
  }
  if (body.morningBriefHour !== undefined) {
    data.morningBriefHour = clampInt(body.morningBriefHour, 0, 23, 7);
  }
  if (body.defaultStreakTolerance !== undefined) {
    data.defaultStreakTolerance = clampInt(body.defaultStreakTolerance, 0, 100, 100);
  }

  function sanitizeList(list?: string[]): string | undefined {
    if (!Array.isArray(list)) return undefined;
    const clean = list
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0 && item.length <= 80)
      .slice(0, 40);
    return JSON.stringify(clean);
  }

  const activitiesJson = sanitizeList(body.defaultActivities);
  if (activitiesJson !== undefined) data.defaultActivities = activitiesJson;
  const commandsJson = sanitizeList(body.defaultCommands);
  if (commandsJson !== undefined) data.defaultCommands = commandsJson;
  const tasksJson = sanitizeList(body.defaultTutorTasks);
  if (tasksJson !== undefined) data.defaultTutorTasks = tasksJson;

  // Dados do negócio — texto curto trimado; logo é base64 limitado a ~1.5MB.
  const trimField = (v: unknown, max: number): string | undefined =>
    typeof v === "string" ? v.trim().slice(0, max) : undefined;
  if (body.businessName !== undefined) data.businessName = trimField(body.businessName, 120);
  if (body.businessDocument !== undefined) data.businessDocument = trimField(body.businessDocument, 40);
  if (body.businessAddress !== undefined) data.businessAddress = trimField(body.businessAddress, 300);
  if (body.businessHours !== undefined) data.businessHours = trimField(body.businessHours, 120);

  // Cadastro pessoal. Antes esta tela só guardava no navegador — por isso o
  // nome sumia a cada visita. Agora vai para o banco como todo o resto.
  const nome = trimField(body.name, 120);
  if (nome !== undefined && nome.length > 0) data.name = nome;
  if (body.email !== undefined) data.email = trimField(body.email, 160);
  if (body.whatsapp !== undefined) {
    const whats = trimField(body.whatsapp, 40);
    data.whatsapp = whats;
    // `phone` é o campo antigo, ainda lido por telas e mensagens de WhatsApp:
    // mantido em sincronia para não haver dois telefones divergentes.
    data.phone = whats;
  }

  // Imagens em base64 (foto, assinatura, logo) — mesmo limite das demais mídias.
  const imagem = (v: unknown): string | undefined =>
    typeof v === "string" && v.length <= 2_000_000 ? v : undefined;
  if (body.photoUrl !== undefined) data.photoUrl = imagem(body.photoUrl);
  if (body.signatureUrl !== undefined) data.signatureUrl = imagem(body.signatureUrl);
  if (body.logoUrl !== undefined) data.logoUrl = imagem(body.logoUrl);

  const updated = await prisma.trainer.update({
    where: { id: trainer.id },
    data,
  });

  return NextResponse.json(await serialize(updated, session.user.email));
}
