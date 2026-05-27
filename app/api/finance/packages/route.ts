import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/finance/packages
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const packages = await prisma.servicePackage.findMany({
    where: { trainerId: trainer.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(packages);
}

// POST /api/finance/packages
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as {
    name: string;
    type?: string;
    sessionsCount: number;
    amount: number;
    isFractioned?: boolean;
    fractionSessions?: number;
    validityDays?: number;
    description?: string;
  };

  if (!body.name || !body.sessionsCount || !body.amount) {
    return NextResponse.json({ error: "Nome, sessões e valor são obrigatórios" }, { status: 400 });
  }

  const created = await prisma.servicePackage.create({
    data: {
      trainerId: trainer.id,
      name: body.name,
      type: body.type ?? "Pacote",
      sessionsCount: Number(body.sessionsCount),
      amount: Number(body.amount),
      isFractioned: body.isFractioned ?? false,
      fractionSessions: body.fractionSessions ? Number(body.fractionSessions) : 1,
      validityDays: body.validityDays ? Number(body.validityDays) : 60,
      description: body.description ?? "",
      status: "Ativo",
    },
  });

  return NextResponse.json(created, { status: 201 });
}
