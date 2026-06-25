import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parse(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const safe: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") safe[key] = value;
      }
      return safe;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { whatsappTemplates: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  return NextResponse.json(parse(trainer.whatsappTemplates));
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" && value.trim().length > 0) {
      sanitized[key] = value.trim().slice(0, 400);
    }
  }

  await prisma.trainer.update({
    where: { id: trainer.id },
    data: { whatsappTemplates: JSON.stringify(sanitized) },
  });

  await audit({
    trainerId: trainer.id,
    action: "template.updated",
    detail: { keys: Object.keys(sanitized) },
    actorEmail: session.user.email ?? null,
    request,
  });

  return NextResponse.json(sanitized);
}
