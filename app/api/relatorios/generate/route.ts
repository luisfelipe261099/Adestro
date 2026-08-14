import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type LegacyActivity,
  type SessionExercise,
  parseJsonList,
  parseSessionExercises,
  sessionExercisesOf,
  summarizeExercisesByCategory,
} from "@/lib/exercise-tree";

// GET /api/relatorios/generate
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const dogId = searchParams.get("dogId");
  const monthParam = searchParams.get("month") || new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); // Ex: "maio de 2026"

  // Recorte por sessão: "evolução entre a sessão 1 e a 4", como o adestrador
  // pediu. Quando vem `fromSession`, o mês é ignorado — o período passa a ser
  // o intervalo de sessões, que é como ele conversa com o cliente.
  const fromSession = Number(searchParams.get("fromSession"));
  const toSession = Number(searchParams.get("toSession"));
  const porSessao = Number.isFinite(fromSession) && fromSession > 0;

  if (!dogId) {
    return NextResponse.json({ error: "dogId é obrigatório" }, { status: 400 });
  }

  // Buscar cão e cliente
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    include: {
      client: { select: { name: true } },
    },
  });

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

  // Ordem cronológica do cão: a "sessão 1" é a primeira que ele fez, não o id
  // nem o número digitado — assim o recorte casa com o que o cliente vê.
  const emOrdem = [...dogSessions].sort((a, b) => {
    const t = (d?: string | null) => {
      const v = (d ?? "").trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v.slice(0, 10)).getTime();
      const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      return br ? new Date(`${br[3]}-${br[2]}-${br[1]}`).getTime() : 0;
    };
    return t(a.session.date) - t(b.session.date);
  });

  // Filtrar as sessões do mês selecionado
  // O mês nos registros de sessões antigas pode estar em formato DD/MM/YYYY ou YYYY-MM-DD
  const filteredSessions = porSessao
    ? emOrdem.slice(
        Math.max(0, fromSession - 1),
        Number.isFinite(toSession) && toSession >= fromSession ? toSession : undefined,
      )
    : dogSessions.filter((ds) => {
    const sDate = ds.session.date; // Ex: "26/05/2026" ou "2026-05-26"
    if (!sDate) return false;
    
    // Simplificado: se o parâmetro do mês (ex: "maio") ou partes dele baterem com a data
    // Vamos mapear números de meses para português
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const lowercaseMonth = monthParam.toLowerCase();
    
    // Obter mês da data
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
    return true; // Se falhar na análise estruturada, inclui por padrão
  });

  // Série da evolução: uma entrada por sessão do recorte, com a média das
  // estrelas e as notas comportamentais. É o que vira o gráfico — antes o
  // relatório só mostrava o número inicial e o final.
  const progressSeries = filteredSessions.map((ds, indice) => {
    const itens = sessionExercisesOf(ds);
    const media = itens.length ? itens.reduce((soma, i) => soma + i.rating, 0) / itens.length : 0;
    let comportamento: Record<string, number> = {};
    try {
      const bruto = ds.behaviorScores ? JSON.parse(ds.behaviorScores) : null;
      if (bruto && typeof bruto === "object") comportamento = bruto as Record<string, number>;
    } catch {
      comportamento = {};
    }
    const posicaoGeral = emOrdem.findIndex((item) => item.id === ds.id);
    return {
      sessao: porSessao ? fromSession + indice : posicaoGeral + 1,
      data: ds.session.date,
      titulo: ds.session.title,
      media: Number(media.toFixed(2)),
      exercicios: itens.length,
      comportamento,
    };
  });

  // Se não houver sessões no mês, retorna um rascunho com dados iniciais vazios ou mock para adestrador editar
  if (filteredSessions.length === 0) {
    return NextResponse.json({
      dogName: dog.name,
      ownerName: dog.client.name,
      month: monthParam,
      periodMode: porSessao ? "sessao" : "mes",
      progressSeries: [],
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
  // marcados + nota; registros antigos (atividades/comandos) são convertidos
  // para o mesmo formato, então existe um caminho só daqui pra frente.
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
    // 1. Exercícios trabalhados (com a estrela do próprio exercício)
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

  // Resumo agrupado por Categoria — vai pronto para o texto do tutor.
  const categoryBreakdown = summarizeExercisesByCategory(periodExercises).map((group) => ({
    ...group,
    exercises: group.exercises.slice(0, 6),
  }));

  // Cálculos finais
  const averageScore = ratingCount > 0 ? (totalRating / ratingCount) : 3; // 1 a 5 estrelas
  const progressPercent = totalActivities > 0 
    ? Math.round((completedActivities / totalActivities) * 100) 
    : Math.round(averageScore * 20);

  let overallGrade = "C";
  if (averageScore >= 4.5) overallGrade = "A";
  else if (averageScore >= 3.8) overallGrade = "B";
  else if (averageScore >= 2.8) overallGrade = "C";
  else if (averageScore >= 1.8) overallGrade = "D";
  else overallGrade = "F";

  // Formatação de listas
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
    ownerName: dog.client.name,
    month: porSessao
      ? `Sessão ${fromSession}${Number.isFinite(toSession) && toSession > fromSession ? ` à ${toSession}` : ""}`
      : monthParam,
    periodMode: porSessao ? "sessao" : "mes",
    progressSeries,
    sessionsCompleted: filteredSessions.length,
    pointsEarned: filteredSessions.length * 15 + completedActivities * 10, // gamification estimativa
    highlights: finalHighlights,
    areasForImprovement: finalImprovements,
    nextObjectives: finalObjectives,
    overallGrade: overallGrade,
    progressPercentage: progressPercent,
    recommendedNextSteps: finalSteps,
    categoryBreakdown,
  });
}
