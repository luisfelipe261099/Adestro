import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getMonthlyValueByPlan(plan?: string): number {
  const normalized = (plan ?? "").trim().toLowerCase();
  if (normalized === "business" || normalized === "premium") return 990;
  if (normalized === "pro") return 690;
  if (normalized === "starter" || normalized === "essencial") return 420;
  return 0;
}

function getTrainerStatus(plan?: string, trialEndsAt?: Date | null): "Ativo" | "Trial" {
  const normalized = (plan ?? "").trim().toLowerCase();
  if (normalized === "trial") {
    if (!trialEndsAt) return "Trial";
    return trialEndsAt >= new Date() ? "Trial" : "Ativo";
  }
  return "Ativo";
}

// GET /api/admin/overview
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const [trainers, recentPayments, sessionsMonth] = await Promise.all([
    prisma.trainer.findMany({
      include: {
        user: { select: { email: true } },
        clients: { select: { _count: { select: { dogs: true } } } },
        _count: {
          select: {
            trainingSessions: true,
            payments: true,
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      include: {
        trainer: { select: { name: true, plan: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.trainingSession.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const normalizedTrainers = trainers.map((trainer) => {
    const dogs = trainer.clients.reduce((sum, client) => sum + client._count.dogs, 0);
    const paidRevenue = trainer.payments
      .filter((payment) => payment.status === "Pago")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingRevenue = trainer.payments
      .filter((payment) => payment.status === "Pendente")
      .reduce((sum, payment) => sum + payment.amount, 0);

    const monthlyValue = getMonthlyValueByPlan(trainer.plan);
    const status = getTrainerStatus(trainer.plan, trainer.trialEndsAt);

    return {
      id: trainer.id,
      userId: trainer.userId,
      name: trainer.name,
      email: trainer.user.email,
      joinedAt: trainer.createdAt.toLocaleDateString("pt-BR"),
      status,
      planType: trainer.plan || "Trial",
      monthlyValue,
      dogs,
      sessions: trainer._count.trainingSessions,
      paidRevenue,
      pendingRevenue,
    };
  });

  const totalTrainers = normalizedTrainers.length;
  const activeTrainers = normalizedTrainers.filter((trainer) => trainer.status === "Ativo").length;
  const trialTrainers = normalizedTrainers.filter((trainer) => trainer.status === "Trial").length;
  const totalDogs = normalizedTrainers.reduce((sum, trainer) => sum + trainer.dogs, 0);
  const mrr = normalizedTrainers.reduce((sum, trainer) => sum + trainer.monthlyValue, 0);

  const totalPaid = recentPayments
    .filter((payment) => payment.status === "Pago")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = recentPayments
    .filter((payment) => payment.status === "Pendente")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const planDistribution = normalizedTrainers.reduce<Record<string, number>>((acc, trainer) => {
    const key = trainer.planType || "Trial";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const recentTransactions = recentPayments.map((payment) => ({
    id: payment.id,
    trainer: payment.trainer.name,
    plan: payment.trainer.plan || "Trial",
    amount: payment.amount,
    status: payment.status,
    date: payment.createdAt.toLocaleDateString("pt-BR"),
    source: "Assinatura",
  }));

  return NextResponse.json({
    metrics: {
      totalTrainers,
      activeTrainers,
      trialTrainers,
      totalDogs,
      mrr,
      totalPaid,
      totalPending,
      arr: mrr * 12,
      sessionsMonth,
      averageDogsPerTrainer: totalTrainers ? Number((totalDogs / totalTrainers).toFixed(1)) : 0,
    },
    planDistribution,
    trainers: normalizedTrainers,
    recentTransactions,
  });
}
