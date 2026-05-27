// Lógica pura de gamificação (compartilhada entre cliente e servidor).
// Não importa nada de "next" / "react" / "prisma".

export const XP_PER_LEVEL = 100;

export type GamificationAction =
  | "task_completed"
  | "task_uncompleted"
  | "video_watched"
  | "feedback_sent"
  | "trainer_rated"
  | "session_rated"
  | "daily_visit"
  | "training_completed"
  | "feedback_received"
  | "invite_tutor"
  | "multiple_techniques"
  | "task_evidence_uploaded";

export const POINTS: Record<GamificationAction, number> = {
  task_completed: 20,
  task_uncompleted: -20,
  video_watched: 15,
  feedback_sent: 10,
  trainer_rated: 25,
  session_rated: 15,
  daily_visit: 5,
  training_completed: 10,
  feedback_received: 15,
  invite_tutor: 50,
  multiple_techniques: 60,
  task_evidence_uploaded: 15,
};

export type Badge = {
  id: string;
  label: string;
  icon: string;
  description: string;
  unlocked: boolean;
};

export const BADGES_DEF: Omit<Badge, "unlocked">[] = [
  // Badges de Tutor
  { id: "first_task", label: "Primeira tarefa", icon: "🎯", description: "Concluiu sua primeira tarefa de casa." },
  { id: "five_tasks", label: "Treinador dedicado", icon: "🏅", description: "Concluiu 5 tarefas." },
  { id: "ten_tasks", label: "Mestre das tarefas", icon: "🏆", description: "Concluiu 10 tarefas." },
  { id: "first_video", label: "Espectador atento", icon: "🎬", description: "Assistiu seu primeiro vídeo do cão." },
  { id: "first_feedback", label: "Comunicação aberta", icon: "💬", description: "Enviou seu primeiro comentário." },
  { id: "rated_trainer", label: "Parceria avaliada", icon: "⭐", description: "Avaliou o adestrador." },
  { id: "streak_3", label: "Constância", icon: "🔥", description: "3 dias seguidos no portal." },
  { id: "streak_7", label: "Rotina forte", icon: "🚀", description: "7 dias seguidos no portal." },
  { id: "level_3", label: "Nível 3", icon: "📈", description: "Alcançou o nível 3." },
  { id: "level_5", label: "Nível 5", icon: "👑", description: "Alcançou o nível 5." },
  { id: "first_video_uploaded", label: "Primeiro vídeo enviado", icon: "🎥", description: "Adicionou o primeiro vídeo de treinamento." },
  // Novas Badges de Tutor
  { id: "consistent_trainer", label: "Treinador Consistente", icon: "🎪", description: "Completou 7 tarefas em uma semana." },
  { id: "well_behaved_dog", label: "Cão Bem Comportado", icon: "🐕‍🦺", description: "Marcou 5 treinos como sucesso." },
  { id: "community_share", label: "Influencer do Adestro", icon: "📱", description: "Compartilhou vídeo de progresso do cão." },
  { id: "monthly_challenge", label: "Desafiador Mensal", icon: "🏁", description: "Completou o desafio de treino do mês." },
  // Badges de Adestrador
  { id: "first_training", label: "Primeiro Treino", icon: "👨‍🏫", description: "Registrou o primeiro treino." },
  { id: "hundred_sessions", label: "Centésima Sessão", icon: "💯", description: "Completou 100 registros de treino." },
  { id: "video_educator", label: "Educador em Vídeo", icon: "📹", description: "Enviou 5 vídeos de treinamento." },
  { id: "mentor_badge", label: "Mentor", icon: "🧑‍🎓", description: "Tem 10 clientes ativos simultaneamente." },
  { id: "expert_techniques", label: "Especialista em Técnicas", icon: "🎯", description: "Utilizou 5 técnicas diferentes em um mês." },
];

// Estado bruto persistido no banco
export type RawGamification = {
  points: number;
  streakDays: number;
  lastVisitDate: string;
  streakTolerance: number;
  lastStreakUpdateDate: string;
  watchedVideos: string[];
  trainerRating: number;
  sessionRatings: Record<string, number>;
  totalTasksCompleted: number;
  totalFeedbacks: number;
  totalTrainingsCompleted: number;
  totalFeedbacksReceived: number;
  tutorsInvited: number;
  techniquesUsed: string[];
  weeklyTasksCompleted: number;
  successfulTrainings: number;
  videosShared: number;
  monthlyProgress: number;
};

// Estado público entregue ao cliente (com derivados)
export type GamificationState = RawGamification & {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  badges: Badge[];
  dogRank: string;
};

export function emptyRawGamification(): RawGamification {
  return {
    points: 0,
    streakDays: 0,
    lastVisitDate: "",
    streakTolerance: 100,
    lastStreakUpdateDate: "",
    watchedVideos: [],
    trainerRating: 0,
    sessionRatings: {},
    totalTasksCompleted: 0,
    totalFeedbacks: 0,
    totalTrainingsCompleted: 0,
    totalFeedbacksReceived: 0,
    tutorsInvited: 0,
    techniquesUsed: [],
    weeklyTasksCompleted: 0,
    successfulTrainings: 0,
    videosShared: 0,
    monthlyProgress: 0,
  };
}

export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isYesterday(prev: string, today: string): boolean {
  if (!prev) return false;
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return prev === yesterday.toISOString().slice(0, 10);
}

function computeBadges(raw: RawGamification, level: number): Badge[] {
  return BADGES_DEF.map((badge) => {
    let unlocked = false;
    if (badge.id === "first_task" && raw.totalTasksCompleted >= 1) unlocked = true;
    if (badge.id === "five_tasks" && raw.totalTasksCompleted >= 5) unlocked = true;
    if (badge.id === "ten_tasks" && raw.totalTasksCompleted >= 10) unlocked = true;
    if (badge.id === "first_video" && raw.watchedVideos.length >= 1) unlocked = true;
    if (badge.id === "first_feedback" && raw.totalFeedbacks >= 1) unlocked = true;
    if (badge.id === "rated_trainer" && raw.trainerRating > 0) unlocked = true;
    if (badge.id === "streak_3" && raw.streakDays >= 3) unlocked = true;
    if (badge.id === "streak_7" && raw.streakDays >= 7) unlocked = true;
    if (badge.id === "level_3" && level >= 3) unlocked = true;
    if (badge.id === "level_5" && level >= 5) unlocked = true;
    if (badge.id === "first_video_uploaded" && raw.watchedVideos.length >= 1) unlocked = true;
    // Novas badges de tutor
    if (badge.id === "consistent_trainer" && raw.weeklyTasksCompleted >= 7) unlocked = true;
    if (badge.id === "well_behaved_dog" && raw.successfulTrainings >= 5) unlocked = true;
    if (badge.id === "community_share" && raw.videosShared >= 1) unlocked = true;
    if (badge.id === "monthly_challenge" && raw.monthlyProgress >= 100) unlocked = true;
    // Badges de adestrador
    if (badge.id === "first_training" && raw.totalTrainingsCompleted >= 1) unlocked = true;
    if (badge.id === "hundred_sessions" && raw.totalTrainingsCompleted >= 100) unlocked = true;
    if (badge.id === "video_educator" && raw.totalFeedbacksReceived >= 5) unlocked = true;
    if (badge.id === "mentor_badge" && raw.tutorsInvited >= 10) unlocked = true;
    if (badge.id === "expert_techniques" && raw.techniquesUsed.length >= 5) unlocked = true;
    return { ...badge, unlocked };
  });
}

export function getDogRank(level: number): string {
  if (level >= 10) return "Super Cão Canino 🏆";
  if (level >= 7) return "Cão Graduado 🎓";
  if (level >= 5) return "Bom Cidadão Canino 🎖️";
  if (level >= 3) return "Cão Aprendiz 🎒";
  return "Recruta Canino 🐾";
}

export function buildPublicState(raw: RawGamification): GamificationState {
  const points = Math.max(0, raw.points);
  const level = Math.floor(points / XP_PER_LEVEL) + 1;
  const xpInLevel = points % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;
  return {
    ...raw,
    points,
    level,
    xpInLevel,
    xpToNext,
    badges: computeBadges(raw, level),
    dogRank: getDogRank(level),
  };
}

export type ApplyActionInput =
  | { action: "task_completed"; taskId?: string }
  | { action: "task_uncompleted"; taskId?: string }
  | { action: "feedback_sent" }
  | { action: "trainer_rated"; rating: number }
  | { action: "session_rated"; sessionId: string; rating: number }
  | { action: "video_watched"; videoId: string }
  | { action: "training_completed" }
  | { action: "feedback_received" }
  | { action: "invite_tutor"; count?: number }
  | { action: "multiple_techniques"; technique: string }
  | { action: "task_evidence_uploaded"; taskId: string };

export type ApplyActionResult = {
  raw: RawGamification;
  earned: number;
  reason: string;
};

export function applyAction(current: RawGamification, input: ApplyActionInput): ApplyActionResult {
  const next: RawGamification = {
    ...current,
    watchedVideos: [...current.watchedVideos],
    sessionRatings: { ...current.sessionRatings },
  };
  let earned = 0;
  let reason = "";

  switch (input.action) {
    case "task_completed":
      earned = POINTS.task_completed;
      reason = "Tarefa concluída";
      next.points += earned;
      next.totalTasksCompleted += 1;
      break;
    case "task_uncompleted":
      next.points = Math.max(0, next.points + POINTS.task_uncompleted);
      next.totalTasksCompleted = Math.max(0, next.totalTasksCompleted - 1);
      break;
    case "feedback_sent":
      earned = POINTS.feedback_sent;
      reason = "Comentário enviado";
      next.points += earned;
      next.totalFeedbacks += 1;
      break;
    case "trainer_rated": {
      const wasRated = next.trainerRating > 0;
      next.trainerRating = Math.max(1, Math.min(5, Math.round(input.rating)));
      if (!wasRated) {
        earned = POINTS.trainer_rated;
        reason = "Avaliou o adestrador";
        next.points += earned;
      }
      break;
    }
    case "session_rated": {
      const wasRated = Boolean(next.sessionRatings[input.sessionId]);
      next.sessionRatings[input.sessionId] = Math.max(1, Math.min(5, Math.round(input.rating)));
      if (!wasRated) {
        earned = POINTS.session_rated;
        reason = "Avaliou uma aula";
        next.points += earned;
      }
      break;
    }
    case "video_watched": {
      if (!next.watchedVideos.includes(input.videoId)) {
        next.watchedVideos.push(input.videoId);
        earned = POINTS.video_watched;
        reason = "Vídeo assistido";
        next.points += earned;
      }
      break;
    }
    case "training_completed": {
      earned = POINTS.training_completed;
      reason = "Treino registrado";
      next.points += earned;
      next.totalTrainingsCompleted += 1;
      break;
    }
    case "feedback_received": {
      earned = POINTS.feedback_received;
      reason = "Feedback recebido do adestrador";
      next.points += earned;
      next.totalFeedbacksReceived += 1;
      break;
    }
    case "invite_tutor": {
      const count = input.count || 1;
      earned = POINTS.invite_tutor * count;
      reason = `Convidou ${count} tutor(es)`;
      next.points += earned;
      next.tutorsInvited += count;
      break;
    }
    case "multiple_techniques": {
      if (!next.techniquesUsed.includes(input.technique)) {
        earned = POINTS.multiple_techniques;
        reason = "Utilizou nova técnica";
        next.points += earned;
        next.techniquesUsed.push(input.technique);
      }
      break;
    }
    case "task_evidence_uploaded": {
      earned = POINTS.task_evidence_uploaded;
      reason = "Evidência de tarefa enviada";
      next.points += earned;
      break;
    }
  }

  return { raw: next, earned, reason };
}

// Aplica visita diária se ainda não foi computada hoje (idempotente por dia).
export function maybeApplyDailyVisit(current: RawGamification, today: string = todayKey()): ApplyActionResult {
  if (current.lastVisitDate === today) {
    return { raw: current, earned: 0, reason: "" };
  }

  const continuesStreak = isYesterday(current.lastVisitDate, today);
  const next: RawGamification = {
    ...current,
    points: current.points + POINTS.daily_visit,
    streakDays: continuesStreak ? current.streakDays + 1 : 1,
    lastVisitDate: today,
  };

  return { raw: next, earned: POINTS.daily_visit, reason: "Visita diária" };
}
