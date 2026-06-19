import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rate-limit";

// Assistente IA contextual do Adestro (módulo 3 §4.2).
// Usa IA REAL (Gemini) quando GEMINI_API_KEY está configurada; se não houver
// chave (ou a chamada falhar), cai no motor heurístico determinístico abaixo —
// então o chat nunca quebra. O contexto do cão + o histórico da conversa são
// enviados em todo turno, para a IA "lembrar" sem o adestrador repetir tudo.

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatContext = {
  dogName?: string;
  dogBreed?: string;
  dogAge?: string;
  trainingTypes?: string[];
  tutorName?: string;
  environment?: string;
  recentSessions?: Array<{ date?: string; title?: string; notes?: string[] }>;
  // Compat com a versão anterior do payload:
  sessionDescription?: string;
  commandsWorked?: Array<{ command: string; rating: number; notes?: string }>;
  privateNotes?: string;
};

type ChatRequest = {
  message: string;
  context: ChatContext;
  history?: ChatTurn[];
};

// ─── IA real (Gemini) ────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: ChatContext): string {
  const lines: string[] = [
    "Você é o assistente de IA do Adestro, especialista em adestramento e comportamento",
    "canino, falando com um adestrador profissional. Responda em português do Brasil, de",
    "forma prática, objetiva e segura, com técnicas de reforço positivo (nunca recomende",
    "punir medo ou dor). Você JÁ conhece o cão e o histórico abaixo — não peça informações",
    "que já estão aqui, e use o histórico da conversa para dar continuidade sem repetir.",
    "",
    "# Caso atual",
  ];
  if (ctx.dogName) {
    lines.push(`Cão: ${[ctx.dogName, ctx.dogBreed, ctx.dogAge].filter(Boolean).join(", ")}`);
  }
  if (ctx.tutorName) lines.push(`Tutor: ${ctx.tutorName}`);
  if (ctx.trainingTypes && ctx.trainingTypes.length) {
    lines.push(`Foco de treino: ${ctx.trainingTypes.join(", ")}`);
  }
  if (ctx.environment) lines.push(`Ambiente/convívio: ${ctx.environment}`);
  if (ctx.recentSessions && ctx.recentSessions.length) {
    lines.push("", "Sessões recentes:");
    for (const s of ctx.recentSessions.slice(0, 5)) {
      const notes = s.notes && s.notes.length ? `: ${s.notes.join("; ")}` : "";
      lines.push(`- ${s.date ?? "?"} — ${s.title ?? "Sessão"}${notes}`);
    }
  }
  if (ctx.sessionDescription) {
    lines.push("", `Resumo da última sessão: ${ctx.sessionDescription.slice(0, 300)}`);
  }
  return lines.join("\n");
}

// Aceita os nomes mais comuns de variável da chave do Gemini/Google AI, para
// funcionar com o que já estiver configurado na Vercel (sem depender de um nome).
function getGeminiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY
  );
}

async function generateWithGemini(ctx: ChatContext, history: ChatTurn[], message: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Chave do Gemini ausente");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini espera turnos alternados user/model. Mandamos as últimas 12 trocas
  // da conversa (memória) + a mensagem nova.
  const contents = [
    ...history.slice(-12).map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini: resposta vazia");
  return text;
}

// ─── Fallback heurístico (sem chave de IA / se a IA falhar) ──────────────────

function buildBriefContext(ctx: ChatContext): string {
  const parts: string[] = [];
  if (ctx.dogName) parts.push(`Cão: ${ctx.dogName}${ctx.dogBreed ? ` (${ctx.dogBreed})` : ""}`);
  if (ctx.commandsWorked && ctx.commandsWorked.length > 0) {
    const summary = ctx.commandsWorked.map((c) => `${c.command} ${c.rating}/5`).join(", ");
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
  if (body.message.length > 1000) {
    return NextResponse.json({ error: "Mensagem muito longa (máx 1000)" }, { status: 400 });
  }

  let response: string;
  let engine: "gemini" | "heuristic" = "heuristic";
  try {
    if (getGeminiKey()) {
      response = await generateWithGemini(body.context ?? {}, body.history ?? [], body.message);
      engine = "gemini";
    } else {
      response = generateResponse(body);
    }
  } catch (err) {
    console.error("[ia.session-chat] IA real falhou, usando fallback heurístico:", err);
    response = generateResponse(body);
  }

  return NextResponse.json({
    response,
    engine,
    timestamp: new Date().toISOString(),
  });
}
