import { NextResponse } from "next/server";

import { hashPortalToken, isPortalPinValid, isPortalTokenActive } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import {
  applyAction,
  buildPublicState,
  emptyRawGamification,
  maybeApplyDailyVisit,
  POINTS,
  type ApplyActionInput,
  type RawGamification,
} from "@/lib/gamification-shared";

type Params = { params: Promise<{ token: string }> };

async function resolveLink(rawToken: string, pin?: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  const link = await prisma.portalAccessLink.findUnique({
    where: { tokenHash: hashPortalToken(token) },
  });

  if (!link) return null;
  if (!isPortalTokenActive({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) return null;
  if (!isPortalPinValid(link.pinHash, pin)) return "PIN_INVALID" as const;

  return link;
}

function deserializeWatched(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function deserializeRatings(raw: string | null | undefined): Record<string, number> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const num = Number(value);
        if (Number.isFinite(num)) out[String(key)] = Math.max(1, Math.min(5, Math.round(num)));
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

async function loadOrCreateRaw(trainerId: string, clientId: string): Promise<{ raw: RawGamification; existed: boolean }> {
  const existing = await prisma.clientGamification.findUnique({ where: { clientId } });
  if (existing) {
    return {
      existed: true,
      raw: {
        points: existing.points,
        streakDays: existing.streakDays,
        lastVisitDate: existing.lastVisitDate ?? "",
        streakTolerance: existing.streakTolerance,
        lastStreakUpdateDate: existing.lastStreakUpdateDate ?? "",
        trainerRating: existing.trainerRating,
        totalTasksCompleted: existing.totalTasksCompleted,
        totalFeedbacks: existing.totalFeedbacks,
        totalTrainingsCompleted: existing.totalTrainingsCompleted,
        totalFeedbacksReceived: existing.totalFeedbacksReceived,
        tutorsInvited: existing.tutorsInvited,
        techniquesUsed: deserializeWatched(existing.techniquesUsed),
        weeklyTasksCompleted: existing.weeklyTasksCompleted,
        successfulTrainings: existing.successfulTrainings,
        videosShared: existing.videosShared,
        monthlyProgress: existing.monthlyProgress,
        watchedVideos: deserializeWatched(existing.watchedVideos),
        sessionRatings: deserializeRatings(existing.sessionRatings),
      },
    };
  }

  return { existed: false, raw: emptyRawGamification() };
}

async function persistRaw(trainerId: string, clientId: string, raw: RawGamification, existed: boolean) {
  const data = {
    points: raw.points,
    streakDays: raw.streakDays,
    lastVisitDate: raw.lastVisitDate || null,
    streakTolerance: raw.streakTolerance ?? 100,
    lastStreakUpdateDate: raw.lastStreakUpdateDate || "",
    trainerRating: raw.trainerRating,
    totalTasksCompleted: raw.totalTasksCompleted,
    totalFeedbacks: raw.totalFeedbacks,
    totalTrainingsCompleted: raw.totalTrainingsCompleted,
    totalFeedbacksReceived: raw.totalFeedbacksReceived,
    tutorsInvited: raw.tutorsInvited,
    techniquesUsed: JSON.stringify(raw.techniquesUsed ?? []),
    weeklyTasksCompleted: raw.weeklyTasksCompleted,
    successfulTrainings: raw.successfulTrainings,
    videosShared: raw.videosShared,
    monthlyProgress: raw.monthlyProgress,
    watchedVideos: JSON.stringify(raw.watchedVideos ?? []),
    sessionRatings: JSON.stringify(raw.sessionRatings ?? {}),
  };

  if (existed) {
    await prisma.clientGamification.update({ where: { clientId }, data });
  } else {
    await prisma.clientGamification.create({ data: { ...data, clientId, trainerId } });
  }
}

async function countCompletedTasks(trainerId: string, clientId: string): Promise<number> {
  return prisma.portalTask.count({
    where: { trainerId, clientId, completed: true },
  });
}

async function countFeedbacks(trainerId: string, clientId: string): Promise<number> {
  return prisma.portalFeedback.count({
    where: { trainerId, clientId, author: "Tutor" },
  });
}

async function taskMatchesState(trainerId: string, clientId: string, taskId: string, completed: boolean): Promise<boolean> {
  const task = await prisma.portalTask.findFirst({
    where: { id: taskId, trainerId, clientId },
    select: { completed: true },
  });

  return Boolean(task && task.completed === completed);
}

async function getClientName(clientId: string): Promise<string | null> {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    select: { name: true },
  });

  return client?.name ?? null;
}

async function sessionBelongsToClient(trainerId: string, clientId: string, sessionId: string): Promise<boolean> {
  const clientName = await getClientName(clientId);
  const ownershipFilters: Array<Record<string, unknown>> = [{ dog: { clientId } }];
  if (clientName) ownershipFilters.push({ clientName });

  const session = await prisma.trainingSession.findFirst({
    where: {
      id: sessionId,
      trainerId,
      OR: ownershipFilters,
    },
    select: { id: true },
  });

  return Boolean(session);
}

async function videoBelongsToClient(trainerId: string, clientId: string, videoId: string): Promise<boolean> {
  const clientName = await getClientName(clientId);
  const ownershipFilters: Array<Record<string, unknown>> = [{ dog: { clientId } }];
  if (clientName) ownershipFilters.push({ clientName });

  const sessions = await prisma.trainingSession.findMany({
    where: {
      trainerId,
      OR: ownershipFilters,
    },
    select: { id: true, media: true },
    take: 50,
  });

  for (const session of sessions) {
    try {
      const media = JSON.parse(session.media || "[]") as Array<{ id?: string }>;
      if (!Array.isArray(media)) continue;
      if (media.some((item, index) => `${session.id}-${item.id || index}` === videoId)) return true;
    } catch {
      // ignore malformed media entries
    }
  }

  return false;
}

function syncTaskTotals(raw: RawGamification, actualCompleted: number): { raw: RawGamification; earned: number; reason: string } {
  const difference = actualCompleted - raw.totalTasksCompleted;
  const pointsDelta = difference * POINTS.task_completed;
  return {
    raw: {
      ...raw,
      points: Math.max(0, raw.points + pointsDelta),
      totalTasksCompleted: actualCompleted,
    },
    earned: Math.max(0, pointsDelta),
    reason: pointsDelta > 0 ? "Tarefa concluída" : "",
  };
}

function syncFeedbackTotals(raw: RawGamification, actualFeedbacks: number): { raw: RawGamification; earned: number; reason: string } {
  const difference = actualFeedbacks - raw.totalFeedbacks;
  const pointsDelta = difference * POINTS.feedback_sent;
  return {
    raw: {
      ...raw,
      points: Math.max(0, raw.points + pointsDelta),
      totalFeedbacks: actualFeedbacks,
    },
    earned: Math.max(0, pointsDelta),
    reason: pointsDelta > 0 ? "Comentário enviado" : "",
  };
}

async function evaluateStreak(raw: RawGamification, trainerId: string, clientId: string): Promise<{ raw: RawGamification; earned: number; reason: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10);

  const tasks = await prisma.portalTask.findMany({
    where: { trainerId, clientId },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const streakTolerance = raw.streakTolerance ?? 100;
  const lastStreakUpdateDate = raw.lastStreakUpdateDate ?? "";

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

  let nextRaw = { ...raw };
  let earned = 0;
  let reason = "";

  if (completionRate >= streakTolerance) {
    if (lastStreakUpdateDate === yesterday) {
      nextRaw.streakDays += 1;
      nextRaw.lastStreakUpdateDate = today;
      earned = 5;
      reason = `Meta diária batida! Sequência: ${nextRaw.streakDays} dias`;
      nextRaw.points += earned;
    } else if (lastStreakUpdateDate === today) {
      // already updated today
    } else {
      nextRaw.streakDays = 1;
      nextRaw.lastStreakUpdateDate = today;
      earned = 5;
      reason = "Meta diária batida! Nova sequência iniciada";
      nextRaw.points += earned;
    }
  } else {
    if (lastStreakUpdateDate !== today && lastStreakUpdateDate !== yesterday && lastStreakUpdateDate !== "") {
      nextRaw.streakDays = 0;
    }
  }

  return { raw: nextRaw, earned, reason };
}

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }
  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const { raw, existed } = await loadOrCreateRaw(link.trainerId, link.clientId);
  const visit = maybeApplyDailyVisit(raw);
  const streak = await evaluateStreak(visit.raw, link.trainerId, link.clientId);
  
  if (visit.earned > 0 || streak.earned > 0 || !existed) {
    await persistRaw(link.trainerId, link.clientId, streak.raw, existed);
  }

  const state = buildPublicState(streak.raw);
  
  let earnedAlert = null;
  if (visit.earned > 0) {
    earnedAlert = { points: visit.earned, reason: visit.reason };
  } else if (streak.earned > 0) {
    earnedAlert = { points: streak.earned, reason: streak.reason };
  }

  return NextResponse.json({
    state,
    earned: earnedAlert,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") ?? undefined;
  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatorio ou invalido", code: "PIN_REQUIRED" }, { status: 401 });
  }
  if (!link) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ApplyActionInput> | null;
  if (!body || !body.action) {
    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  }

  if (body.action === "trainer_rated" && (typeof body.rating !== "number")) {
    return NextResponse.json({ error: "Rating obrigatorio" }, { status: 400 });
  }
  if (body.action === "session_rated" && (typeof body.rating !== "number" || !body.sessionId)) {
    return NextResponse.json({ error: "sessionId e rating obrigatorios" }, { status: 400 });
  }
  if (body.action === "video_watched" && !body.videoId) {
    return NextResponse.json({ error: "videoId obrigatorio" }, { status: 400 });
  }
  if ((body.action === "task_completed" || body.action === "task_uncompleted") && !body.taskId) {
    return NextResponse.json({ error: "taskId obrigatorio" }, { status: 400 });
  }
  if (body.action === "task_evidence_uploaded" && !body.taskId) {
    return NextResponse.json({ error: "taskId obrigatorio" }, { status: 400 });
  }

  const allowed: ApplyActionInput["action"][] = [
    "task_completed",
    "task_uncompleted",
    "feedback_sent",
    "trainer_rated",
    "session_rated",
    "video_watched",
    "task_evidence_uploaded",
  ];
  if (!allowed.includes(body.action as ApplyActionInput["action"])) {
    return NextResponse.json({ error: "Acao nao suportada" }, { status: 400 });
  }

  const { raw, existed } = await loadOrCreateRaw(link.trainerId, link.clientId);

  let result: { raw: RawGamification; earned: number; reason: string };
  if (body.action === "task_completed" || body.action === "task_uncompleted") {
    const expectedCompleted = body.action === "task_completed";
    const taskId = String(body.taskId);
    const matches = await taskMatchesState(link.trainerId, link.clientId, taskId, expectedCompleted);
    if (!matches) {
      return NextResponse.json({ error: "Tarefa nao encontrada ou nao sincronizada" }, { status: 409 });
    }
    result = syncTaskTotals(raw, await countCompletedTasks(link.trainerId, link.clientId));
  } else if (body.action === "feedback_sent") {
    result = syncFeedbackTotals(raw, await countFeedbacks(link.trainerId, link.clientId));
  } else if (body.action === "session_rated") {
    const belongs = await sessionBelongsToClient(link.trainerId, link.clientId, String(body.sessionId));
    if (!belongs) {
      return NextResponse.json({ error: "Aula nao encontrada para este portal" }, { status: 404 });
    }
    result = applyAction(raw, body as ApplyActionInput);
  } else if (body.action === "video_watched") {
    const belongs = await videoBelongsToClient(link.trainerId, link.clientId, String(body.videoId));
    if (!belongs) {
      return NextResponse.json({ error: "Midia nao encontrada para este portal" }, { status: 404 });
    }
    result = applyAction(raw, body as ApplyActionInput);
  } else if (body.action === "task_evidence_uploaded") {
    const task = await prisma.portalTask.findFirst({
      where: { id: body.taskId, trainerId: link.trainerId, clientId: link.clientId },
    });
    if (!task) {
      return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 });
    }
    result = applyAction(raw, body as ApplyActionInput);
  } else {
    result = applyAction(raw, body as ApplyActionInput);
  }

  const streak = await evaluateStreak(result.raw, link.trainerId, link.clientId);
  await persistRaw(link.trainerId, link.clientId, streak.raw, existed);

  const state = buildPublicState(streak.raw);
  
  let earnedAlert = null;
  if (result.earned > 0) {
    earnedAlert = { points: result.earned, reason: result.reason };
  } else if (streak.earned > 0) {
    earnedAlert = { points: streak.earned, reason: streak.reason };
  }

  return NextResponse.json({
    state,
    earned: earnedAlert,
  });
}
