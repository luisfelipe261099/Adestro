import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const action = url.searchParams.get("action") ?? undefined;

  const logs = await prisma.auditLog.findMany({
    where: { trainerId: trainer.id, ...(action ? { action } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
