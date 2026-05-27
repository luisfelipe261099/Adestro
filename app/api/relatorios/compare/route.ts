import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Comparativo de evolução: dois meses lado a lado para um cão específico.
// Retorna métricas agregadas (sessões, comandos médios, NPS, conclusão de tarefas).

function parseMonthYear(value: string): { year: number; month: number } | null {
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const lower = value.toLowerCase();
  const match = monthNames.findIndex((name) => lower.startsWith(name));
  if (match < 0) return null;
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  return { year: Number(yearMatch[1]), month: match };
}

async function aggregateForMonth(trainerId: string, dogId: string, year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const dogSessions = await prisma.dogTrainingSession.findMany({
    where: {
      dogId,
      session: { trainerId, createdAt: { gte: start, lt: end } },
    },
    select: { commands: true, activities: true, aiApproved: true, session: { select: { date: true } } },
  });

  let totalCommands = 0;
  let totalRatingSum = 0;
  let totalActivities = 0;
  let activitiesCompleted = 0;

  for (const ds of dogSessions) {
    try {
      const commands = JSON.parse(ds.commands || "[]") as Array<{ rating?: number }>;
      for (const cmd of commands) {
        if (typeof cmd.rating === "number") {
          totalCommands += 1;
          totalRatingSum += cmd.rating;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const activities = JSON.parse(ds.activities || "[]") as Array<{ completed?: boolean }>;
      for (const act of activities) {
        totalActivities += 1;
        if (act.completed) activitiesCompleted += 1;
      }
    } catch {
      /* ignore */
    }
  }

  const nps = await prisma.npsResponse.findMany({
    where: {
      session: { trainerId, createdAt: { gte: start, lt: end } },
    } as never,
    select: { score: true },
  });

  return {
    sessions: dogSessions.length,
    averageCommandRating: totalCommands === 0 ? 0 : totalRatingSum / totalCommands,
    activitiesCompletionRate: totalActivities === 0 ? 0 : (activitiesCompleted / totalActivities) * 100,
    npsAverage:
      nps.length === 0
        ? null
        : nps.reduce((sum, n) => sum + n.score, 0) / nps.length,
    approvedSessions: dogSessions.filter((ds) => ds.aiApproved).length,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const url = new URL(request.url);
  const dogId = url.searchParams.get("dogId");
  const monthA = url.searchParams.get("monthA");
  const monthB = url.searchParams.get("monthB");

  if (!dogId || !monthA || !monthB) {
    return NextResponse.json({ error: "Parametros: dogId, monthA, monthB" }, { status: 400 });
  }

  const parsedA = parseMonthYear(monthA);
  const parsedB = parseMonthYear(monthB);
  if (!parsedA || !parsedB) {
    return NextResponse.json({ error: "Formato dos meses invalido (use 'mês de YYYY')" }, { status: 400 });
  }

  const [aggA, aggB] = await Promise.all([
    aggregateForMonth(trainer.id, dogId, parsedA.year, parsedA.month),
    aggregateForMonth(trainer.id, dogId, parsedB.year, parsedB.month),
  ]);

  return NextResponse.json({
    dogId,
    monthA: { label: monthA, ...aggA },
    monthB: { label: monthB, ...aggB },
    delta: {
      sessions: aggB.sessions - aggA.sessions,
      averageCommandRating: aggB.averageCommandRating - aggA.averageCommandRating,
      activitiesCompletionRate: aggB.activitiesCompletionRate - aggA.activitiesCompletionRate,
      npsAverage:
        aggA.npsAverage === null || aggB.npsAverage === null
          ? null
          : aggB.npsAverage - aggA.npsAverage,
    },
  });
}
