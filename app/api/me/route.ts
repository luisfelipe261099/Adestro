import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me – retorna dados do perfil logado
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id:    true,
      email: true,
      name:  true,
      role:  true,
      trainer: { select: { id: true, plan: true } },
      client:  { select: { id: true } },
    },
  });

  return NextResponse.json(user);
}
