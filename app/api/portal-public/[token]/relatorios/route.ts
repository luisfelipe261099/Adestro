import { NextResponse } from "next/server";
import { isPortalPinValid, isPortalTokenActive, hashPortalToken } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import {
  type LegacyActivity,
  type SessionExercise,
  parseJsonList,
  parseSessionExercises,
  sessionExercisesOf,
  summarizeExercisesByCategory,
} from "@/lib/exercise-tree";

type Params = { params: Promise<{ token: string }> };

async function resolveLink(rawToken: string, pin?: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  const tokenHash = hashPortalToken(token);

  const link = await prisma.portalAccessLink.findUnique({
    where: { tokenHash },
    include: {
      trainer: { select: { id: true, name: true, phone: true } },
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          plan: true,
          dogs: true,
        },
      },
    },
  });

  if (!link) return null;
  if (!isPortalTokenActive({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) return null;
  if (!isPortalPinValid(link.pinHash, pin)) {
    return "PIN_INVALID";
  }

  return link;
}

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin") ?? undefined;
  const dogId = searchParams.get("dogId");
  const monthParam = searchParams.get("month") || new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const link = await resolveLink(token, pin);

  if (link === "PIN_INVALID") {
    return NextResponse.json({ error: "PIN obrigatório ou inválido", code: "PIN_REQUIRED" }, { status: 401 });
  }

  if (!link) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }

  if (!dogId) {
    return NextResponse.json({ error: "dogId é obrigatório" }, { status: 400 });
  }

  // Verificar se o cão pertence ao cliente desse link público
  const dogBelongsToClient = link.client.dogs.some((d) => d.id === dogId);
  if (!dogBelongsToClient) {
    return NextResponse.json({ error: "Acesso negado para este cão" }, { status: 403 });
  }

  // Buscar cão
  const dog = link.client.dogs.find((d) => d.id === dogId);
  if (!dog) {
    return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });
  }

  // Obter todas as sessões de treino do cão
  const dogSessions = await prisma.dogTrainingSession.findMany({
    where: {
      dogId: dogId,
    },
    include: {
      session: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Filtrar as sessões do mês selecionado
  const filteredSessions = dogSessions.filter((ds) => {
    const sDate = ds.session.date;
    if (!sDate) return false;
    
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const lowercaseMonth = monthParam.toLowerCase();
    
    let dateMonthIndex = -1;
    let dateYear = "";
    if (sDate.includes("/")) {
      const parts = sDate.split("/");
      dateMonthIndex = Number(parts[1]) - 1;
      dateYear = parts[2];
    } else if (sDate.includes("-")) {
      const parts = sDate.split("-");
      dateMonthIndex = Number(parts[1]) - 1;
      dateYear = parts[0];
    }

    if (dateMonthIndex >= 0 && dateMonthIndex < 12) {
      const monthName = monthsPt[dateMonthIndex];
      const matchMonth = lowercaseMonth.includes(monthName);
      const matchYear = dateYear ? lowercaseMonth.includes(dateYear) : true;
      return matchMonth && matchYear;
    }
    return true;
  });

  // Se não houver sessões no mês, retorna rascunho com dados padrão
  if (filteredSessions.length === 0) {
    return NextResponse.json({
      dogName: dog.name,
      ownerName: link.client.name,
      month: monthParam,
      sessionsCompleted: 0,
      pointsEarned: 0,
      highlights: ["Sem sessões registradas neste período para calcular destaques."],
      areasForImprovement: ["Nenhuma área identificada no momento."],
      nextObjectives: ["Definir novos objetivos nos treinos práticos."],
      overallGrade: "C",
      progressPercentage: 50,
      recommendedNextSteps: ["Agendar treinos práticos para iniciar a evolução."],
      categoryBreakdown: [],
    });
  }

  // Agrega dados para compilar o relatório. A base é a lista de Exercícios
  // marcados + nota; registros antigos são convertidos para o mesmo formato.
  let totalRating = 0;
  let ratingCount = 0;
  const highlights: string[] = [];
  const improvements: string[] = [];
  const nextObjectivesSet = new Set<string>();
  const recommendedStepsSet = new Set<string>();
  const periodExercises: SessionExercise[] = [];
  let completedActivities = 0;
  let totalActivities = 0;

  filteredSessions.forEach((ds) => {
    // 1. Exercícios trabalhados (estrela 1-5 por exercício)
    const items = sessionExercisesOf(ds);
    periodExercises.push(...items);

    items.forEach((item) => {
      totalRating += item.rating;
      ratingCount++;

      if (item.rating >= 4 && item.notes) {
        highlights.push(`${item.name}: ${item.notes}`);
      } else if (item.rating <= 2 && item.notes) {
        improvements.push(`${item.name}: ${item.notes}`);
      }
    });

    // 2. Taxa de conclusão de atividades — só existe nos registros antigos.
    const isLegacy = parseSessionExercises(parseJsonList(ds.exercises)).length === 0;
    if (isLegacy) {
      parseJsonList<LegacyActivity>(ds.activities).forEach((a) => {
        totalActivities++;
        if (a.completed) completedActivities++;
      });
    }

    // 3. Objetivos e Tarefas sugeridas
    if (ds.nextFocus) nextObjectivesSet.add(ds.nextFocus);
    parseJsonList<string>(ds.nextTasks).forEach((t) => recommendedStepsSet.add(t));
  });

  // Resumo por Categoria — o tutor lê "Obediência 4.2/5" em vez de uma lista solta.
  const categoryBreakdown = summarizeExercisesByCategory(periodExercises).map((group) => ({
    ...group,
    exercises: group.exercises.slice(0, 6),
  }));

  const averageScore = ratingCount > 0 ? (totalRating / ratingCount) : 3;
  const progressPercent = totalActivities > 0 
    ? Math.round((completedActivities / totalActivities) * 100) 
    : Math.round(averageScore * 20);

  let overallGrade = "C";
  if (averageScore >= 4.5) overallGrade = "A";
  else if (averageScore >= 3.8) overallGrade = "B";
  else if (averageScore >= 2.8) overallGrade = "C";
  else if (averageScore >= 1.8) overallGrade = "D";
  else overallGrade = "F";

  const finalHighlights = highlights.slice(0, 4);
  if (finalHighlights.length === 0) finalHighlights.push("Cão apresentou foco durante as atividades direcionadas.");

  const finalImprovements = improvements.slice(0, 3);
  if (finalImprovements.length === 0) finalImprovements.push("Reforçar comandos básicos em locais públicos.");

  const finalObjectives = Array.from(nextObjectivesSet).slice(0, 3);
  if (finalObjectives.length === 0) finalObjectives.push("Melhorar a permanência no Place sob distrações.");

  const finalSteps = Array.from(recommendedStepsSet).slice(0, 4);
  if (finalSteps.length === 0) {
    finalSteps.push("Executar treino básico de Place 2 vezes ao dia por 10 minutos.");
    finalSteps.push("Realizar passeios com guia frouxa focando em desvio de olhar.");
  }

  return NextResponse.json({
    dogName: dog.name,
    ownerName: link.client.name,
    month: monthParam,
    sessionsCompleted: filteredSessions.length,
    pointsEarned: filteredSessions.length * 15 + completedActivities * 10,
    highlights: finalHighlights,
    areasForImprovement: finalImprovements,
    nextObjectives: finalObjectives,
    overallGrade: overallGrade,
    progressPercentage: progressPercent,
    recommendedNextSteps: finalSteps,
    categoryBreakdown,
  });
}
