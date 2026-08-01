"use client";

// Sistema de notificações in-app — deriva contagem real de pendências dos dados
// já presentes no app-store (eventos pendentes, faturas atrasadas, treinos sem registro etc.)
// Não usa serviço pago: tudo roda no client a partir do estado já hidratado.

import { useCallback, useMemo, useSyncExternalStore } from "react";

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
  /** Marca uma notificação como lida (some da lista e do contador). */
  markRead: (id: string) => void;
  /** Marca todas as notificações visíveis como lidas. */
  markAllRead: () => void;
};

// IDs de notificações já lidas, persistidos no aparelho. As notificações são
// derivadas das pendências de negócio, então "lida" é um filtro local — a
// pendência em si continua visível nas telas correspondentes.
const READ_STORAGE_KEY = "adestro-notifications-read";
const READ_MAX_IDS = 300;

function loadReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids.slice(-READ_MAX_IDS)));
  } catch {
    // localStorage cheio/indisponível: segue só com o estado em memória.
  }
}

// Mini store externo dos IDs lidos (useSyncExternalStore): o snapshot do
// servidor é sempre vazio e o do client carrega do localStorage sob demanda —
// sem setState em effect e sem mismatch de hidratação.
const EMPTY_READ_IDS: string[] = [];
let readIdsCache: string[] | null = null;
const readIdsListeners = new Set<() => void>();

function getReadIdsSnapshot(): string[] {
  if (readIdsCache === null) readIdsCache = loadReadIds();
  return readIdsCache;
}

function getReadIdsServerSnapshot(): string[] {
  return EMPTY_READ_IDS;
}

function setReadIds(next: string[]) {
  readIdsCache = next;
  saveReadIds(next);
  readIdsListeners.forEach((listener) => listener());
}

function subscribeReadIds(listener: () => void): () => void {
  readIdsListeners.add(listener);
  return () => readIdsListeners.delete(listener);
}

export function useNotifications(): NotificationSummary {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const feedbacks = useAppStore((state) => state.portalFeedbacks);
  const clients = useAppStore((state) => state.clients);
  const readIds = useSyncExternalStore(subscribeReadIds, getReadIdsSnapshot, getReadIdsServerSnapshot);

  const markRead = useCallback((id: string) => {
    const current = getReadIdsSnapshot();
    if (!current.includes(id)) setReadIds([...current, id]);
  }, []);

  const unfiltered = useMemo(() => {
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

    // 2.5) Cadastros que chegaram pelo convite (leads aguardando aprovação).
    // Sem isso o adestrador não ficava sabendo que a pessoa respondeu.
    const draftClients = clients.filter((client) => client.status === "Rascunho");
    for (const client of draftClients.slice(0, 4)) {
      items.push({
        id: `lead-${client.id}`,
        type: "portal",
        icon: "🐶",
        title: "Cadastro respondido pelo convite",
        detail: `${client.name} preencheu a ficha — revise e aprove.`,
        href: `/clientes/${client.id}`,
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

    return items;
  }, [events, sessions, feedbacks, clients]);

  return useMemo(() => {
    const items = unfiltered.filter((item) => !readIds.includes(item.id));

    const byType: Record<NotificationType, number> = {
      agenda: 0,
      treinos: 0,
      financeiro: 0,
      relatorios: 0,
      portal: 0,
    };
    for (const item of items) byType[item.type] += 1;

    const markAllRead = () => {
      const current = getReadIdsSnapshot();
      setReadIds(Array.from(new Set([...current, ...items.map((item) => item.id)])));
    };

    return { total: items.length, byType, items, markRead, markAllRead };
  }, [unfiltered, readIds, markRead]);
}
