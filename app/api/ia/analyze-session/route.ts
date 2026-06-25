import { type NextRequest, NextResponse } from "next/server";

// Tipos para a análise de sessão
interface SessionData {
  session_id: string;
  trainer_notes: string;
  video_tags?: string[];
  dog_id: string;
  duration_minutes?: number;
  techniques_used?: string[];
}

interface AIAnalysis {
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  estimated_progress: number;
  recommended_exercises: string[];
  summary_for_tutor: string;
}

// Simulação de análise de IA (em produção, isso seria uma chamada para OpenAI)
function analyzeSessionWithAI(sessionData: SessionData): AIAnalysis {
  // Análise baseada em palavras-chave nas notas e tags
  const notes = sessionData.trainer_notes.toLowerCase();
  const tags = sessionData.video_tags || [];

  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextSteps: string[] = [];
  const recommendedExercises: string[] = [];

  // Detectar pontos fortes
  if (notes.includes("respondeu bem") || notes.includes("sucesso") || notes.includes("excelente")) {
    strengths.push("Resposta positiva aos comandos");
  }
  if (notes.includes("reforço")) {
    strengths.push("Boa resposta a reforço positivo");
  }
  if (tags.includes("obediência")) {
    strengths.push("Progresso em obediência básica");
  }

  // Detectar áreas de melhoria
  if (notes.includes("dificuldade") || notes.includes("desafio")) {
    improvements.push("Necessário mais prática em exercícios desafiadores");
  }
  if (notes.includes("distração")) {
    improvements.push("Melhorar concentração em ambientes com estímulos externos");
  }
  if (!tags.includes("socialização")) {
    improvements.push("Recomendar trabalho de socialização");
  }

  // Definir próximos passos
  if (tags.includes("comando")) {
    nextSteps.push("Avançar para comandos mais complexos");
    recommendedExercises.push("Começar treinamento de 'deita' e 'fica'");
  }
  if (tags.includes("obediência")) {
    nextSteps.push("Reforçar obediência em ambientes diferentes");
    recommendedExercises.push("Praticar em parques e lugares públicos");
  }

  // Fallback se não encontrou nada específico
  if (strengths.length === 0) {
    strengths.push("Boa participação na sessão de treino");
  }
  if (improvements.length === 0) {
    improvements.push("Continuar com consistência no treinamento");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Agendamento da próxima sessão");
  }

  // Estimar progresso (0-100)
  const progressBase = 50;
  const progressBonus =
    (strengths.length * 10 + (notes.length > 200 ? 10 : 0) + (sessionData.duration_minutes || 30) / 3);
  const estimatedProgress = Math.min(100, progressBase + progressBonus);

  // Gerar resumo para o cliente
  const summary = `Na sessão de hoje, ${sessionData.duration_minutes || 30} minutos, seu cão demonstrou ${strengths[0]?.toLowerCase() || "bom desempenho"}. 
Ponto de foco para casa: ${improvements[0] || "continue reforçando o aprendizado"}. 
Próximo objetivo: ${nextSteps[0] || "melhorar o comportamento em ambientes novos"}.`;

  return {
    strengths,
    improvements,
    next_steps: nextSteps,
    estimated_progress: Math.round(estimatedProgress),
    recommended_exercises: recommendedExercises,
    summary_for_tutor: summary,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionData;

    // Validar dados obrigatórios
    if (!body.session_id || !body.trainer_notes || !body.dog_id) {
      return NextResponse.json(
        {
          error: "Missing required fields: session_id, trainer_notes, or dog_id",
        },
        { status: 400 },
      );
    }

    // Executar análise
    const analysis = analyzeSessionWithAI(body);

    // Em produção, aqui você salvaria a análise no banco de dados
    // await saveAnalysisToDatabase(body.session_id, analysis);

    return NextResponse.json({
      success: true,
      session_id: body.session_id,
      dog_id: body.dog_id,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error analyzing session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Endpoint para recuperar análises salvas (implementar conforme necessário)
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "Missing session_id parameter",
      },
      { status: 400 },
    );
  }

  // Em produção, recuperar do banco de dados
  return NextResponse.json({
    message: "Endpoint GET para recuperar análises - implementar com banco de dados",
    session_id: sessionId,
  });
}
