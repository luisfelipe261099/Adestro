import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// LGPD §11.2 — direito do titular de exportar todos os dados próprios.
// Retorna um JSON com tudo que o adestrador (TRAINER) tem na conta.

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    include: {
      clients: {
        include: {
          dogs: true,
          addresses: true,
          portalTasks: true,
          portalFeedbacks: true,
          gamification: true,
          npsResponses: true,
        },
      },
      trainingSessions: {
        include: { dogSessions: true },
      },
      calendarEvents: true,
      payments: true,
      servicePackages: true,
      clientContracts: { include: { invoices: true } },
      portalAccessLinks: {
        select: {
          id: true,
          clientId: true,
          tokenPrefix: true,
          expiresAt: true,
          revokedAt: true,
          lastAccessAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
  });

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    notice: "Export LGPD — dados deste adestrador no Adestro. Trate conforme art. 18, §1º da LGPD.",
    user,
    trainer,
  };

  await audit({
    trainerId: trainer.id,
    action: "export.lgpd",
    actorEmail: session.user.email ?? null,
    request,
  });

  const json = JSON.stringify(exportPayload, null, 2);
  const filename = `adestro-export-${trainer.id}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
