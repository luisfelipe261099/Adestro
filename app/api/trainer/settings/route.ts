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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  return NextResponse.json({
    reminderHoursBefore: trainer.reminderHoursBefore,
    chargeReminderDaysBefore: trainer.chargeReminderDaysBefore,
    morningBriefHour: trainer.morningBriefHour,
    defaultStreakTolerance: trainer.defaultStreakTolerance,
    defaultActivities: parseList(trainer.defaultActivities, FALLBACK_ACTIVITIES),
    defaultCommands: parseList(trainer.defaultCommands, FALLBACK_COMMANDS),
    defaultTutorTasks: parseList(trainer.defaultTutorTasks, FALLBACK_TASKS),
  });
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

  const updated = await prisma.trainer.update({
    where: { id: trainer.id },
    data,
  });

  return NextResponse.json({
    reminderHoursBefore: updated.reminderHoursBefore,
    chargeReminderDaysBefore: updated.chargeReminderDaysBefore,
    morningBriefHour: updated.morningBriefHour,
    defaultStreakTolerance: updated.defaultStreakTolerance,
    defaultActivities: parseList(updated.defaultActivities, FALLBACK_ACTIVITIES),
    defaultCommands: parseList(updated.defaultCommands, FALLBACK_COMMANDS),
    defaultTutorTasks: parseList(updated.defaultTutorTasks, FALLBACK_TASKS),
  });
}
