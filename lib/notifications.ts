"use client";

// Sistema de notificações in-app — deriva contagem real de pendências dos dados
// já presentes no app-store (eventos pendentes, faturas atrasadas, treinos sem registro etc.)
// Não usa serviço pago: tudo roda no client a partir do estado já hidratado.

import { useMemo } from "react";

import { useAppStore } from "@/lib/app-store";

export type NotificationType =
  | "agenda"
  | "treinos"
  | "financeiro"
  | "relatorios"
  | "portal";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  icon: string;
  title: string;
  detail: string;
  href: string;
  // ISO ou texto curto (ex: "há 2h")
  when?: string;
};

export type NotificationSummary = {
  total: number;
  byType: Record<NotificationType, number>;
  items: NotificationItem[];
};

export function useNotifications(): NotificationSummary {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const feedbacks = useAppStore((state) => state.portalFeedbacks);

  return useMemo(() => {
    const items: NotificationItem[] = [];

    // 1) Agendamentos pendentes de confirmação
    const pendingEvents = events.filter(
      (event) => event.status === "Pendente" || event.status === "Aguardando",
    );
    for (const event of pendingEvents.slice(0, 4)) {
      items.push({
        id: `event-${event.id}`,
        type: "agenda",
        icon: "📅",
        title: `${event.dog} • ${event.client}`,
        detail: `Aguardando confirmação para ${event.day} às ${event.time}`,
        href: `/agenda`,
      });
    }

    // 2) Treinos sem registro (eventos confirmados mas sem sessão criada)
    const sessionDogIds = new Set(
      sessions.map((s) => s.dogId).filter((id): id is string => Boolean(id)),
    );
    const eventosSemRegistro = events.filter(
      (event) => event.status === "Confirmado" && event.dogId && !sessionDogIds.has(event.dogId),
    );
    for (const event of eventosSemRegistro.slice(0, 3)) {
      items.push({
        id: `noregister-${event.id}`,
        type: "treinos",
        icon: "📝",
        title: `Registrar treino de ${event.dog}`,
        detail: `Aula de ${event.day} ainda sem registro`,
        href: `/treinos/registro?clientId=${event.clientId ?? ""}&dogId=${event.dogId ?? ""}`,
      });
    }

    // 3) Feedbacks recentes do tutor (mensagens novas)
    const tutorFeedbacks = feedbacks.filter((f) => f.author === "Tutor").slice(0, 3);
    for (const fb of tutorFeedbacks) {
      items.push({
        id: `feedback-${fb.id}`,
        type: "portal",
        icon: "💬",
        title: "Nova mensagem do cliente",
        detail: fb.message.length > 60 ? `${fb.message.slice(0, 60)}…` : fb.message,
        href: `/portal`,
        when: fb.createdAt,
      });
    }

    // 4) Relatórios pendentes — heurística: cães com sessões mas sem aiApproved
    // (assumimos que ainda há um cache de IA aguardando aprovação)
    const sessionsAwaitingReview = sessions.filter((s) =>
      s.dogSessions?.some((ds) => ds.aiSummary && !ds.aiApproved),
    );
    for (const session of sessionsAwaitingReview.slice(0, 2)) {
      items.push({
        id: `report-${session.id}`,
        type: "relatorios",
        icon: "📊",
        title: `Resumo aguardando aprovação`,
        detail: `${session.dogName ?? session.title} • ${session.date}`,
        href: `/relatorios`,
      });
    }

    const byType: Record<NotificationType, number> = {
      agenda: 0,
      treinos: 0,
      financeiro: 0,
      relatorios: 0,
      portal: 0,
    };
    for (const item of items) byType[item.type] += 1;

    return { total: items.length, byType, items };
  }, [events, sessions, feedbacks]);
}
