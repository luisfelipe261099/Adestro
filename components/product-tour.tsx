"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { create } from "zustand";

// Tour auto-guiado: navega pelo app sozinho, destacando elementos e
// explicando passo a passo. Sem dependência externa (Joyride / Driver.js)
// para manter o bundle leve.

export type TourStep = {
  id: string;
  // Rota onde o passo acontece. Se diferente da atual, o tour navega antes.
  // Opcional: se ausente, o passo roda na página ATUAL sem navegar — usado em
  // tours de página única (ex.: portal do cliente, que tem rota com token).
  route?: string;
  // CSS selector que destaca o elemento (procuramos `data-tour="<id>"`
  // por padrão; também aceita selector arbitrário se começar com "." ou "#")
  selector?: string;
  title: string;
  description: string;
  // Posicionamento do tooltip relativo ao alvo
  placement?: "top" | "bottom" | "left" | "right";
  // Se true, não tenta destacar elemento — só mostra tooltip no centro
  fullScreen?: boolean;
};

type TourState = {
  active: boolean;
  stepIndex: number;
  steps: TourStep[];
  start: (steps?: TourStep[]) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  jumpTo: (index: number) => void;
};

export const TRAINER_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    title: "Bem-vindo ao Adestro! 🐾",
    description:
      "Vou te guiar pelas principais telas do sistema. O app navega sozinho — você só clica em Próximo. Pode pausar ou pular a qualquer momento.",
    fullScreen: true,
  },
  {
    id: "bell",
    route: "/dashboard",
    selector: '[data-tour="bell"]',
    title: "Sininho de notificações",
    description:
      "Aqui aparecem pendências em tempo real: presenças aguardando confirmação, treinos sem registro, cobranças vencendo. O badge laranja mostra a contagem.",
    placement: "bottom",
  },
  {
    id: "brief",
    route: "/dashboard",
    selector: '[data-tour="brief"]',
    title: "Resumo do Dia (automático)",
    description:
      "É o resumo automático do seu dia: lembretes de WhatsApp para os clientes que têm aula amanhã e treinos que faltam registrar. Cada item já abre o WhatsApp com a mensagem pronta — você só revisa e envia.",
    placement: "top",
  },
  {
    id: "agenda",
    route: "/agenda",
    selector: '[data-tour="agenda-tabs"]',
    title: "Agenda do dia/semana/mês",
    description:
      "Visualize agendamentos em 3 formatos. Cada card tem botões pra WhatsApp, confirmação, mapa e exportação pro Google Calendar.",
    placement: "bottom",
  },
  {
    id: "clientes",
    route: "/clientes",
    selector: '[data-tour="clients-list"]',
    title: "Clientes e cães",
    description:
      "Ficha completa: dados do cliente, endereços (com link pro Google Maps), cão (vacinas, temperamento, rotinas, objetivos) e tags pra organizar.",
    placement: "top",
  },
  {
    id: "treinos",
    route: "/treinos",
    title: "Feed de treinos",
    description:
      "Linha do tempo dos treinos realizados, com fotos, notas e filtros (hoje, semana, pendentes). Na aba 'Quadro' em Clientes você também arrasta cada cão entre as fases do adestramento.",
    fullScreen: true,
  },
  {
    id: "registro",
    route: "/treinos/registro",
    selector: '[data-tour="ia-chat"]',
    title: "Registro de treino + IA",
    description:
      "Grave notas por voz (transcrição automática), avalie comandos com estrelas e use o assistente IA ✨ no canto pra sugestões técnicas.",
    placement: "left",
  },
  {
    id: "portal",
    route: "/portal",
    title: "Portal do cliente",
    description:
      "Gere o link único de cada cliente e envie pelo WhatsApp. Lá o tutor vê tarefas de casa, evolução, gamificação e confirma presença — sem precisar de login.",
    fullScreen: true,
  },
  {
    id: "financeiro",
    route: "/financeiro",
    selector: '[data-tour="finance-tabs"]',
    title: "Financeiro completo",
    description:
      "Pacotes, contratos, cobranças e recibos com Pix Copia e Cola embutido. Envie cobrança via WhatsApp com 1 clique.",
    placement: "bottom",
  },
  {
    id: "relatorios",
    route: "/relatorios",
    title: "Relatórios mensais",
    description:
      "Geração automática no início do mês. Você revisa, edita análise, seleciona fotos e aprova. Compare evolução mês vs mês.",
    fullScreen: true,
  },
  {
    id: "configuracoes",
    route: "/configuracoes",
    selector: '[data-tour="settings-alerts"]',
    title: "Personalizar alertas",
    description:
      "Configure quando os lembretes saem, horário do resumo matinal, % mínimo do streak. Tudo se adapta ao seu fluxo.",
    placement: "top",
  },
  {
    id: "done",
    route: "/dashboard",
    title: "Pronto! Você já sabe o essencial 🎉",
    description:
      "Atalhos úteis: Ctrl+K abre a busca global · ícone ✨ na sessão chama a IA · clique no sininho pra ver pendências. O guia completo fica em Mais → Tutorial. Bom adestramento!",
    fullScreen: true,
  },
];

// Compat: nome antigo usado por quem inicia o tour sem passar steps.
const DEFAULT_STEPS = TRAINER_STEPS;

// Tour do ADMIN — roda nas páginas /admin.
export const ADMIN_STEPS: TourStep[] = [
  {
    id: "admin-welcome",
    route: "/admin",
    title: "Painel administrativo 👋",
    description:
      "Em poucos passos: como acompanhar a operação e gerenciar adestradores, planos, faturamento e relatórios.",
    fullScreen: true,
  },
  {
    id: "admin-nav",
    route: "/admin",
    selector: '[data-tour="admin-nav"]',
    title: "Navegação do admin",
    description:
      "Use estas abas para alternar entre Visão geral, Adestradores, Planos, Faturamento, Relatórios, Templates e Auditoria.",
    placement: "bottom",
  },
  {
    id: "admin-actions",
    route: "/admin",
    selector: '[data-tour="admin-actions"]',
    title: "Comece por aqui",
    description:
      "Atalhos mais usados: gerenciar adestradores (senha e status), ajustar planos, revisar faturamento e ver relatórios.",
    placement: "bottom",
  },
  {
    id: "admin-adestradores",
    route: "/admin/adestradores",
    title: "Adestradores",
    description:
      "Todas as contas de adestrador: crie novas, redefina senha, ative/desative acesso e acompanhe o plano de cada um.",
    fullScreen: true,
  },
  {
    id: "admin-planos",
    route: "/admin/planos",
    title: "Planos",
    description:
      "Defina o plano de cada conta (limites, valores e status da assinatura). Mudanças aqui refletem na hora para o adestrador.",
    fullScreen: true,
  },
  {
    id: "admin-faturamento",
    route: "/admin/faturamento",
    title: "Faturamento",
    description:
      "Visão consolidada de pagamentos: o que já entrou, o que está pendente e o histórico por adestrador.",
    fullScreen: true,
  },
  {
    id: "admin-relatorios",
    route: "/admin/relatorios",
    title: "Relatórios de uso",
    description:
      "Métricas de uso e desempenho da operação — sessões registradas, clientes ativos e engajamento por conta.",
    fullScreen: true,
  },
  {
    id: "admin-templates",
    route: "/admin/templates",
    title: "Templates",
    description:
      "Edite os padrões usados por todos: atividades, comandos, tarefas do cliente e o texto de cada mensagem de WhatsApp.",
    fullScreen: true,
  },
  {
    id: "admin-audit",
    route: "/admin/audit",
    title: "Auditoria",
    description:
      "Histórico de quem fez o quê no sistema. Essencial para operação com vários adestradores e para investigar problemas.",
    fullScreen: true,
  },
  {
    id: "admin-done",
    route: "/admin",
    title: "Pronto! 🎉",
    description:
      "Explore cada aba no seu ritmo. Você pode reabrir este tour quando quiser pelo botão “Tutorial” ou pela página Tutorial no menu.",
    fullScreen: true,
  },
];

// Tour do PORTAL DO TUTOR — página única (sem route, não navega).
export const TUTOR_STEPS: TourStep[] = [
  {
    id: "cliente-welcome",
    title: "Bem-vindo ao portal do seu cão! 🐾",
    description:
      "Aqui você acompanha os treinos, faz as tarefas de casa e fala com o adestrador. Vou te mostrar rapidinho.",
    fullScreen: true,
  },
  {
    id: "cliente-dog",
    selector: '[data-tour="cliente-dog"]',
    title: "Seu cão e a sequência",
    description:
      "Resumo do seu pet e a sequência diária de atividades — manter a rotina rende pontos e mantém o treino vivo.",
    placement: "bottom",
  },
  {
    id: "cliente-tasks",
    selector: '[data-tour="cliente-tasks"]',
    title: "Tarefas de casa",
    description:
      "O que o adestrador passou para praticar entre as aulas. Marque conforme for fazendo.",
    placement: "top",
  },
  {
    id: "cliente-sessions",
    selector: '[data-tour="cliente-sessions"]',
    title: "Histórico de treinos",
    description:
      "Cada aula com fotos, vídeos e avaliação. Você pode dar estrelas para cada treino.",
    placement: "top",
  },
  {
    id: "cliente-chat",
    selector: '[data-tour="cliente-chat"]',
    title: "Fale com o adestrador",
    description: "Mande dúvidas e recados por aqui — as respostas aparecem em tempo real.",
    placement: "top",
  },
  {
    id: "cliente-done",
    title: "Pronto! 🎉",
    description: "Bons treinos! Você pode reabrir este guia pelo botão “Como usar” no topo.",
    fullScreen: true,
  },
];

export const useTour = create<TourState>((set) => ({
  active: false,
  stepIndex: 0,
  steps: DEFAULT_STEPS,
  start: (steps) =>
    set((state) => ({
      active: true,
      stepIndex: 0,
      steps: steps ?? state.steps,
    })),
  next: () =>
    set((state) => {
      const nextIndex = state.stepIndex + 1;
      if (nextIndex >= state.steps.length) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("adestro-tour-done", "1");
        }
        return { active: false, stepIndex: 0 };
      }
      return { stepIndex: nextIndex };
    }),
  prev: () => set((state) => ({ stepIndex: Math.max(0, state.stepIndex - 1) })),
  stop: () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("adestro-tour-done", "1");
    }
    set({ active: false, stepIndex: 0 });
  },
  jumpTo: (index) => set({ stepIndex: index }),
}));

type Rect = { top: number; left: number; width: number; height: number };

function getRect(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computeTooltipPosition(rect: Rect, placement: "top" | "bottom" | "left" | "right"): { top: number; left: number } {
  const gap = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const margin = 16;
  const width = Math.min(320, vw - 2 * margin);
  // Altura estimada (generosa) do card. Usada só para o CLAMP — garante que o
  // card inteiro, incluindo os botões, caiba na tela mesmo quando o alvo está
  // num canto. Maior que o card real => botões sempre visíveis.
  const height = 300;

  let top: number;
  let left: number;
  switch (placement) {
    case "top":
      top = rect.top - gap - height;
      left = rect.left;
      break;
    case "left":
      top = rect.top;
      left = rect.left - gap - width;
      break;
    case "right":
      top = rect.top;
      left = rect.left + rect.width + gap;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + gap;
      left = rect.left;
      break;
  }

  // Prende o card dentro da viewport (com margem) — sem isso, alvos perto das
  // bordas faziam o card transbordar e o botão "Próximo" sumir embaixo da tela.
  left = Math.min(vw - width - margin, Math.max(margin, left));
  top = Math.min(vh - height - margin, Math.max(margin, top));
  return { top, left };
}

export function ProductTour() {
  const router = useRouter();
  const pathname = usePathname();
  const active = useTour((s) => s.active);
  const stepIndex = useTour((s) => s.stepIndex);
  const steps = useTour((s) => s.steps);
  const next = useTour((s) => s.next);
  const prev = useTour((s) => s.prev);
  const stop = useTour((s) => s.stop);

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [waitingForElement, setWaitingForElement] = useState(false);
  const pollRef = useRef<number | null>(null);

  const step = active ? steps[stepIndex] : null;

  // Navega para a rota do passo atual quando necessário
  useEffect(() => {
    if (!step || !step.route) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  // Procura elemento alvo (com polling para dar tempo da página carregar)
  useEffect(() => {
    if (!step || step.fullScreen) {
      setTargetRect(null);
      setWaitingForElement(false);
      return;
    }
    if (step.route && pathname !== step.route) {
      setWaitingForElement(true);
      return;
    }
    setWaitingForElement(true);
    let attempts = 0;
    const tryLocate = () => {
      attempts += 1;
      const rect = getRect(step.selector);
      if (rect) {
        setTargetRect(rect);
        setWaitingForElement(false);
        // Scroll target into view
        const el = document.querySelector(step.selector!) as HTMLElement | null;
        if (el && "scrollIntoView" in el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (attempts < 30) {
        pollRef.current = window.setTimeout(tryLocate, 200);
      } else {
        setWaitingForElement(false); // desiste, mostra tooltip flutuante
      }
    };
    tryLocate();
    return () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [step, pathname]);

  // Esc encerra o tour (mesma convenção dos modais do app)
  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") stop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, stop]);

  // Reposiciona em resize / scroll
  useEffect(() => {
    if (!step || step.fullScreen || !targetRect) return;
    function reposition() {
      const rect = getRect(step!.selector);
      if (rect) setTargetRect(rect);
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [step, targetRect]);

  if (!active || !step) return null;

  const placement = step.placement ?? "bottom";
  const tooltipPos =
    step.fullScreen || !targetRect
      ? null
      : computeTooltipPosition(targetRect, placement);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop com cutout */}
      <svg className="pointer-events-auto absolute inset-0 h-full w-full" onClick={(e) => e.stopPropagation()}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && !step.fullScreen ? (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={12}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(8,20,32,0.72)" mask="url(#tour-mask)" />
      </svg>

      {/* Highlight border do alvo */}
      {targetRect && !step.fullScreen ? (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-purple-400 shadow-[0_0_0_4px_rgba(168,85,247,0.25)] transition-all"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      ) : null}

      {/* Tooltip */}
      <div
        className={`pointer-events-auto fixed max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto rounded-md border border-purple-200 bg-white p-4 shadow-2xl ${
          tooltipPos ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left, width: "min(320px, calc(100vw - 32px))" } : { width: "min(360px, calc(100vw - 32px))" }}
      >
        {waitingForElement ? (
          <p className="text-xs text-[var(--muted)]">Carregando passo…</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                {stepIndex + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={stop}
                className="text-xs text-[var(--muted)] hover:text-rose-600"
                aria-label="Encerrar tour"
              >
                ✕ Encerrar
              </button>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">{step.description}</p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={stepIndex === 0}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-[var(--muted)] disabled:opacity-30"
              >
                ← Anterior
              </button>
              <div className="flex gap-1">
                {steps.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full ${idx === stepIndex ? "bg-purple-600" : "bg-slate-200"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700"
              >
                {stepIndex === steps.length - 1 ? "Finalizar" : "Próximo →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
