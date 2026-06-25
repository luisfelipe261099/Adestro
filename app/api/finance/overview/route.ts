import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/finance/overview
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const invoices = await prisma.clientInvoice.findMany({
    where: { trainerId: trainer.id },
  });

  const contracts = await prisma.clientContract.findMany({
    where: { trainerId: trainer.id },
  });

  // Somatório das estatísticas
  let totalReceived = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  invoices.forEach((inv) => {
    if (inv.status === "Pago") {
      totalReceived += inv.amount;
    } else if (inv.status === "Atrasado") {
      totalOverdue += inv.amount;
    } else {
      totalPending += inv.amount;
    }
  });

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status === "Ativo").length;

  const totalRevenue = totalReceived + totalPending + totalOverdue;
  const recurrenceRate = totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 100;
  const averageTicket = activeContracts > 0 ? Math.round(totalReceived / activeContracts) : 0;

  return NextResponse.json({
    metrics: {
      received: totalReceived,
      pending: totalPending,
      overdue: totalOverdue,
      activeContracts: activeContracts,
    },
    previsibilidade: {
      totalContracted: totalRevenue,
      recurrenceRate: recurrenceRate,
      averageTicket: averageTicket,
    },
  });
}
