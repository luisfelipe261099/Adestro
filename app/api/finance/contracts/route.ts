import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/finance/contracts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const contracts = await prisma.clientContract.findMany({
    where: { trainerId: trainer.id },
    include: {
      client: { select: { id: true, name: true } },
      dog: { select: { id: true, name: true } },
      servicePackage: { select: { name: true } },
      invoices: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contracts);
}

// POST /api/finance/contracts (Venda de Pacote)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    clientId: string;
    dogId?: string;
    packageId?: string;
    name: string;
    sessionsCount: number;
    amount: number;
    isFractioned?: boolean;
    fractionSessions?: number;
    startDate: string; // YYYY-MM-DD
    notes?: string;
  };

  if (!body.clientId || !body.name || !body.sessionsCount || !body.amount || !body.startDate) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // Criar contrato
  const contract = await prisma.clientContract.create({
    data: {
      trainerId: trainer.id,
      clientId: body.clientId,
      dogId: body.dogId || null,
      packageId: body.packageId || null,
      name: body.name,
      sessionsCount: Number(body.sessionsCount),
      amount: Number(body.amount),
      isFractioned: body.isFractioned ?? false,
      fractionSessions: body.fractionSessions ? Number(body.fractionSessions) : 1,
      startDate: body.startDate,
      status: "Ativo",
      notes: body.notes ?? "",
    },
  });

  // Gerar faturas (Invoices)
  const isFractioned = body.isFractioned ?? false;
  const fraction = body.fractionSessions ? Number(body.fractionSessions) : 1;
  const totalSessions = Number(body.sessionsCount);

  if (isFractioned && fraction > 0 && fraction < totalSessions) {
    const installments = Math.ceil(totalSessions / fraction);
    const installmentAmount = Math.round((Number(body.amount) / installments) * 100) / 100;

    for (let i = 0; i < installments; i++) {
      // Calcular vencimento (+30 dias por parcela)
      const start = new Date(body.startDate);
      start.setDate(start.getDate() + i * 30);
      const dueDateStr = start.toLocaleDateString("pt-BR");

      await prisma.clientInvoice.create({
        data: {
          trainerId: trainer.id,
          contractId: contract.id,
          description: `${body.name} — Parcela ${i + 1} de ${installments}`,
          amount: installmentAmount,
          status: "Pendente",
          dueDate: dueDateStr,
        },
      });
    }
  } else {
    // Parcela única
    const dateParts = body.startDate.split("-");
    const formattedDueDate = dateParts.length === 3 
      ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` 
      : body.startDate;

    await prisma.clientInvoice.create({
      data: {
        trainerId: trainer.id,
        contractId: contract.id,
        description: `${body.name} — Parcela única`,
        amount: Number(body.amount),
        status: "Pendente",
        dueDate: formattedDueDate,
      },
    });
  }

  return NextResponse.json(contract, { status: 201 });
}
