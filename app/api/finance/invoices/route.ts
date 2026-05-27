import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/finance/invoices
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const invoices = await prisma.clientInvoice.findMany({
    where: { trainerId: trainer.id },
    include: {
      contract: {
        include: {
          client: { select: { name: true } },
          dog: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    invoices.map((inv) => ({
      id: inv.id,
      clientName: inv.contract.client.name,
      dogName: inv.contract.dog?.name ?? "Geral",
      packageName: inv.contract.name,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      method: inv.paymentMethod ?? undefined,
      paidAt: inv.paidAt ?? undefined,
    }))
  );
}

// PATCH /api/finance/invoices (Liquidar Fatura)
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    invoiceId: string;
    status: "Pago" | "Pendente" | "Atrasado";
    paymentMethod?: string;
  };

  if (!body.invoiceId || !body.status) {
    return NextResponse.json({ error: "Fatura ID e status são obrigatórios" }, { status: 400 });
  }

  const updated = await prisma.clientInvoice.update({
    where: {
      id: body.invoiceId,
      trainerId: trainer.id,
    },
    data: {
      status: body.status,
      paymentMethod: body.paymentMethod || null,
      paidAt: body.status === "Pago" ? new Date().toLocaleDateString("pt-BR") : null,
    },
  });

  return NextResponse.json(updated);
}
