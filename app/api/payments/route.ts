import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/payments  – assinaturas do adestrador (trainer -> SaaS)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const payments = await prisma.payment.findMany({
    where:   { trainerId: trainer.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payments);
}

// POST /api/payments  – registra cobrança de assinatura (renovação do plano)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    description: string;
    amount: number;
    paymentMethod?: string;
    dueDate?: string;
    reference?: string;
  };

  const payment = await prisma.payment.create({
    data: {
      trainerId:     trainer.id,
      description:   body.description,
      amount:        body.amount,
      status:        "Pendente",
      paymentMethod: body.paymentMethod,
      dueDate:       body.dueDate,
      reference:     body.reference,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
