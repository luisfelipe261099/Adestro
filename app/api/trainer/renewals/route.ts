import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/trainer/renewals – histórico do adestrador logado
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json([]);

  const renewals = await prisma.subscriptionRenewal.findMany({
    where: { trainerId: trainer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(renewals);
}

// POST /api/trainer/renewals – registra renovação no histórico
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) {
    return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as {
    planName?: string;
    lessonPackage?: string;
    paymentMethod?: string;
    amount?: number;
    status?: string;
    reference?: string;
    dueDate?: string;
  };

  const planName = (body.planName ?? "").trim();
  const lessonPackage = (body.lessonPackage ?? "").trim();
  const paymentMethod = (body.paymentMethod ?? "").trim();
  const amount = Number(body.amount ?? 0);

  if (!planName || !lessonPackage || !paymentMethod || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
  }

  const renewal = await prisma.subscriptionRenewal.create({
    data: {
      trainerId: trainer.id,
      planName,
      lessonPackage,
      paymentMethod,
      amount,
      status: body.status ?? "Gerada",
      reference: body.reference,
      dueDate: body.dueDate,
    },
  });

  return NextResponse.json({ ok: true, renewal });
}
