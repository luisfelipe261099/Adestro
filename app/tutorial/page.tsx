"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { PageShell } from "@/components/page-shell";
import {
  ADMIN_STEPS,
  ADMIN_TOUR_DONE_KEY,
  TRAINER_STEPS,
  TRAINER_TOUR_DONE_KEY,
  useTour,
} from "@/components/product-tour";
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
      "Sem digitar nada: em /clientes toque em 'Convidar cliente', gere o link e mande no WhatsApp. O tutor preenche os próprios dados e o cão.",
      "O convite vale 7 dias por padrão (1 a 30, você escolhe) e serve para um cadastro. Enquanto ninguém usar, dá pra revogar.",
      "O cadastro chega como rascunho e aparece em /pendencias. Confira e toque em 'Revisar e Aprovar' — só então ele entra na sua carteira e conta no limite do plano.",
      "Prefere digitar? Em /clientes toque em '+' e preencha cliente, endereços (com link pro Google Maps) e ficha completa do cão.",
      "Vacinas têm alerta de vencimento automático. Temperamento, rotinas e objetivos viram contexto pra IA.",
      "Para quem já é cliente, o link de onboarding do portal continua valendo pra ele completar a ficha (modo rascunho até você aprovar).",
      "Tags (VIP, Inadimplente, Filhote, Sênior, etc) ajudam a filtrar — pode editar inline no card.",
      "Precisa remover alguém? O card do cliente tem opção de excluir com confirmação — agendamentos e registros órfãos somem junto.",
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
    title: "5) Acompanhar a evolução de cada cão",
    why: "Feed de treinos, quadro de fases e análise comportamental mostram onde cada cão está no processo.",
    how: [
      "Clique no nome do cliente em /clientes pra abrir a página completa dele: cães, próximas aulas, treinos, financeiro e portal num lugar só.",
      "Em /treinos veja a linha do tempo dos treinos com fotos, notas e filtros (hoje, semana, pendentes).",
      "Em /clientes, aba 'Quadro', arraste cada cão entre as fases do adestramento (kanban). No celular, use o seletor no card.",
      "Em /evolucao acompanhe as notas comportamentais por categoria de cada cão ao longo do tempo.",
      "A ficha do cão (/caes/[id]) reúne tudo: vacinas, histórico de sessões, comandos e evolução.",
    ],
  },
  {
    title: "6) Compartilhar o portal + falar com o cliente",
    why: "O cliente acompanha tarefas, evolução e gamificação por um link único — sem login, com PIN opcional.",
    how: [
      "Em /portal gere/copie o link único do cliente e envie pelo WhatsApp (template já pronto).",
      "O cliente vê: nível do cão, streak diário 🔥, tarefas de hoje (com upload de foto), histórico, badges.",
      "Em /chat você conversa em tempo real com os tutores — as mensagens novas aparecem no sininho.",
      "Quando o cliente responde NPS após cada aula, você recebe a média no comparativo mensal.",
      "Banner azul de 'Confirmar presença' aparece no portal quando há evento pendente.",
    ],
  },
  {
    title: "7) Operar financeiro + emitir recibo",
    why: "Pacote → contrato → cobranças automáticas → recibo com Pix Copia e Cola embutido.",
    how: [
      "Em /financeiro cadastre pacotes (sessões, valor, fracionamento, validade).",
      "Vender pacote gera contrato e cobranças automaticamente — os contratos ativos ficam listados em /planos-treino.",
      "No recibo, se sua chave Pix estiver configurada, gera o BR Code Copia e Cola — o cliente cola no banco e pronto.",
      "Botão 💬 Lembrar em cada cobrança abre WhatsApp com texto pronto (cobrança pendente ou em atraso).",
      "Cron diário às 07h gera os lembretes do dia automaticamente.",
    ],
  },
  {
    title: "8) Aprovar e enviar relatório mensal",
    why: "Cliente percebe valor quando vê o progresso documentado mês a mês.",
    how: [
      "Em /relatorios o rascunho aparece automaticamente no início do mês.",
      "Edite seções, selecione fotos, ajuste a análise gerada pela IA.",
      "Toque 'Aprovar e Gerar PDF' → 'Imprimir / PDF' do browser.",
      "Use 'Comparativo mês vs mês' pra mostrar evolução em sessões, comandos médios, % atividades e NPS.",
    ],
  },
];

// Mapa de todas as telas do adestrador — referência rápida.
const screenMap = [
  { href: "/dashboard", label: "Hoje (Dashboard)", text: "Card 'Próxima ação' pra começar, resumo do dia, lembretes prontos pra WhatsApp e pendências." },
  { href: "/agenda", label: "Agenda", text: "Dia/Semana/Mês, recorrência, confirmação de presença e exportação de calendário." },
  { href: "/clientes", label: "Clientes", text: "Fichas de clientes e cães, tags, onboarding e quadro kanban. Clique no cliente pra abrir a página completa dele. O botão 'Convidar cliente' gera o link pro tutor se cadastrar sozinho." },
  { href: "/treinos", label: "Treinos", text: "Feed dos treinos realizados com fotos, notas e filtros." },
  { href: "/treinos/registro", label: "Registrar treino", text: "Formulário completo da sessão (A-I) com voz e IA." },
  { href: "/financeiro", label: "Financeiro", text: "Pacotes, contratos, cobranças, recibos com Pix Copia e Cola." },
  { href: "/relatorios", label: "Relatórios", text: "Relatório mensal com análise IA, fotos e comparativo mês a mês." },
  { href: "/portal", label: "Portal do cliente", text: "Links únicos de acesso do tutor, tarefas e gamificação." },
  { href: "/chat", label: "Chat", text: "Conversa em tempo real com os tutores." },
  { href: "/ia", label: "Assistente IA", text: "Conversas com a IA para casos complexos, fora do contexto de uma sessão." },
  { href: "/evolucao", label: "Evolução", text: "Notas comportamentais por categoria de cada cão ao longo do tempo." },
  { href: "/planos-treino", label: "Planos de treino", text: "Pacotes e contratos de sessões ativos por cliente." },
  { href: "/planos", label: "Meu plano", text: "Sua assinatura do Adestro: plano, pagamento e limites." },
  { href: "/configuracoes", label: "Configurações", text: "Alertas, notificações push, tema escuro, importação CSV e export LGPD." },
];

const featureHighlights = [
  {
    icon: "🧭",
    title: "Próxima ação no Dashboard",
    text: "Conta nova é conduzida passo a passo: tutor → aula → treino → portal. Uma ação por vez; o card some quando a jornada completa.",
  },
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
    icon: "🗂️",
    title: "Quadro kanban de fases",
    text: "Em /clientes → aba Quadro: arraste cada cão entre as fases do adestramento. No celular, use o seletor do card.",
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
    icon: "💬",
    title: "Chat em tempo real",
    text: "Em /chat você conversa com os tutores. As mensagens do cliente chegam pelo portal e aparecem no sininho.",
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
    title: "Importar clientes (CSV e ClickUp)",
    text: "Em /configuracoes envie CSV com cabeçalho name,phone,email,dogName,dogBreed,notes — ou importe direto sua base do ClickUp.",
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
    title: "Tema escuro por padrão",
    text: "O sistema abre no escuro. Prefere claro? Botão ☀️ no topo de qualquer tela — a escolha fica salva e vale pra todos os perfis.",
  },
  {
    icon: "📜",
    title: "Audit log",
    text: "Histórico de quem fez o quê em /admin/audit. Essencial pra multi-adestrador.",
  },
];

// Screenshots reais do app (mobile) — ilustram as telas principais.
const screenshots = [
  {
    src: "/images/tutorial/dashboard.jpeg",
    alt: "Tela Hoje (Dashboard) do Adestro com resumo da operação, clientes ativos e próximos atendimentos",
    label: "Hoje (Dashboard)",
    caption: "Resumo da operação assim que você abre o app.",
  },
  {
    src: "/images/tutorial/agenda.jpeg",
    alt: "Tela de Agenda do Adestro com visão por dia, semana e mês e criação de agendamento",
    label: "Agenda",
    caption: "Dia, semana ou mês — e novo agendamento em 1 toque.",
  },
  {
    src: "/images/tutorial/financeiro.jpeg",
    alt: "Painel Financeiro do Adestro com recebido, a receber, em atraso e contratos ativos",
    label: "Financeiro",
    caption: "Recebido, a receber, atrasos e contratos num painel só.",
  },
  {
    src: "/images/tutorial/assistente-ia.jpeg",
    alt: "Assistente IA do Adestro com atalhos de plano de aula, ansiedade, recall e latido",
    label: "Assistente IA",
    caption: "Sugestões técnicas com atalhos pros casos mais comuns.",
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

const trainerFaq = [
  {
    q: "A transcrição por voz não funciona",
    a: "A Web Speech API funciona no Chrome, Edge e Safari (iOS). No Firefox e em webviews ela não está disponível — digite a nota ou troque de navegador. Verifique também a permissão de microfone do site.",
  },
  {
    q: "O cliente perdeu o link do portal",
    a: "Em /portal gere um novo link (o antigo pode ser revogado) e reenvie pelo WhatsApp com o template pronto. Se usar PIN, informe o código por outro canal.",
  },
  {
    q: "Como ativar notificações no celular",
    a: "Instale o app pela opção 'Adicionar à tela inicial' (PWA) e em /configuracoes toque 'Ativar agora' em notificações push.",
  },
  {
    q: "O resumo IA saiu errado — o cliente vai ver?",
    a: "Não. Nada gerado pela IA chega ao cliente sem sua aprovação explícita na Seção F. Edite o texto antes de aprovar.",
  },
  {
    q: "Excluí um cliente sem querer",
    a: "A exclusão pede confirmação e remove também agendamentos e registros ligados. Não há lixeira — em caso de dúvida, prefira desativar tags/contratos a excluir.",
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

// ── Guia do ADMIN ────────────────────────────────────────────────────────────

const adminAreas = [
  {
    href: "/admin",
    title: "Visão geral",
    text: "Métricas da operação: adestradores ativos, sessões registradas, receita e pendências. É a home do seu perfil.",
  },
  {
    href: "/admin/adestradores",
    title: "Adestradores",
    text: "Crie contas, redefina senhas, ative/desative acesso. Cada adestrador só enxerga os próprios clientes e dados.",
  },
  {
    href: "/admin/planos",
    title: "Planos",
    text: "Defina o plano de cada conta (limites e valores). A mudança vale na hora — o adestrador vê em /planos.",
  },
  {
    href: "/admin/faturamento",
    title: "Faturamento",
    text: "Pagamentos consolidados: pagos, pendentes e histórico por adestrador.",
  },
  {
    href: "/admin/relatorios",
    title: "Relatórios",
    text: "Uso e desempenho por conta: sessões, clientes ativos, engajamento do portal.",
  },
  {
    href: "/admin/templates",
    title: "Templates",
    text: "Padrões usados por todos os adestradores: atividades, comandos, tarefas do cliente e textos das mensagens de WhatsApp. Edite com cuidado — afeta todo mundo.",
  },
  {
    href: "/admin/audit",
    title: "Auditoria",
    text: "Registro de quem fez o quê e quando. Use para investigar alterações e acompanhar a operação multi-adestrador.",
  },
];

const adminTips = [
  "Novo adestrador na equipe? Crie a conta em Adestradores, defina o plano em Planos e envie a senha inicial — ele redefine no primeiro login.",
  "Antes de editar Templates, avise a equipe: os textos valem para todos os adestradores imediatamente.",
  "Acompanhe Faturamento semanalmente — cobranças pendentes antigas costumam indicar cliente que precisa de contato.",
  "A Auditoria é sua amiga: qualquer alteração suspeita (exclusão, mudança de plano) fica registrada com autor e data.",
];

function AdminTutorial() {
  const startAdminTour = useTour((s) => s.start);

  return (
    <PageShell
      kicker="Tutorial do administrador"
      title="Como operar o painel administrativo"
      description="Guia das áreas do admin: contas, planos, faturamento, relatórios, templates e auditoria."
      requireAuth="admin"
    >
      <section className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-5 shadow-sm">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700">✨ Tour guiado</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Quer um tour de 2 minutos pelo painel?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Em {ADMIN_STEPS.length} passos eu te mostro a visão geral, adestradores, planos, faturamento,
              relatórios, templates e auditoria. O painel navega sozinho — você só clica em Próximo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startAdminTour(ADMIN_STEPS, ADMIN_TOUR_DONE_KEY)}
            className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-purple-700"
          >
            ▶ Iniciar tour guiado
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Áreas do painel</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          7 áreas, cada uma com um papel claro
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {adminAreas.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)] hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {area.title}
                <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">{area.href}</span>
              </p>
              <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{area.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Boas práticas</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Rotina recomendada do admin</h2>
        <ul className="mt-3 grid gap-2">
          {adminTips.map((tip) => (
            <li key={tip} className="flex gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--muted)]">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1f8e80]" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Outros perfis</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Guias dos outros acessos</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          O adestrador tem um guia completo do fluxo de atendimento nesta mesma página (visível quando ele faz
          login), e o cliente tem um guia simples do portal:
        </p>
        <Link
          href="/tutorial/cliente"
          className="mt-3 inline-block text-sm font-semibold text-[var(--foreground)] hover:underline"
        >
          Ver guia do cliente (portal) →
        </Link>
      </section>
    </PageShell>
  );
}

// ── Guia do ADESTRADOR ───────────────────────────────────────────────────────

function TrainerTutorial() {
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
              Em {TRAINER_STEPS.length} passos eu te mostro o sistema inteiro: a jornada guiada, agenda,
              clientes, treinos com IA, portal, chat, evolução, financeiro e relatórios. O app navega
              sozinho — você só clica em Próximo (ou usa as setas do teclado).
            </p>
          </div>
          <button
            type="button"
            onClick={() => startTour(TRAINER_STEPS, TRAINER_TOUR_DONE_KEY)}
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
              <div key={item.label} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
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
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Fluxo de atendimento</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          8 passos do cadastro ao relatório mensal
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
                <p className="mt-3 inline-block rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[12px] font-semibold text-[var(--muted)]">
                  {step.shortcut}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Screenshots das telas principais */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">O sistema em telas</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          Como o app aparece no celular
        </h2>
        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {screenshots.map((shot) => (
            <figure key={shot.src} className="min-w-0">
              <div className="overflow-hidden rounded-lg border border-[var(--border)] shadow-sm">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={440}
                  height={800}
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">{shot.label}</p>
                <p className="text-[12px] leading-5 text-[var(--muted)]">{shot.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Mapa de telas */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Mapa de telas</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          Onde fica cada coisa
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {screenMap.map((screen) => (
            <Link
              key={screen.href}
              href={screen.href}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {screen.label}
                <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">{screen.href}</span>
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">{screen.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Galeria de features */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Funcionalidades em destaque</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          Recursos que reduzem cliques no dia a dia
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article key={feature.title} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-sm font-bold text-[var(--foreground)]">
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
            O assistente cobre os 6 tópicos mais frequentes do cotidiano: planejamento, ansiedade, recall, latido,
            socialização e análise da sessão. Dentro do registro de treino ele já conhece o cão, a raça e os
            comandos trabalhados; para casos fora de sessão, use a tela /ia.
          </p>
          <div className="mt-4 grid gap-3">
            {assistantExamples.map((example) => (
              <article key={example.case} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{example.case}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{example.suggestion}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
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

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Atalhos úteis</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Comandos de teclado
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              <p>
                <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">Ctrl</kbd>
                {" + "}
                <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">K</kbd>
                {" — abre a busca global (cliente, cão, sessão, tela)"}
              </p>
              <p>
                <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">Esc</kbd>
                {" — fecha modais, overlays e o tour guiado"}
              </p>
              <p>Long-press no ícone do PWA: atalhos rápidos (nova sessão, agenda, novo cliente, financeiro)</p>
              <p>Notificações push: ative em /configuracoes → toque “Ativar agora”</p>
            </div>
          </section>
        </div>
      </div>

      {/* FAQ */}
      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Dúvidas frequentes</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Problemas comuns e como resolver</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {trainerFaq.map((item) => (
            <article key={item.q} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{item.q}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

// ── Página: decide o guia pelo perfil logado ─────────────────────────────────

export default function TutorialPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();

  // Cliente logado não tem painel interno — o guia dele é o do portal.
  useEffect(() => {
    if (status === "authenticated" && role === "client") {
      router.replace("/tutorial/cliente");
    }
  }, [status, role, router]);

  if (role === "admin") {
    return <AdminTutorial />;
  }

  if (role === "client") {
    return (
      <PageShell kicker="Tutorial" title="Redirecionando..." description="Abrindo o guia do portal do cliente.">
        <p className="text-sm text-[var(--muted)]">
          <Link href="/tutorial/cliente" className="font-semibold hover:underline">
            Ir para o guia do cliente →
          </Link>
        </p>
      </PageShell>
    );
  }

  // trainer (e sessão ainda carregando — o AuthGuard interno cuida do resto)
  return <TrainerTutorial />;
}
