import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedPlans = ["Trial", "Starter", "Pro", "Business"] as const;
type AllowedPlan = (typeof allowedPlans)[number];

// PATCH /api/trainer/plan – atualiza plano do adestrador logado
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as { plan?: string };
  const plan = (body.plan ?? "").trim() as AllowedPlan;

  if (!allowedPlans.includes(plan)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 422 });
  }

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) {
    return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });
  }

  const updated = await prisma.trainer.update({
    where: { id: trainer.id },
    data: { plan },
    select: { id: true, plan: true },
  });

  return NextResponse.json({ ok: true, trainer: updated });
}
