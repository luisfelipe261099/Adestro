"use client";

// Sistema de notificações in-app — deriva contagem real de pendências dos dados
// já presentes no app-store (eventos pendentes, faturas atrasadas, treinos sem registro etc.)
// Não usa serviço pago: tudo roda no client a partir do estado já hidratado.

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAppStore } from "@/lib/app-store";

// Notificações são derivadas das pendências, e por isso não sumiam ao clicar:
// enquanto o agendamento continuasse aguardando confirmação, o aviso voltava.
// Esta camada guarda o que já foi lido (por id, no próprio aparelho) e some com
// o aviso. O trabalho em si continua em /pendencias — o que apaga aqui é o
// aviso, não a tarefa. Se o dado mudar, o id muda e o aviso volta.
const LIDAS_KEY = "adestro-notificacoes-lidas";

function lerLidas(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const bruto = window.localStorage.getItem(LIDAS_KEY);
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function gravarLidas(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    // Guarda no máximo 200 ids: passa longe do uso real e não cresce sem fim.
    window.localStorage.setItem(LIDAS_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // navegador sem armazenamento: o aviso volta na próxima visita, sem quebrar
  }
}

// Estado das lidas vive fora do React: o servidor não tem localStorage, então
// ele renderiza com a lista vazia e o navegador assume no primeiro acesso —
// sem efeito que dispara re-render nem divergência entre os dois.
const VAZIO: Set<string> = new Set();
let cache: Set<string> | null = null;
const ouvintes = new Set<() => void>();

function snapshot(): Set<string> {
  if (!cache) cache = lerLidas();
  return cache;
}

function snapshotServidor(): Set<string> {
  return VAZIO;
}

function assinar(callback: () => void): () => void {
  ouvintes.add(callback);
  return () => ouvintes.delete(callback);
}

function marcarLidas(ids: string[]) {
  const proximo = new Set(snapshot());
  for (const id of ids) proximo.add(id);
  cache = proximo;
  gravarLidas(proximo);
  for (const ouvinte of ouvintes) ouvinte();
}

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
  /** Marca um aviso como lido — ele some do sino. */
  dismiss: (id: string) => void;
  /** Marca todos os avisos visíveis como lidos. */
  dismissAll: () => void;
};

export function useNotifications(): NotificationSummary {
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const feedbacks = useAppStore((state) => state.portalFeedbacks);
  const clients = useAppStore((state) => state.clients);

  const lidas = useSyncExternalStore(assinar, snapshot, snapshotServidor);

  const dismiss = useCallback((id: string) => marcarLidas([id]), []);

  const todos = useMemo(() => {
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

    // 3) Alguém respondeu o convite de autocadastro.
    //
    // A ficha chega como rascunho e fica esperando aprovação — mas nada avisava
    // o adestrador, que só descobria ao abrir a lista por acaso.
    const fichasNovas = clients.filter((c) => c.status === "Rascunho");
    for (const ficha of fichasNovas.slice(0, 4)) {
      items.push({
        id: `lead-${ficha.id}`,
        type: "portal",
        icon: "📝",
        title: `${ficha.name} preencheu o cadastro`,
        detail: ficha.dogs.length
          ? `Cão: ${ficha.dogs.map((d) => d.name).join(", ")} · aguardando sua aprovação`
          : "Ficha aguardando sua aprovação",
        href: "/pendencias",
      });
    }

    // 4) Feedbacks recentes do cliente (mensagens novas)
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

    // 5) Relatórios pendentes — heurística: cães com sessões mas sem aiApproved
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

  const items = useMemo(() => todos.filter((item) => !lidas.has(item.id)), [todos, lidas]);

  const dismissAll = useCallback(() => marcarLidas(items.map((item) => item.id)), [items]);

  const byType: Record<NotificationType, number> = {
    agenda: 0,
    treinos: 0,
    financeiro: 0,
    relatorios: 0,
    portal: 0,
  };
  for (const item of items) byType[item.type] += 1;

  return { total: items.length, byType, items, dismiss, dismissAll };
}
