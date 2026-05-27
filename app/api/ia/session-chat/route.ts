import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rate-limit";

// Assistente IA contextual para a página de sessão (módulo 3 §4.2 Seção I).
// MVP grátis: motor heurístico determinístico baseado nas notas + comandos da sessão.
// Quando o adestrador quiser conectar IA real (Gemini gratuito, Llama via Ollama,
// OpenAI, etc.), basta trocar a função `generateResponse` por uma chamada à API.

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatRequest = {
  message: string;
  context: {
    dogName?: string;
    dogBreed?: string;
    sessionDescription?: string;
    commandsWorked?: Array<{ command: string; rating: number; notes?: string }>;
    privateNotes?: string;
  };
  history?: ChatTurn[];
};

function buildBriefContext(ctx: ChatRequest["context"]): string {
  const parts: string[] = [];
  if (ctx.dogName) parts.push(`Cão: ${ctx.dogName}${ctx.dogBreed ? ` (${ctx.dogBreed})` : ""}`);
  if (ctx.commandsWorked && ctx.commandsWorked.length > 0) {
    const summary = ctx.commandsWorked
      .map((c) => `${c.command} ${c.rating}/5`)
      .join(", ");
    parts.push(`Comandos: ${summary}`);
  }
  if (ctx.sessionDescription) {
    parts.push(`Resumo: ${ctx.sessionDescription.slice(0, 200)}`);
  }
  return parts.join(" • ");
}

function generateResponse(input: ChatRequest): string {
  const message = input.message.trim().toLowerCase();
  const ctx = input.context;
  const dog = ctx.dogName || "o cão";
  const breed = ctx.dogBreed || "";

  if (!message) return "Pergunte algo sobre o treino — posso sugerir próximos passos, técnicas ou exercícios.";

  // Detecta tópicos populares
  if (message.includes("próxim") || message.includes("plano") || message.includes("planejar")) {
    const lowRated = (ctx.commandsWorked ?? []).filter((c) => c.rating <= 3);
    if (lowRated.length > 0) {
      const focus = lowRated.map((c) => c.command).slice(0, 3).join(", ");
      return `Para a próxima aula, foque em **${focus}** — ainda estão abaixo do limiar de retenção. ` +
        `Use sessões curtas (5 a 7 min cada) com reforço variável. ` +
        `Termine sempre com o melhor comando do ${dog} para reforço positivo.`;
    }
    return `${dog} está bem em todos os comandos avaliados. Pode introduzir **distrações graduais** (sons, pessoas, outros cães) mantendo os comandos atuais. Considere também um comando novo por sessão.`;
  }

  if (message.includes("ansied") || message.includes("medo") || message.includes("fobia")) {
    return `Para ansiedade${breed ? ` em raças como ${breed}` : ""}: trabalhe dessensibilização gradual. ` +
      `Apresente o estímulo a uma distância onde ${dog} ainda esteja confortável e recompense calma. ` +
      `Diminua a distância em sessões progressivas. **Nunca puna a manifestação de medo** — só piora.`;
  }

  if (message.includes("puxa") || message.includes("guia") || message.includes("passeio")) {
    return `Para parar de puxar na guia: a regra é **parar de andar quando ele puxa**. ` +
      `Mude de direção sem aviso para ensiná-lo a prestar atenção. Recompense quando a guia ficar frouxa. ` +
      `Use peitoral H ou guia de cabeça (Halti) apenas como ferramenta auxiliar, nunca como solução.`;
  }

  if (message.includes("late") || message.includes("latid")) {
    return `Latido excessivo: identifique o gatilho (porta, gente passando, sons). ` +
      `Para latido de aviso, ensine "quieto" recompensando 1-2 segundos de silêncio e depois aumentando. ` +
      `Para latido de ansiedade, trate a causa raiz — não o sintoma.`;
  }

  if (message.includes("recall") || message.includes("vem")) {
    return `Recall (chamado): comece em ambiente sem distração com guia longa de 5m. ` +
      `**Nunca chame ${dog} para algo ruim** (banho, fim do passeio). ` +
      `Recompense de forma variável e alta intensidade. Quando estiver 90% confiável, aumente a distração devagar.`;
  }

  if (message.includes("filhote") || message.includes("socializa")) {
    return `Janela crítica de socialização: 3 a 16 semanas. Exponha ${dog} a sons, superfícies, pessoas, outros cães vacinados e ambientes diversos. ` +
      `**Qualidade > quantidade**: experiências positivas curtas são melhores que muitas estressantes.`;
  }

  if (message.includes("resum") || message.includes("analise") || message.includes("análise")) {
    const context = buildBriefContext(ctx);
    return `Análise rápida do treino de hoje: ${context || "(ainda sem dados estruturados — preencha comandos e descrição)"}. ` +
      `Pontos fortes destacados, anote no campo "Resumo público" o que o tutor precisa reforçar em casa.`;
  }

  // Fallback genérico contextualizado
  const context = buildBriefContext(ctx);
  return `Sobre "${input.message.slice(0, 60)}" — considere o contexto: ${context || "ainda há poucos dados nesta sessão"}. ` +
    `Pergunte sobre próximos passos, ansiedade, recall, latido, socialização ou análise do treino para respostas mais ricas.`;
}

export async function POST(request: Request) {
  const limited = requireRateLimit(request, {
    suffix: "ia-chat",
    config: { capacity: 20, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const body = (await request.json()) as ChatRequest;
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message obrigatorio" }, { status: 400 });
  }
  if (body.message.length > 500) {
    return NextResponse.json({ error: "Mensagem muito longa (máx 500)" }, { status: 400 });
  }

  const response = generateResponse(body);

  return NextResponse.json({
    response,
    timestamp: new Date().toISOString(),
  });
}
