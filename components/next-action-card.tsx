"use client";

import Link from "next/link";

import { useAppStore } from "@/lib/app-store";

// Card "Próxima ação": conduz o adestrador novo pelo fluxo mínimo do sistema
// (tutor → aula → treino → portal) mostrando UMA ação por vez. Some sozinho
// quando a jornada inicial está completa — não incomoda quem já opera.

type JourneyStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  cta: string;
  href: string;
};

const JOURNEY: JourneyStep[] = [
  {
    id: "client",
    label: "Tutor",
    title: "Cadastre seu primeiro tutor e cão",
    description: "Tudo no Adestro começa pela ficha do tutor e do cão — agenda, treinos e portal ligam nela.",
    cta: "Cadastrar tutor",
    href: "/clientes?new=true",
  },
  {
    id: "event",
    label: "Aula",
    title: "Agende a primeira aula",
    description: "Com a aula na agenda você ganha lembrete automático de WhatsApp e confirmação de presença.",
    cta: "Agendar aula",
    href: "/agenda?new=true",
  },
  {
    id: "session",
    label: "Treino",
    title: "Registre o primeiro treino",
    description: "O registro vira histórico técnico, alimenta a IA e o relatório mensal do tutor.",
    cta: "Registrar treino",
    href: "/treinos/registro",
  },
  {
    id: "portal",
    label: "Portal",
    title: "Envie o portal ao tutor",
    description: "Crie uma tarefa de casa e mande o link único — é aí que o tutor vê o valor do seu trabalho.",
    cta: "Abrir portal",
    href: "/portal",
  },
];

export function NextActionCard() {
  const clients = useAppStore((state) => state.clients);
  const events = useAppStore((state) => state.calendarEvents);
  const sessions = useAppStore((state) => state.trainingSessions);
  const portalTasks = useAppStore((state) => state.portalTasks);

  const done = [
    clients.length > 0,
    events.length > 0,
    sessions.length > 0,
    portalTasks.length > 0,
  ];
  const currentIndex = done.indexOf(false);

  // Jornada completa → o card não existe mais.
  if (currentIndex === -1) return null;

  const step = JOURNEY[currentIndex];

  return (
    <section data-tour="next-action" className="mt-6 rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Próxima ação · passo {currentIndex + 1} de {JOURNEY.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{step.title}</h2>
          <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{step.description}</p>

          {/* Trilha da jornada */}
          <ol className="mt-3 flex flex-wrap items-center gap-1.5">
            {JOURNEY.map((item, index) => (
              <li key={item.id} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                    done[index]
                      ? "bg-emerald-100 text-emerald-800"
                      : index === currentIndex
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                >
                  {done[index] ? "✓" : index + 1} {item.label}
                </span>
                {index < JOURNEY.length - 1 ? (
                  <span aria-hidden className="text-[12px] text-[var(--muted)]">→</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <Link
          href={step.href}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-strong)]"
        >
          {step.cta} →
        </Link>
      </div>
    </section>
  );
}
