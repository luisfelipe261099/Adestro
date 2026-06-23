"use client";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { useTour } from "@/components/product-tour";
import { useAppStore } from "@/lib/app-store";

type FlowStep = {
  title: string;
  why: string;
  how: string[];
  shortcut?: string;
};

const trainerFlow: FlowStep[] = [
  {
    title: "1) Cadastrar cliente e cão",
    why: "Base de todo o acompanhamento — todo registro futuro liga aqui.",
    how: [
      "Em /clientes toque em '+' e preencha cliente, endereços (com link pro Google Maps) e ficha completa do cão.",
      "Vacinas têm alerta de vencimento automático. Temperamento, rotinas e objetivos viram contexto pra IA.",
      "Use o link de onboarding pro próprio cliente preencher os dados antes da 1ª aula (modo rascunho até você aprovar).",
      "Tags (VIP, Inadimplente, Filhote, Sênior, etc) ajudam a filtrar — pode editar inline no card.",
    ],
    shortcut: "Atalho: Ctrl+K → 'Novo cliente'",
  },
  {
    title: "2) Agendar o treino",
    why: "A agenda mostra cada atendimento, sincroniza com Google/Apple Calendar e organiza a confirmação de presença.",
    how: [
      "Em /agenda escolha Dia, Semana ou Mês. O '+' superior cria agendamento novo.",
      "Cada card de evento tem 6 ações: ✅ Confirmação WhatsApp, 💬 WhatsApp geral, 📍 Mapa, 📆 Google Calendar, .ics (Apple), 📝 Registrar.",
      "Recorrência semanal/quinzenal gera a série de eventos automaticamente.",
      "Quando o cliente clica em ✅ pelo portal, o status muda pra 'Confirmado' e aparece no seu sininho.",
    ],
  },
  {
    title: "3) Registrar o treino realizado",
    why: "Transforma a aula em histórico técnico — e vira insumo da IA, do relatório mensal e da nota do cliente.",
    how: [
      "Em /treinos/registro escolha o cão e preencha as 9 seções (A-I).",
      "🎙️ Grave nota por voz: a Web Speech API transcreve em tempo real (Chrome, Edge, Safari iOS).",
      "Avalie comandos com estrelas 1-5 — vira o gráfico de evolução no relatório mensal.",
      "Para sessões coletivas, cada cão tem sub-registro independente nas seções D, E, F e H.",
      "No canto direito ✨ abre o Assistente IA contextual (chat com 6 tópicos especialistas).",
    ],
    shortcut: "Atalho: clique no ✨ flutuante no canto direito",
  },
  {
    title: "4) Aprovar resumo IA + planejar próxima aula",
    why: "A IA monta um rascunho, mas só o adestrador aprova o que o cliente vai ver.",
    how: [
      "Na Seção F após registrar, toque em 'Gerar análise IA' — o resumo aparece pra revisão.",
      "Marque 'Aprovar e liberar para o cliente' só quando o texto refletir sua leitura técnica.",
      "Na Seção H, defina foco da próxima sessão e tarefas pro cliente fazer em casa.",
      "Notas confidenciais (Seção D) NUNCA são compartilhadas — só você vê.",
    ],
  },
  {
    title: "5) Compartilhar o portal do cliente",
    why: "O cliente acompanha tarefas, evolução e gamificação por um link único — sem login, com PIN opcional.",
    how: [
      "Em /portal gere/copie o link único do cliente e envie pelo WhatsApp (template já pronto).",
      "O cliente vê: nível do cão, streak diário 🔥, tarefas de hoje (com upload de foto), histórico, badges.",
      "Quando o cliente responde NPS após cada aula, você recebe a média no comparativo mensal.",
      "Banner azul de 'Confirmar presença' aparece no portal quando há evento pendente.",
    ],
  },
  {
    title: "6) Operar financeiro + emitir recibo",
    why: "Pacote → contrato → cobranças automáticas → recibo com Pix Copia e Cola embutido.",
    how: [
      "Em /financeiro cadastre pacotes (sessões, valor, fracionamento, validade).",
      "Vender pacote gera contrato e cobranças automaticamente.",
      "No recibo, se sua chave Pix estiver configurada, gera o BR Code Copia e Cola — o cliente cola no banco e pronto.",
      "Botão 💬 Lembrar em cada cobrança abre WhatsApp com texto pronto (cobrança pendente ou em atraso).",
      "Cron diário às 07h gera os lembretes do dia automaticamente.",
    ],
  },
  {
    title: "7) Aprovar e enviar relatório mensal",
    why: "Cliente percebe valor quando vê o progresso documentado mês a mês.",
    how: [
      "Em /relatorios o rascunho aparece automaticamente no início do mês.",
      "Edite seções, selecione fotos, ajuste a análise gerada pela IA.",
      "Toque 'Aprovar e Gerar PDF' → 'Imprimir / PDF' do browser.",
      "Use 'Comparativo mês vs mês' pra mostrar evolução em sessões, comandos médios, % atividades e NPS.",
    ],
  },
];

const featureHighlights = [
  {
    icon: "🔔",
    title: "Sininho com badge dinâmico",
    text: "Conta pendências reais (confirmações aguardando, treinos sem registro, mensagens novas, relatórios pra aprovar). Filtros por tipo.",
  },
  {
    icon: "☀️",
    title: "Resumo do dia no Dashboard",
    text: "Cron prepara lembretes wa.me prontos pra disparar. Você abre o app de manhã e dispara em 3-4 toques.",
  },
  {
    icon: "✨",
    title: "Assistente IA contextual",
    text: "Chat dentro da página de sessão. Sabe o cão, raça, comandos e descrição. Atalhos: planejamento, ansiedade, recall, latido, socialização, análise.",
  },
  {
    icon: "🎙️",
    title: "Transcrição por voz nativa",
    text: "Web Speech API. Aperta, fala, para. Texto aparece em tempo real. Áudio nunca sai do device.",
  },
  {
    icon: "📋",
    title: "Templates editáveis",
    text: "Em /admin/templates você edita atividades, comandos padrão, tarefas do cliente e o texto de cada mensagem WhatsApp.",
  },
  {
    icon: "🏷️",
    title: "Tags + filtros",
    text: "Adicione tags livres aos clientes (VIP, Inadimplente, Reativo, Filhote). Edita inline no card.",
  },
  {
    icon: "💳",
    title: "Pix Copia e Cola",
    text: "BR Code EMV do Banco Central gerado no recibo. Sem gateway pago.",
  },
  {
    icon: "📥",
    title: "Importar clientes via CSV",
    text: "Em /configuracoes envie o arquivo com cabeçalho name,phone,email,dogName,dogBreed,notes.",
  },
  {
    icon: "📤",
    title: "Export LGPD",
    text: "Baixe um JSON com TODOS os dados da conta. Direito do titular (Art. 18 LGPD).",
  },
  {
    icon: "🔍",
    title: "Cmd+K busca global",
    text: "Aperta Ctrl+K (ou ⌘K) em qualquer tela: busca cliente, cão, sessão ou tela.",
  },
  {
    icon: "🌙",
    title: "Dark mode",
    text: "Toggle em /configuracoes. Sem flicker no carregamento.",
  },
  {
    icon: "📜",
    title: "Audit log",
    text: "Histórico de quem fez o quê em /admin/audit. Essencial pra multi-adestrador.",
  },
];

const assistantExamples = [
  {
    case: "Pastor Alemão puxando na guia",
    suggestion: "A IA sugere aquecimento de foco, reforço por andar ao lado, mudanças de direção, pausas de contato visual e aumento gradual de distrações.",
  },
  {
    case: "Filhote pulando nas visitas",
    suggestion: "Manejo do ambiente, treino de senta para cumprimentar, recompensa por quatro patas no chão e prática com visitas controladas.",
  },
  {
    case: "Cão ansioso ao ficar sozinho",
    suggestion: "Passos curtos de dessensibilização, enriquecimento ambiental e registro de evolução sem forçar tempo excessivo.",
  },
];

const statusLabels = [
  {
    label: "Clientes cadastrados",
    getValue: (clients: number, dogs: number) => `${clients} cliente(es), ${dogs} cão(es)`,
  },
  {
    label: "Sessões registradas",
    getValue: (_c: number, _d: number, sessions: number) => `${sessions} sessão(ões)`,
  },
  {
    label: "Agendamentos ativos",
    getValue: (_c: number, _d: number, _s: number, events: number) => `${events} agendamento(s)`,
  },
  {
    label: "Tarefas para clientes",
    getValue: (_c: number, _d: number, _s: number, _e: number, tasks: number) => `${tasks} tarefa(s)`,
  },
];

export default function TutorialPage() {
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);
  const events = useAppStore((state) => state.calendarEvents);
  const portalTasks = useAppStore((state) => state.portalTasks);
  const startTour = useTour((s) => s.start);

  const totalDogs = clients.reduce((total, client) => total + client.dogs.length, 0);

  return (
    <PageShell
      kicker="Tutorial do adestrador"
      title="Como o Adestro organiza sua rotina"
      description="Guia completo do fluxo de atendimento, do portal do cliente, das integrações e da IA."
      requireAuth="trainer"
    >
      {/* CTA do tour guiado */}
      <section className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-5 shadow-sm">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700">✨ Tour guiado</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Quer um tour de 2 minutos pelo sistema?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Em 10 passos eu te mostro o sininho, o resumo do dia, a agenda, o registro de treino com IA, o
              financeiro e o admin. O app navega sozinho — você só clica em Próximo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startTour()}
            className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-purple-700"
          >
            ▶ Iniciar tour guiado
          </button>
        </div>
      </section>

      {/* Status atual da conta */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Sua conta</p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              O sistema acompanha do cadastro à confirmação de presença do cliente
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              O Adestro funciona como uma rotina contínua: cadastrar cliente → agendar → registrar treino → aprovar
              resumo IA → enviar tarefas pro cliente → emitir recibo → gerar relatório mensal. Em cada etapa há
              automações para reduzir cliques e mensagens prontas pra WhatsApp.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {statusLabels.map((item) => (
              <div key={item.label} className="rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {item.getValue(clients.length, totalDogs, sessions.length, events.length, portalTasks.length)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fluxo de atendimento detalhado */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Fluxo de atendimento</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          7 passos do cadastro ao relatório mensal
        </h2>

        <ol className="mt-5 grid gap-3">
          {trainerFlow.map((step) => (
            <li key={step.title} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
              <p className="mt-1 text-sm font-medium text-[var(--muted)]">{step.why}</p>
              <ul className="mt-3 grid gap-2">
                {step.how.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--muted)]">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1f8e80]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {step.shortcut ? (
                <p className="mt-3 inline-block rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {step.shortcut}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Galeria de features */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Funcionalidades em destaque</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          Recursos que reduzem cliques no dia a dia
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article key={feature.title} className="rounded-md border border-slate-100 bg-slate-50/40 p-3">
              <p className="text-sm font-bold text-slate-900">
                <span aria-hidden className="mr-1.5">{feature.icon}</span>
                {feature.title}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Assistente de IA</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            A IA sugere abordagem técnica — você decide
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            O motor atual é determinístico (sem custo de API). Cobre os 6 tópicos mais frequentes do cotidiano:
            planejamento, ansiedade, recall, latido, socialização e análise da sessão. Você pode plugar IA real
            (Claude, Gemini, OpenAI) sem refatoração quando quiser.
          </p>
          <div className="mt-4 grid gap-3">
            {assistantExamples.map((example) => (
              <article key={example.case} className="rounded-md border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{example.case}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{example.suggestion}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Portal do cliente</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Como orientar o cliente
            </h2>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--muted)]">
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                Link único por cliente (token + PIN opcional). Sem login.
              </p>
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                Tarefas com upload de foto, gamificação (9 níveis, streak, 8 badges), confirmação de presença e NPS.
              </p>
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                Use linguagem clara. Uma tarefa bem feita vale mais que cinco mal explicadas.
              </p>
              <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                Notas confidenciais NUNCA aparecem pro cliente — só na sua ficha de adestrador.
              </p>
            </div>
            <Link
              href="/tutorial/cliente"
              className="mt-3 inline-block text-xs font-semibold text-[var(--foreground)] hover:underline"
            >
              Ver guia separado pro cliente →
            </Link>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Atalhos úteis</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Comandos de teclado
            </h2>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">Ctrl</kbd>
                {" + "}
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">K</kbd>
                {" — abre a busca global (cliente, cão, sessão, tela)"}
              </p>
              <p>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs">Esc</kbd>
                {" — fecha modais e overlays"}
              </p>
              <p>Long-press no ícone do PWA: atalhos rápidos (nova sessão, agenda, novo cliente, financeiro)</p>
              <p>Notificações push: ative em /configuracoes → toque "Ativar agora"</p>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
