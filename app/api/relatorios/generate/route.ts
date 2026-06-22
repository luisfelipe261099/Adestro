import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Filtrar as sessões do mês selecionado
  // O mês nos registros de sessões antigas pode estar em formato DD/MM/YYYY ou YYYY-MM-DD
  const filteredSessions = dogSessions.filter((ds) => {
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

  // Se não houver sessões no mês, retorna um rascunho com dados iniciais vazios ou mock para adestrador editar
  if (filteredSessions.length === 0) {
    return NextResponse.json({
      dogName: dog.name,
      ownerName: dog.client.name,
      month: monthParam,
      sessionsCompleted: 0,
      pointsEarned: 0,
      highlights: ["Sem sessões registradas neste período para calcular destaques."],
      areasForImprovement: ["Nenhuma área identificada no momento."],
      nextObjectives: ["Definir novos objetivos nos treinos práticos."],
      overallGrade: "C",
      progressPercentage: 50,
      recommendedNextSteps: ["Agendar treinos práticos para iniciar a evolução."],
    });
  }

  // Agrega dados para compilar o relatório
  let totalRating = 0;
  let ratingCount = 0;
  const commandRatings: Record<string, { total: number; count: number }> = {};
  const highlights: string[] = [];
  const improvements: string[] = [];
  const nextObjectivesSet = new Set<string>();
  const recommendedStepsSet = new Set<string>();
  let completedActivities = 0;
  let totalActivities = 0;

  filteredSessions.forEach((ds) => {
    // 1. Processar Comandos
    try {
      const cmds = JSON.parse(ds.commands || "[]") as Array<{ command: string; rating: number; notes?: string }>;
      cmds.forEach((c) => {
        totalRating += c.rating;
        ratingCount++;
        
        if (!commandRatings[c.command]) {
          commandRatings[c.command] = { total: 0, count: 0 };
        }
        commandRatings[c.command].total += c.rating;
        commandRatings[c.command].count++;

        if (c.rating >= 4 && c.notes) {
          highlights.push(`${c.command}: ${c.notes}`);
        } else if (c.rating <= 2.5 && c.notes) {
          improvements.push(`${c.command}: ${c.notes}`);
        }
      });
    } catch {}

    // 2. Processar Atividades
    try {
      const acts = JSON.parse(ds.activities || "[]") as Array<{ name: string; completed: boolean; notes?: string }>;
      acts.forEach((a) => {
        totalActivities++;
        if (a.completed) {
          completedActivities++;
          if (a.notes && highlights.length < 5) {
            highlights.push(`${a.name}: ${a.notes}`);
          }
        } else {
          if (a.notes && improvements.length < 5) {
            improvements.push(`${a.name}: ${a.notes}`);
          }
        }
      });
    } catch {}

    // 3. Objetivos e Tarefas sugeridas
    if (ds.nextFocus) nextObjectivesSet.add(ds.nextFocus);
    try {
      const tasks = JSON.parse(ds.nextTasks || "[]") as string[];
      tasks.forEach((t) => recommendedStepsSet.add(t));
    } catch {}
  });

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
    month: monthParam,
    sessionsCompleted: filteredSessions.length,
    pointsEarned: filteredSessions.length * 15 + completedActivities * 10, // gamification estimativa
    highlights: finalHighlights,
    areasForImprovement: finalImprovements,
    nextObjectives: finalObjectives,
    overallGrade: overallGrade,
    progressPercentage: progressPercent,
    recommendedNextSteps: finalSteps,
  });
}
