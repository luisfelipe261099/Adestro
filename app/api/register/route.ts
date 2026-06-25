import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST /api/register – cria conta de adestrador com plano escolhido
export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string; plan?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const name     = (body.name     ?? "").trim();
  const email    = (body.email    ?? "").trim().toLowerCase();
  const password = (body.password ?? "");
  const plan     = (body.plan     ?? "Trial").trim();

  const allowedPlans = ["Trial", "Starter", "Pro", "Business"];
  const safePlan = allowedPlans.includes(plan) ? plan : "Trial";

  // Validações básicas de entrada
  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome completo." }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 422 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 422 });
  }

  // E-mail único
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Trial de 90 dias se plano for Trial, caso contrário sem expiração
  const trialEndsAt = safePlan === "Trial" ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "TRAINER",
        },
      });

      await tx.trainer.create({
        data: {
          userId:     user.id,
          name,
          plan:       safePlan,
          ...(trialEndsAt ? { trialEndsAt } : {}),
        },
      });
    });
  } catch (dbError) {
    console.error("[register] DB error:", dbError);
    return NextResponse.json({ error: "Erro ao criar a conta. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
