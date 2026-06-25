import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPlanLimits, getTrialDaysRemaining, normalizePlan } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true, trialEndsAt: true },
  });

  if (!trainer) {
    return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });
  }

  const plan = normalizePlan(trainer.plan);
  const limits = getPlanLimits(plan);
  const daysRemaining = getTrialDaysRemaining(trainer.trialEndsAt);

  const [clientCount, sessionThisMonth] = await Promise.all([
    prisma.clientProfile.count({ where: { trainerId: trainer.id } }),
    prisma.trainingSession.count({
      where: {
        trainerId: trainer.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return NextResponse.json({
    plan,
    trialEndsAt: trainer.trialEndsAt,
    daysRemaining,
    isTrial: plan === "Trial",
    usage: {
      clients: clientCount,
      sessionsThisMonth: sessionThisMonth,
    },
    limits: {
      clients: limits.clients,
      monthlySessions: limits.monthlySessions,
      trainers: limits.trainers,
      dogsPerClient: limits.dogsPerClient,
      storageMb: limits.storageMb,
    },
  });
}
