import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = (await request.json()) as { clientId?: string; tags?: string[] };
  if (!body.clientId || !Array.isArray(body.tags)) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const sanitized = body.tags
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter((t) => t.length > 0 && t.length <= 40)
    .slice(0, 12);

  const updated = await prisma.clientProfile.updateMany({
    where: { id: body.clientId, trainerId: trainer.id },
    data: { tags: JSON.stringify(sanitized) },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
  }

  await audit({
    trainerId: trainer.id,
    action: "client.updated",
    resourceId: body.clientId,
    detail: { tags: sanitized },
    actorEmail: session.user.email ?? null,
    request,
  });

  return NextResponse.json({ tags: sanitized });
}
