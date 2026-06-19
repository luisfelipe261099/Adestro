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
  route: string;
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

const DEFAULT_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    title: "Bem-vindo ao Adestro! 🐾",
    description:
      "Vou te guiar em 10 passos pelas principais funcionalidades. Pode pausar ou pular a qualquer momento.",
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
    title: "Brief do Dia",
    description:
      "Lembretes prontos pra disparar. Cada item abre o seu WhatsApp já com a mensagem preenchida — você só revisa e envia.",
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
    title: "Tutores e cães",
    description:
      "Ficha completa: dados do tutor, endereços (com link pro Google Maps), cão (vacinas, temperamento, rotinas, objetivos) e tags pra organizar.",
    placement: "top",
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
      "Configure quando os lembretes saem, horário do brief matinal, % mínimo do streak. Tudo se adapta ao seu fluxo.",
    placement: "top",
  },
  {
    id: "done",
    route: "/dashboard",
    title: "Pronto! Você já sabe o essencial 🎉",
    description:
      "Atalhos úteis: Ctrl+K abre a busca global · ícone ✨ na sessão chama a IA · clique no sininho pra ver pendências. Bom adestramento!",
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
    if (!step) return;
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
    if (pathname !== step.route) {
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
