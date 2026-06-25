import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashEndpoint, sendPush } from "@/lib/push";

// Endpoint executado pelo Vercel Cron (config no vercel.json).
// Roda diariamente e prepara o "brief" do dia para cada adestrador:
//   - aulas de amanhã que precisam de lembrete WhatsApp
//   - cobranças vencendo dentro da janela configurada
//   - relatórios com resumo IA aguardando aprovação
//
// MVP gratuito: NÃO envia nada automaticamente (zero custo de SMS/WhatsApp API).
// Em vez disso, cada chamada GET retorna a lista pronta com deeplinks wa.me
// para o adestrador disparar em massa quando abrir o app pela manhã.

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron envia automaticamente Authorization: Bearer <CRON_SECRET>.
  // Quando CRON_SECRET não está definido (dev local), permitimos qualquer chamada.
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const trainerIdFilter = url.searchParams.get("trainerId");

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);

  const trainers = await prisma.trainer.findMany({
    where: trainerIdFilter ? { id: trainerIdFilter } : undefined,
    select: {
      id: true,
      name: true,
      reminderHoursBefore: true,
      chargeReminderDaysBefore: true,
    },
  });

  const briefs = await Promise.all(
    trainers.map(async (trainer) => {
      const chargeWindowEnd = new Date(now);
      chargeWindowEnd.setDate(chargeWindowEnd.getDate() + (trainer.chargeReminderDaysBefore || 3));
      const chargeWindowEndStr = toDateString(chargeWindowEnd);

      // Auto-encerrar contratos expirados (validade do pacote — módulo 6.2)
      const todayStr = toDateString(now);
      const activeContracts = await prisma.clientContract.findMany({
        where: { trainerId: trainer.id, status: "Ativo" },
        include: { servicePackage: { select: { validityDays: true } } },
      });
      const expiredIds: string[] = [];
      for (const contract of activeContracts) {
        const validityDays = contract.servicePackage?.validityDays ?? 60;
        const start = new Date(contract.startDate);
        if (Number.isNaN(start.getTime())) continue;
        const expiresAt = new Date(start);
        expiresAt.setDate(expiresAt.getDate() + validityDays);
        if (expiresAt.getTime() < now.getTime()) expiredIds.push(contract.id);
      }
      if (expiredIds.length > 0) {
        await prisma.clientContract.updateMany({
          where: { id: { in: expiredIds } },
          data: { status: "Encerrado" },
        });
      }

      const [events, invoices, awaitingApproval] = await Promise.all([
        prisma.calendarEvent.findMany({
          where: {
            trainerId: trainer.id,
            day: tomorrowStr,
            status: { in: ["Confirmado", "Pendente", "Aguardando"] },
          },
          select: { id: true, day: true, time: true, dog: true, client: true, status: true, clientId: true },
        }),
        prisma.clientInvoice.findMany({
          where: {
            trainerId: trainer.id,
            status: { in: ["Pendente", "Atrasado"] },
            dueDate: { lte: chargeWindowEndStr },
          },
          include: {
            contract: { include: { client: { select: { name: true, phone: true } } } },
          },
        }),
        prisma.dogTrainingSession.findMany({
          where: {
            session: { trainerId: trainer.id },
            aiSummary: { not: null },
            aiApproved: false,
          },
          select: {
            id: true,
            session: { select: { id: true, date: true, title: true } },
            dog: { select: { name: true } },
          },
          take: 10,
        }),
      ]);

      // Push notification ao adestrador (se inscrito) com o resumo do dia.
      const totalToday = events.length + invoices.length + awaitingApproval.length;
      if (totalToday > 0) {
        const subs = await prisma.pushSubscription.findMany({ where: { trainerId: trainer.id } });
        const body = `${events.length} aula(s), ${invoices.length} cobrança(s), ${awaitingApproval.length} resumo(s) p/ aprovar`;
        for (const sub of subs) {
          const result = await sendPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
            { title: "☀️ Resumo do dia — Adestro", body, url: "/dashboard", tag: "daily-brief" },
          );
          if (!result.ok && (result.status === 404 || result.status === 410)) {
            await prisma.pushSubscription.deleteMany({
              where: { trainerId: trainer.id, endpointHash: hashEndpoint(sub.endpoint) },
            });
          } else if (result.ok) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { lastUsedAt: new Date() },
            });
          }
        }
      }

      return {
        trainerId: trainer.id,
        trainerName: trainer.name,
        date: toDateString(now),
        windowReminderHours: trainer.reminderHoursBefore,
        windowChargeDays: trainer.chargeReminderDaysBefore,
        contractsExpired: expiredIds.length,
        reminders: events.map((event) => ({
          type: "reminder",
          eventId: event.id,
          clientId: event.clientId,
          client: event.client,
          dog: event.dog,
          time: event.time,
          status: event.status,
        })),
        charges: invoices.map((invoice) => ({
          type: "charge",
          invoiceId: invoice.id,
          client: invoice.contract.client.name,
          phone: invoice.contract.client.phone,
          dueDate: invoice.dueDate,
          amount: invoice.amount,
          status: invoice.status,
        })),
        approvals: awaitingApproval.map((item) => ({
          type: "approval",
          sessionId: item.session.id,
          dogSessionId: item.id,
          dog: item.dog?.name ?? "—",
          sessionTitle: item.session.title,
          sessionDate: item.session.date,
        })),
      };
    }),
  );

  const summary = {
    runAt: now.toISOString(),
    tomorrow: tomorrowStr,
    trainersCount: trainers.length,
    totalReminders: briefs.reduce((sum, b) => sum + b.reminders.length, 0),
    totalCharges: briefs.reduce((sum, b) => sum + b.charges.length, 0),
    totalApprovals: briefs.reduce((sum, b) => sum + b.approvals.length, 0),
  };

  return NextResponse.json({ summary, briefs });
}
