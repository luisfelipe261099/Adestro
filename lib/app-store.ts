"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionStatus = "Confirmado" | "Pendente" | "Aguardando" | "Recorrente" | "Cancelado";
type PaymentStatus = "Pago" | "Pendente";
export type UserRole = "admin" | "trainer" | "client";
export type TrainerPlanName = "Trial" | "Starter" | "Pro" | "Business";
export type TrainerPaymentMethod = "Pix" | "Cartao" | "Boleto";
export type TrainerLessonPackage = "4 aulas" | "8 aulas" | "12 aulas";
export type TrainerCardBrand = "Visa" | "Mastercard" | "Elo";

// Fase do cão no funil de trabalho (quadro kanban) — espelha Dog.trainingStatus no banco.
export type DogTrainingStatus = "Ficha" | "Ativo" | "Completo" | "Pausado" | "Cancelado";
export const DOG_TRAINING_STATUSES: DogTrainingStatus[] = ["Ficha", "Ativo", "Completo", "Pausado", "Cancelado"];

export type DogProfile = {
  id: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  photoUrl?: string;
  trainingTypes: string[];
  sessionsTotal?: number; // total de sessões do(s) contrato(s) ativo(s) — p/ progresso
  trainingStatus?: DogTrainingStatus; // fase no quadro (padrão "Ativo")
};

export type ClientProfile = {
  id: string;
  name: string;
  phone: string;
  propertyType: string;
  environment: string;
  plan: string;
  status: string;
  dogs: DogProfile[];
  tags?: string[];
  // 2º contato da residência (quem também acompanha o treino)
  secondContactName?: string;
  secondContactPhone?: string;
};

export type TrainingNote = {
  block: string;
  score: number;
  comment: string;
};

export type TrainingMediaItem = {
  id: string;
  dataUrl: string;
  thumbDataUrl?: string;
  width: number;
  height: number;
  sizeKb: number;
  mainSizeKb?: number;
  thumbSizeKb?: number;
  createdAt: string;
};

export type DogTrainingSession = {
  id: string;
  sessionId: string;
  dogId: string;
  activities: Array<{ name: string; completed: boolean; notes: string }>;
  commands: Array<{ command: string; rating: number; notes: string }>;
  description?: string;
  privateNotes?: string;
  aiSummary?: string;
  aiApproved: boolean;
  media: TrainingMediaItem[];
  nextFocus?: string;
  nextCommands: string[];
  nextTasks: string[];
  behaviorScores?: Record<string, number>;
  dog?: {
    name: string;
    breed: string;
    photoUrl?: string;
  };
};

export type TrainingSession = {
  id: string;
  number: number;
  date: string;
  title: string;
  clientId?: string;
  clientName?: string;
  dogId?: string;
  dogName?: string;
  notes: TrainingNote[];
  media: TrainingMediaItem[];
  dogSessions?: DogTrainingSession[];
  type?: string;
  location?: string;
  status?: string;
};

export type CalendarEvent = {
  id: string;
  clientId?: string;
  dogId?: string;
  day: string;
  time: string;
  dog: string;
  client: string;
  plan: string;
  sessionNumber: number;
  status: SessionStatus;
  /**
   * Cães inscritos quando a aula é coletiva. Uma turma nasce sem `dogId`
   * (o vínculo fica em EventParticipant), então sem esta lista os cães de
   * turma pareciam nunca ter aula marcada nos painéis da home.
   */
  participantDogIds?: string[];
};

export type PortalTask = {
  id: string;
  clientId?: string;
  title: string;
  description: string;
  completed: boolean;
};

export type PortalFeedback = {
  id: string;
  clientId?: string;
  author: "Tutor" | "Adestrador";
  message: string;
  createdAt: string;
};

export type PaymentItem = {
  id: string;
  description: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: TrainerPaymentMethod;
  dueDate?: string;
  reference?: string;
};

export type TrainerSubscription = {
  planName: TrainerPlanName;
  status: "Ativa" | "Renovacao pendente";
  paymentMethod: TrainerPaymentMethod;
  lessonPackage: TrainerLessonPackage;
  nextChargeDate: string;
  amount: number;
  autoRenew: boolean;
};

export type TrainerPaymentProfile = {
  pixKey: string;
  cardHolder: string;
  cardBrand: TrainerCardBrand;
  cardLast4: string;
  boletoEmail: string;
};

export type TrainerRenewalRecord = {
  id: string;
  date: string;
  planName: TrainerPlanName;
  lessonPackage: TrainerLessonPackage;
  paymentMethod: TrainerPaymentMethod;
  amount: number;
  status: "Gerada" | "Pago";
};

/** Aula que já ocupa o horário pedido — devolvida pelo servidor num 409. */
export type EventConflict = { day: string; time: string; dog: string; client: string };

/**
 * Resultado de criar um agendamento. Não basta `boolean`: quando o servidor
 * recusa por choque de horário, a tela precisa saber COM QUEM é o choque para
 * poder oferecer "agendar mesmo assim".
 */
export type AddEventResult =
  /**
   * `eventId` só vem no caminho não-recorrente, que é o único em que a tela
   * precisa encadear ação sobre o evento recém-criado (gravar os participantes
   * de uma turma). No caminho recorrente o store recarrega tudo do banco e não
   * há um único id para devolver.
   */
  | { ok: true; eventId?: string }
  | { ok: false; reason: "conflict"; conflicts: EventConflict[] }
  | { ok: false; reason: "error"; message: string };

type AppState = {
  hydrated: boolean;
  dataLoadError: string | null;
  isAuthenticated: boolean;
  userRole: UserRole;
  trainerName: string;
  trainerEmail: string;
  activePlan: TrainerPlanName;
  trainerSubscription: TrainerSubscription;
  trainerPaymentProfile: TrainerPaymentProfile;
  trainerRenewalHistory: TrainerRenewalRecord[];
  clients: ClientProfile[];
  trainingSessions: TrainingSession[];
  calendarEvents: CalendarEvent[];
  portalTasks: PortalTask[];
  portalFeedbacks: PortalFeedback[];
  payments: PaymentItem[];
  setHydrated: (value: boolean) => void;
  setDataLoadError: (value: string | null) => void;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
  setActivePlan: (plan: TrainerPlanName) => void;
  setTrainerSubscriptionPlan: (plan: TrainerPlanName) => Promise<boolean>;
  setTrainerPaymentSettings: (payload: {
    paymentMethod: TrainerPaymentMethod;
    lessonPackage: TrainerLessonPackage;
    autoRenew: boolean;
  }) => void;
  setTrainerPaymentProfile: (payload: Partial<TrainerPaymentProfile>) => void;
  renewTrainerSubscription: () => Promise<boolean>;
  addClientWithDog: (payload: any) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateClient: (payload: {
    clientId: string;
    name?: string;
    phone?: string;
    email?: string;
    propertyType?: string;
    environment?: string;
    dog?: { id: string; name?: string; breed?: string; age?: string; trainingStatus?: string };
    addDog?: { name: string; breed?: string; age?: string };
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  setDogTrainingStatus: (clientId: string, dogId: string, status: DogTrainingStatus) => Promise<boolean>;
  deleteClient: (clientId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  addTrainingSession: (payload: {
    number?: number;
    title: string;
    date: string;
    clientId?: string;
    clientName?: string;
    dogId?: string;
    dogName?: string;
    notes: TrainingNote[];
    media?: TrainingMediaItem[];
  }) => Promise<boolean>;
  updateTrainingSession: (payload: {
    id: string;
    title?: string;
    date?: string;
    location?: string;
    type?: string;
    status?: string;
    clientName?: string;
    dogId?: string;
    dogName?: string;
    notes?: TrainingNote[];
    media?: TrainingMediaItem[];
    dogSessions?: unknown[];
  }) => Promise<boolean>;
  toggleTask: (taskId: string) => void;
  addPortalTask: (
    title: string,
    description: string,
    clientId?: string,
    options?: { recurrence?: string; weekdays?: number[] },
  ) => Promise<void>;
  addPortalFeedback: (message: string, author?: PortalFeedback["author"], clientId?: string) => Promise<void>;
  setEventStatus: (eventId: string, status: SessionStatus) => Promise<boolean>;
  toggleEventStatus: (eventId: string) => void;
  rescheduleEvent: (eventId: string, day: string, time: string) => Promise<boolean>;
  addCalendarEvent: (payload: {
    clientId?: string;
    dogId?: string;
    day: string;
    time: string;
    dog?: string;
    client?: string;
    plan?: string;
    sessionNumber?: number;
    status?: SessionStatus;
    recurrence?: string;
    allowOverlap?: boolean;
  }) => Promise<AddEventResult>;
  approveClient: (clientId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  clearAppData: () => void;
  loadFromDB: () => Promise<void>;
};

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPlanAmount(plan: TrainerPlanName, lessonPackage: TrainerLessonPackage): number {
  const lessonRate = {
    Trial: 0,
    Starter: 30,
    Pro: 42,
    Business: 55,
  } satisfies Record<TrainerPlanName, number>;
  const packageSize = {
    "4 aulas": 4,
    "8 aulas": 8,
    "12 aulas": 12,
  } satisfies Record<TrainerLessonPackage, number>;
  const packageDiscount = {
    "4 aulas": 1,
    "8 aulas": 0.95,
    "12 aulas": 0.9,
  } satisfies Record<TrainerLessonPackage, number>;

  return Math.round(lessonRate[plan] * packageSize[lessonPackage] * packageDiscount[lessonPackage]);
}

function mapDbPlanToSubscriptionPlan(dbPlan?: string): TrainerPlanName {
  const normalized = (dbPlan ?? "").trim().toLowerCase();
  if (normalized === "pro") return "Pro";
  if (normalized === "business" || normalized === "premium") return "Business";
  if (normalized === "starter" || normalized === "essencial") return "Starter";
  if (normalized === "trial") return "Trial";
  return "Trial";
}

function getNextPackageReviewDate(lessonPackage: TrainerLessonPackage): string {
  const nextDate = new Date(2026, 3, 14);
  const reviewWindow = {
    "4 aulas": 21,
    "8 aulas": 45,
    "12 aulas": 75,
  } satisfies Record<TrainerLessonPackage, number>;

  nextDate.setDate(nextDate.getDate() + reviewWindow[lessonPackage]);

  return nextDate.toLocaleDateString("pt-BR");
}

function getTodayName(): string {
  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return weekDays[new Date().getDay()] ?? "Segunda";
}

type DemoData = Pick<AppState, "clients" | "trainingSessions" | "calendarEvents" | "portalTasks" | "portalFeedbacks" | "payments">;

function buildDemoData(): DemoData {
  const todayName = getTodayName();
  const clients: ClientProfile[] = [
    {
      id: "demo-client-mariana",
      name: "Mariana Lopes",
      phone: "11988887777",
      propertyType: "Apartamento",
      environment: "Mora com duas criancas e recebe visitas aos finais de semana",
      plan: "Plano Pro - 8 aulas",
      status: "Ativo",
      dogs: [
        {
          id: "demo-dog-nina",
          name: "Nina",
          breed: "Golden Retriever",
          age: "2 anos",
          weight: "24 kg",
          photoUrl: "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg",
          trainingTypes: ["Obediencia", "Passeio", "Ansiedade"],
        },
      ],
    },
    {
      id: "demo-client-roberto",
      name: "Roberto Lima",
      phone: "11977776666",
      propertyType: "Casa",
      environment: "Quintal amplo e rotina com outro cao adulto",
      plan: "Plano Starter - 4 aulas",
      status: "Ativo",
      dogs: [
        {
          id: "demo-dog-thor",
          name: "Thor",
          breed: "Border Collie",
          age: "1 ano",
          weight: "18 kg",
          photoUrl: "https://images.dog.ceo/breeds/collie-border/n02106166_355.jpg",
          trainingTypes: ["Comandos basicos", "Gasto de energia"],
        },
      ],
    },
  ];

  const trainingSessions: TrainingSession[] = [
    {
      id: "demo-session-nina-3",
      number: 3,
      date: "07/05/2026",
      title: "Foco em passeio guiado",
      clientId: "demo-client-mariana",
      clientName: "Mariana Lopes",
      dogId: "demo-dog-nina",
      dogName: "Nina",
      notes: [
        { block: "Passeio", score: 8, comment: "Nina respondeu bem ao comando junto e reduziu puxoes no retorno." },
        { block: "Casa", score: 7, comment: "Manter treino de espera antes de abrir a porta." },
      ],
      media: [],
    },
    {
      id: "demo-session-thor-1",
      number: 1,
      date: "06/05/2026",
      title: "Primeira avaliacao comportamental",
      clientId: "demo-client-roberto",
      clientName: "Roberto Lima",
      dogId: "demo-dog-thor",
      dogName: "Thor",
      notes: [
        { block: "Energia", score: 6, comment: "Thor precisa de rotina de enriquecimento antes dos treinos de foco." },
      ],
      media: [],
    },
  ];

  const calendarEvents: CalendarEvent[] = [
    {
      id: "demo-event-nina-today",
      clientId: "demo-client-mariana",
      dogId: "demo-dog-nina",
      day: todayName,
      time: "10:00",
      dog: "Nina",
      client: "Mariana Lopes",
      plan: "Aula 4 de 8",
      sessionNumber: 4,
      status: "Pendente",
    },
    {
      id: "demo-event-thor-today",
      clientId: "demo-client-roberto",
      dogId: "demo-dog-thor",
      day: todayName,
      time: "15:30",
      dog: "Thor",
      client: "Roberto Lima",
      plan: "Aula 2 de 4",
      sessionNumber: 2,
      status: "Aguardando",
    },
    {
      id: "demo-event-nina-next",
      clientId: "demo-client-mariana",
      dogId: "demo-dog-nina",
      day: "Sabado",
      time: "09:00",
      dog: "Nina",
      client: "Mariana Lopes",
      plan: "Aula 5 de 8",
      sessionNumber: 5,
      status: "Recorrente",
    },
  ];

  const portalTasks: PortalTask[] = [
    {
      id: "demo-task-nina-1",
      clientId: "demo-client-mariana",
      title: "Treinar espera antes da porta",
      description: "Fazer 3 repeticoes curtas antes dos passeios, sempre recompensando a calma.",
      completed: false,
    },
    {
      id: "demo-task-nina-2",
      clientId: "demo-client-mariana",
      title: "Passeio com pausa de foco",
      description: "Intercalar caminhada com paradas de contato visual por 5 minutos.",
      completed: true,
    },
  ];

  const portalFeedbacks: PortalFeedback[] = [
    {
      id: "demo-feedback-nina",
      clientId: "demo-client-mariana",
      author: "Tutor",
      message: "Nina ja espera melhor antes de sair para o passeio.",
      createdAt: "07/05/2026 \u2022 18:40",
    },
  ];

  const payments: PaymentItem[] = [
    {
      id: "demo-payment-pro",
      description: "Assinatura Pro",
      amount: 319,
      status: "Pago",
      paymentMethod: "Pix",
      dueDate: "14/06/2026",
      reference: "Pro \u2022 8 aulas",
    },
  ];

  return { clients, trainingSessions, calendarEvents, portalTasks, portalFeedbacks, payments };
}

function getDemoStatePatch(state: AppState): Partial<AppState> {
  const demoData = buildDemoData();
  return {
    ...demoData,
    trainerName: state.trainerName || "Adestrador Demo",
    trainerEmail: state.trainerEmail || "adestrador@adestro.com.br",
    activePlan: "Pro",
    trainerSubscription: {
      ...state.trainerSubscription,
      planName: "Pro",
      status: "Ativa",
      amount: getPlanAmount("Pro", state.trainerSubscription.lessonPackage),
    },
  };
}

function isDemoEmail(email: string): boolean {
  return ["adestrador@adestro.com.br", "cliente@adestro.com.br", "admin@adestro.com.br"].includes(
    email.trim().toLowerCase(),
  );
}

/**
 * fetch com retry para absorver o "cold start" do TiDB Cloud serverless (free):
 * o cluster hiberna quando ocioso e as primeiras requisições retornam 500
 * ("Can't reach database server"). Tentamos novamente com backoff antes de desistir.
 */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (res.status < 500 || i === attempts - 1) return res;
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)));
  }
  throw lastError ?? new Error("fetchWithRetry: tentativas esgotadas");
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      dataLoadError: null,
      isAuthenticated: false,
      userRole: "trainer",
      trainerName: "",
      trainerEmail: "",
      activePlan: "Pro",
      trainerSubscription: {
        planName: "Pro",
        status: "Ativa",
        paymentMethod: "Pix",
        lessonPackage: "8 aulas",
        nextChargeDate: getNextPackageReviewDate("8 aulas"),
        amount: getPlanAmount("Pro", "8 aulas"),
        autoRenew: true,
      },
      trainerPaymentProfile: {
        pixKey: "",
        cardHolder: "",
        cardBrand: "Visa",
        cardLast4: "",
        boletoEmail: "",
      },
      trainerRenewalHistory: [],
      clients: [],
      trainingSessions: [],
      calendarEvents: [],
      portalTasks: [],
      portalFeedbacks: [],
      payments: [],
      setHydrated: (value) => set({ hydrated: value }),
      setDataLoadError: (value) => set({ dataLoadError: value }),
      login: (email, role) => {
        const trainer = email.split("@")[0] || "Adestrador";
        const trainerName = trainer
          .split(/[._-]/)
          .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
          .join(" ");

        set({
          isAuthenticated: true,
          userRole: role,
          trainerEmail: email,
          trainerName,
          dataLoadError: null,
        });
      },
      logout: () =>
        set({
          isAuthenticated: false,
          userRole: "trainer",
          trainerName: "",
          trainerEmail: "",
          dataLoadError: null,
        }),
      setActivePlan: (plan) => set({ activePlan: plan }),
      setTrainerSubscriptionPlan: async (plan) => {
        try {
          const response = await fetch("/api/trainer/plan", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });

          if (!response.ok) return false;
        } catch {
          return false;
        }

        set((state) => ({
          activePlan: plan,
          trainerSubscription: {
            ...state.trainerSubscription,
            planName: plan,
            amount: getPlanAmount(plan, state.trainerSubscription.lessonPackage),
            status: "Ativa",
          },
        }));
        return true;
      },
      setTrainerPaymentSettings: ({ paymentMethod, lessonPackage, autoRenew }) =>
        set((state) => ({
          trainerSubscription: {
            ...state.trainerSubscription,
            paymentMethod,
            lessonPackage,
            autoRenew,
            amount: getPlanAmount(state.trainerSubscription.planName, lessonPackage),
            nextChargeDate: getNextPackageReviewDate(lessonPackage),
          },
        })),
      setTrainerPaymentProfile: (payload) =>
        set((state) => ({
          trainerPaymentProfile: {
            ...state.trainerPaymentProfile,
            ...payload,
          },
        })),
      renewTrainerSubscription: async () => {
        const { trainerSubscription } = get();
        try {
          const response = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: `Assinatura ${trainerSubscription.planName}`,
              amount: trainerSubscription.amount,
              paymentMethod: trainerSubscription.paymentMethod,
              dueDate: trainerSubscription.nextChargeDate,
              reference: `${trainerSubscription.planName} \u2022 ${trainerSubscription.lessonPackage}`,
            }),
          });
          if (!response.ok) return false;

          await fetch("/api/trainer/renewals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planName: trainerSubscription.planName,
              lessonPackage: trainerSubscription.lessonPackage,
              paymentMethod: trainerSubscription.paymentMethod,
              amount: trainerSubscription.amount,
              dueDate: trainerSubscription.nextChargeDate,
              reference: `${trainerSubscription.planName} \u2022 ${trainerSubscription.lessonPackage}`,
            }),
          });
        } catch {
          return false;
        }

        set((state) => ({
          trainerSubscription: {
            ...state.trainerSubscription,
            status: "Ativa",
            nextChargeDate: getNextPackageReviewDate(state.trainerSubscription.lessonPackage),
          },
        }));

        await get().loadFromDB();
        return true;
      },
      addClientWithDog: async (payload) => {
        try {
          // fetchWithRetry: o TiDB serverless hiberna e devolve 500 na 1ª
          // requisição (cold start). O retry só dispara em 5xx; respostas 4xx
          // (limite de plano, etc.) voltam na hora. audit() é à prova de falha,
          // então reenviar não duplica o cadastro.
          const response = await fetchWithRetry("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            let error = "Não foi possível cadastrar agora. Tente novamente.";
            try {
              const data = (await response.json()) as { error?: string };
              if (data?.error) error = data.error;
            } catch {
              // resposta sem corpo JSON
            }
            return { ok: false as const, error };
          }

          await get().loadFromDB();
          return { ok: true as const };
        } catch {
          return {
            ok: false as const,
            error: "Falha de conexão com o servidor. Verifique sua internet e tente de novo.",
          };
        }
      },
      addTrainingSession: async (payload) => {
        try {
          const response = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) return false;
          await get().loadFromDB();
          return true;
        } catch {
          return false;
        }
      },
      updateTrainingSession: async (payload) => {
        try {
          const response = await fetch("/api/sessions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) return false;
          await get().loadFromDB();
          return true;
        } catch {
          return false;
        }
      },
      toggleTask: async (taskId) => {
        const current = get().portalTasks.find((t) => t.id === taskId);
        if (!current) return;
        // Optimistic update
        set((state) => ({
          portalTasks: state.portalTasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          ),
        }));
        try {
          await fetch("/api/portal-tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId, completed: !current.completed }),
          });
        } catch {
          // keep optimistic state
        }
      },
      addPortalTask: async (title, description, clientId, options) => {
        const tempId = createId("task");
        const tempTask: PortalTask = { id: tempId, clientId, title, description, completed: false };

        // Optimistic add
        set((state) => ({ portalTasks: [...state.portalTasks, tempTask] }));

        try {
          const response = await fetch("/api/portal-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              clientId,
              recurrence: options?.recurrence ?? "once",
              weekdays: options?.weekdays ?? [],
            }),
          });
          if (!response.ok) {
            set((state) => ({ portalTasks: state.portalTasks.filter((t) => t.id !== tempId) }));
            return;
          }
          await get().loadFromDB();
        } catch {
          set((state) => ({ portalTasks: state.portalTasks.filter((t) => t.id !== tempId) }));
        }
      },
      addPortalFeedback: async (message, author = "Tutor", clientId) => {
        const tempId = createId("fb");
        const tempFeedback: PortalFeedback = {
          id: tempId,
          clientId,
          author,
          message,
          createdAt: new Date().toISOString(),
        };

        // Optimistic add
        set((state) => ({ portalFeedbacks: [...state.portalFeedbacks, tempFeedback] }));

        try {
          const response = await fetch("/api/portal-feedbacks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, author, clientId }),
          });
          if (!response.ok) {
            set((state) => ({ portalFeedbacks: state.portalFeedbacks.filter((f) => f.id !== tempId) }));
            return;
          }
          await get().loadFromDB();
        } catch {
          set((state) => ({ portalFeedbacks: state.portalFeedbacks.filter((f) => f.id !== tempId) }));
        }
      },
      setEventStatus: async (eventId, status) => {
        const currentEvent = get().calendarEvents.find((event) => event.id === eventId);
        if (!currentEvent) return false;

        // Optimistic update — reflects immediately in UI
        set((state) => ({
          calendarEvents: state.calendarEvents.map((event) =>
            event.id === eventId ? { ...event, status } : event,
          ),
        }));

        try {
          const response = await fetch("/api/events", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: eventId, status }),
          });

          if (!response.ok) {
            return false;
          }

          const body = await response.json() as { ok?: boolean };
          if (body.ok === false) return false;
          return true;
        } catch {
          return false;
        }
      },
      rescheduleEvent: async (eventId, day, time) => {
        const currentEvent = get().calendarEvents.find((event) => event.id === eventId);
        if (!currentEvent) return false;

        // Optimistic: nova data/hora + volta a "Pendente" (reconfirmação do tutor).
        set((state) => ({
          calendarEvents: state.calendarEvents.map((event) =>
            event.id === eventId ? { ...event, day, time, status: "Pendente" as SessionStatus } : event,
          ),
        }));

        try {
          const response = await fetch("/api/events", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: eventId, day, time }),
          });
          if (!response.ok) return false;
          const body = (await response.json()) as { ok?: boolean };
          return body.ok !== false;
        } catch {
          return false;
        }
      },
      toggleEventStatus: async (eventId) => {
        const currentEvent = get().calendarEvents.find((event) => event.id === eventId);
        if (!currentEvent) return;

        const nextStatus =
          currentEvent.status === "Confirmado"
            ? "Pendente"
            : currentEvent.status === "Pendente"
            ? "Cancelado"
            : "Confirmado";

        await get().setEventStatus(eventId, nextStatus);
      },
      addCalendarEvent: async (payload) => {
        const tempId = createId("evt");
        const isRecurring = payload.recurrence && payload.recurrence !== "none";

        // Optimistic add only if not recurring
        if (!isRecurring) {
          const tempEvent: CalendarEvent = {
            id:            tempId,
            clientId:      payload.clientId,
            dogId:         payload.dogId,
            day:           payload.day,
            time:          payload.time,
            dog:           payload.dog ?? "Turma",
            client:        payload.client ?? "Coletivo",
            plan:          payload.plan ?? "Aula Coletiva",
            sessionNumber: payload.sessionNumber ?? 1,
            status:        payload.status ?? "Pendente",
          };
          set((state) => ({
            calendarEvents: [tempEvent, ...state.calendarEvents],
          }));
        }

        try {
          const response = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            if (!isRecurring) {
              set((state) => ({
                calendarEvents: state.calendarEvents.filter((e) => e.id !== tempId),
              }));
            }

            // 409 = choque de horário. Devolve os eventos conflitantes para a
            // tela poder perguntar se é para agendar mesmo assim.
            if (response.status === 409) {
              try {
                const data = (await response.json()) as { conflicts?: EventConflict[] };
                return { ok: false as const, reason: "conflict" as const, conflicts: data.conflicts ?? [] };
              } catch {
                return { ok: false as const, reason: "conflict" as const, conflicts: [] };
              }
            }

            let message = "Não foi possível criar o agendamento. Tente novamente.";
            try {
              const data = (await response.json()) as { error?: string };
              if (data?.error) message = data.error;
            } catch {
              // resposta sem corpo JSON
            }
            return { ok: false as const, reason: "error" as const, message };
          }

          // Se for recorrente, recarrega tudo do banco
          if (isRecurring) {
            await get().loadFromDB();
            return { ok: true as const };
          }

          const created = await response.json() as {
            id: string;
            clientId?: string;
            dogId?: string;
            day: string;
            time: string;
            dog: string;
            client: string;
            plan?: string;
            sessionNumber?: number;
            status?: SessionStatus;
          };

          // Replace temp with server event without full store reload.
          set((state) => ({
            calendarEvents: state.calendarEvents.map((event) =>
              event.id === tempId
                ? {
                    id: created.id,
                    clientId: created.clientId ?? payload.clientId,
                    dogId: created.dogId ?? payload.dogId,
                    day: created.day,
                    time: created.time,
                    dog: created.dog,
                    client: created.client,
                    plan: created.plan ?? "",
                    sessionNumber: Number(created.sessionNumber ?? payload.sessionNumber ?? 1),
                    status: (created.status ?? payload.status ?? "Pendente") as SessionStatus,
                  }
                : event,
            ),
          }));
          return { ok: true as const, eventId: created.id };
        } catch {
          if (!isRecurring) {
            set((state) => ({
              calendarEvents: state.calendarEvents.filter((e) => e.id !== tempId),
            }));
          }
          return {
            ok: false as const,
            reason: "error" as const,
            message: "Falha de conexão com o servidor. Verifique sua internet e tente de novo.",
          };
        }
      },
      approveClient: async (clientId) => {
        try {
          const response = await fetch("/api/clients", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, status: "Ativo" }),
          });

          if (!response.ok) {
            // Devolve o motivo: aprovar pode esbarrar no limite do plano (402),
            // e falhar em silêncio deixaria o adestrador clicando sem entender.
            const data = await response.json().catch(() => ({}));
            return { ok: false as const, error: data.error ?? "Não foi possível aprovar o cadastro." };
          }
          await get().loadFromDB();
          return { ok: true as const };
        } catch {
          return { ok: false as const, error: "Falha de conexão ao aprovar o cadastro." };
        }
      },
      updateClient: async (payload) => {
        try {
          const response = await fetchWithRetry("/api/clients", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            let error = "Não foi possível salvar as alterações. Tente novamente.";
            try {
              const data = (await response.json()) as { error?: string };
              if (data?.error) error = data.error;
            } catch {
              // resposta sem corpo JSON
            }
            return { ok: false as const, error };
          }
          await get().loadFromDB();
          return { ok: true as const };
        } catch {
          return {
            ok: false as const,
            error: "Falha de conexão com o servidor. Verifique sua internet e tente de novo.",
          };
        }
      },
      // Atualização otimista: o card muda de coluna na hora e reverte se o PATCH falhar
      // (sem loadFromDB completo, para o arrastar do quadro não "piscar").
      setDogTrainingStatus: async (clientId, dogId, status) => {
        const previous = get().clients;
        set({
          clients: previous.map((client) =>
            client.id !== clientId
              ? client
              : {
                  ...client,
                  dogs: client.dogs.map((dog) =>
                    dog.id === dogId ? { ...dog, trainingStatus: status } : dog,
                  ),
                },
          ),
        });
        try {
          const response = await fetchWithRetry("/api/clients", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, dog: { id: dogId, trainingStatus: status } }),
          });
          if (!response.ok) throw new Error("PATCH falhou");
          return true;
        } catch {
          set({ clients: previous });
          return false;
        }
      },
      deleteClient: async (clientId) => {
        try {
          const response = await fetchWithRetry(
            `/api/clients?clientId=${encodeURIComponent(clientId)}`,
            { method: "DELETE" },
          );
          if (!response.ok) {
            let error = "Não foi possível excluir o cliente. Tente novamente.";
            try {
              const data = (await response.json()) as { error?: string };
              if (data?.error) error = data.error;
            } catch {
              // resposta sem corpo JSON
            }
            return { ok: false as const, error };
          }
          // Remove localmente na hora e ressincroniza com o banco.
          set({ clients: get().clients.filter((c) => c.id !== clientId) });
          await get().loadFromDB();
          return { ok: true as const };
        } catch {
          return {
            ok: false as const,
            error: "Falha de conexão com o servidor. Verifique sua internet e tente de novo.",
          };
        }
      },
      clearAppData: () =>
        set({
          clients: [],
          trainingSessions: [],
          calendarEvents: [],
          portalTasks: [],
          portalFeedbacks: [],
          payments: [],
        }),
      loadFromDB: async () => {
        if (isDemoEmail(get().trainerEmail)) {
          set((state) => ({
            ...getDemoStatePatch(state),
            dataLoadError: null,
          }));
          return;
        }

        try {
          const [meRes, clientsRes, sessionsRes, eventsRes, paymentsRes, tasksRes, feedbacksRes, renewalsRes] = await Promise.all([
            fetchWithRetry("/api/me", { cache: "no-store" }),
            fetchWithRetry("/api/clients", { cache: "no-store" }),
            fetchWithRetry("/api/sessions", { cache: "no-store" }),
            fetchWithRetry("/api/events", { cache: "no-store" }),
            fetchWithRetry("/api/payments", { cache: "no-store" }),
            fetchWithRetry("/api/portal-tasks", { cache: "no-store" }),
            fetchWithRetry("/api/portal-feedbacks", { cache: "no-store" }),
            fetchWithRetry("/api/trainer/renewals", { cache: "no-store" }),
          ]);

          if (!clientsRes.ok || !sessionsRes.ok || !eventsRes.ok || !paymentsRes.ok) {
            set({
              dataLoadError: "Nao foi possivel sincronizar os dados agora. Verifique sua conexao e tente novamente.",
            });
            return;
          }

          const [rawMe, rawClients, rawSessions, rawEvents, rawPayments, rawTasks, rawFeedbacks, rawRenewals] = await Promise.all([
            meRes.ok ? meRes.json() : Promise.resolve(null),
            clientsRes.json(),
            sessionsRes.json(),
            eventsRes.json(),
            paymentsRes.json(),
            tasksRes.ok ? tasksRes.json() : Promise.resolve([]),
            feedbacksRes.ok ? feedbacksRes.json() : Promise.resolve([]),
            renewalsRes.ok ? renewalsRes.json() : Promise.resolve([]),
          ]);

          const dbPlanName = mapDbPlanToSubscriptionPlan(
            (rawMe as { trainer?: { plan?: string } } | null)?.trainer?.plan,
          );

          const resolvedTrainerName = (() => {
            const fromMe = (rawMe as { name?: string } | null)?.name;
            if (fromMe && fromMe.trim()) return fromMe.trim();
            return undefined;
          })();

          const clients: ClientProfile[] = (rawClients as Array<Record<string, unknown>>).map((c) => ({
            id:             String(c.id),
            name:           String(c.name),
            phone:          String(c.phone ?? ""),
            propertyType:   String(c.propertyType ?? ""),
            environment:    String(c.environment ?? ""),
            plan:           String(c.plan ?? ""),
            status:         String(c.status ?? "Ativo"),
            secondContactName:  String(c.secondContactName ?? ""),
            secondContactPhone: String(c.secondContactPhone ?? ""),
            tags: (() => {
              try {
                const parsed = JSON.parse(String(c.tags ?? "[]"));
                return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
              } catch { return []; }
            })(),
            dogs: ((c.dogs as Array<Record<string, unknown>>) ?? []).map((d) => ({
              id:            String(d.id),
              name:          String(d.name),
              breed:         String(d.breed ?? ""),
              age:           String(d.age ?? ""),
              weight:        String(d.weight ?? ""),
              photoUrl:      d.photoUrl ? String(d.photoUrl) : undefined,
              trainingTypes: (() => {
                try { return JSON.parse(String(d.trainingTypes ?? "[]")); }
                catch { return []; }
              })(),
              sessionsTotal: Number(d.sessionsTotal) || 0,
              trainingStatus: (DOG_TRAINING_STATUSES as string[]).includes(String(d.trainingStatus))
                ? (String(d.trainingStatus) as DogTrainingStatus)
                : "Ativo",
            })),
          }));

          const trainingSessions: TrainingSession[] = (rawSessions as Array<Record<string, unknown>>).map((s) => ({
            id:         String(s.id),
            number:     Number(s.number ?? 1),
            date:       String(s.date),
            title:      String(s.title),
            clientId:   s.clientId ? String(s.clientId) : undefined,
            clientName: String(s.clientName ?? ""),
            dogId:      s.dogId ? String(s.dogId) : undefined,
            dogName:    String(s.dogName ?? ""),
            notes:      Array.isArray(s.notes) ? (s.notes as TrainingNote[]) : [],
            media:      Array.isArray(s.media) ? (s.media as TrainingMediaItem[]) : [],
            dogSessions: Array.isArray(s.dogSessions) ? (s.dogSessions as DogTrainingSession[]) : [],
          }));

          const calendarEvents: CalendarEvent[] = (rawEvents as Array<Record<string, unknown>>).map((e) => ({
            id:            String(e.id),
            clientId:      e.clientId ? String(e.clientId) : undefined,
            dogId:         e.dogId ? String(e.dogId) : undefined,
            day:           String(e.day),
            time:          String(e.time),
            dog:           String(e.dog),
            client:        String(e.client),
            plan:          String(e.plan ?? ""),
            sessionNumber: Number(e.sessionNumber ?? 1),
            status:        (e.status ?? "Confirmado") as "Confirmado" | "Pendente" | "Aguardando" | "Recorrente" | "Cancelado",
            participantDogIds: Array.isArray(e.participantDogIds)
              ? (e.participantDogIds as unknown[]).map(String)
              : undefined,
          }));

          const payments: PaymentItem[] = (rawPayments as Array<Record<string, unknown>>).map((p) => ({
            id:            String(p.id),
            description:   String(p.description ?? ""),
            amount:        Number(p.amount ?? 0),
            status:        (p.status ?? "Pendente") as "Pago" | "Pendente",
            paymentMethod: p.paymentMethod as TrainerPaymentMethod | undefined,
            dueDate:       p.dueDate ? String(p.dueDate) : undefined,
            reference:     p.reference ? String(p.reference) : undefined,
          }));

          const portalTasks: PortalTask[] = (rawTasks as Array<Record<string, unknown>>).map((t) => ({
            id:          String(t.id),
            clientId:    t.clientId ? String(t.clientId) : undefined,
            title:       String(t.title),
            description: t.description ? String(t.description) : "",
            completed:   Boolean(t.completed),
          }));

          const portalFeedbacks: PortalFeedback[] = (rawFeedbacks as Array<Record<string, unknown>>).map((f) => ({
            id:        String(f.id),
            clientId:  f.clientId ? String(f.clientId) : undefined,
            author:    (f.author ?? "Tutor") as "Tutor" | "Adestrador",
            message:   String(f.message),
            createdAt: (() => {
              const d = new Date(String(f.createdAt));
              return (
                d.toLocaleDateString("pt-BR") +
                " \u2022 " +
                d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              );
            })(),
          }));

          const trainerRenewalHistory: TrainerRenewalRecord[] = (rawRenewals as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            date: (() => {
              const d = new Date(String(r.createdAt));
              return Number.isNaN(d.getTime()) ? String(r.createdAt ?? "") : d.toLocaleDateString("pt-BR");
            })(),
            planName: mapDbPlanToSubscriptionPlan(String(r.planName ?? "")),
            lessonPackage: (r.lessonPackage as TrainerLessonPackage) ?? "8 aulas",
            paymentMethod: (r.paymentMethod as TrainerPaymentMethod) ?? "Pix",
            amount: Number(r.amount ?? 0),
            status: (r.status === "Pago" ? "Pago" : "Gerada") as "Gerada" | "Pago",
          }));

          set((state) => ({
            clients,
            trainingSessions,
            calendarEvents,
            payments,
            portalTasks,
            portalFeedbacks,
            trainerRenewalHistory,
            dataLoadError: null,
            activePlan: dbPlanName,
            trainerSubscription: {
              ...state.trainerSubscription,
              planName: dbPlanName,
              amount: getPlanAmount(dbPlanName, state.trainerSubscription.lessonPackage),
              status: "Ativa",
            },
            trainerName: resolvedTrainerName ?? state.trainerName,
          }));
        } catch {
          set({
            dataLoadError: "Falha ao carregar os dados da conta. Tente novamente em instantes.",
          });
        }
      },
    }),
    {
      name: "adestro-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: () => ({}),
      version: 4,
      migrate: () => ({}),
    },
  ),
);
