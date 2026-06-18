import Image from "next/image";
import Link from "next/link";

import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconCheckSquare,
  IconChevronDown,
  IconDog,
  IconDollar,
  IconLink,
  IconReport,
  IconSparkle,
  IconStar,
  IconUsers,
  IconWhatsApp,
} from "@/components/icons";

/* ─────────────────────────────────────────────────────────────────────────
   WhatsApp comercial de vendas.
   TROCAR pelo número real — formato internacional, só dígitos: 55 + DDD + número.
   Ex.: (11) 98888-7777  →  "5511988887777"
   ───────────────────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER = "5511999999999";
const WHATSAPP_MESSAGE =
  "Olá! Tenho interesse na plataforma Adestro e gostaria de saber mais.";
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

/* Fotos (Unsplash) — todas verificadas (HTTP 200). Domínio já liberado em next.config.ts.
   Para trocar por fotos próprias, basta substituir as URLs abaixo. */
const photo = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const IMG = {
  hero: photo("1601758228041-f3b2795255f1", 1600), // cão de perto
  showcase: photo("1576201836106-db1758fd1c97", 1200), // treino com recompensa
  audienceSolo: photo("1543466835-00a7907e9de1", 800), // cão golden
  audienceSchool: photo("1548199973-03cce0bbc87b", 800), // passeio com vários cães
  audienceTeam: photo("1591768575198-88dac53fbd0a", 800), // border collie atento
};

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: IconUsers,
    title: "Clientes & cães",
    description:
      "Cadastro completo de tutores e cães: raça, idade, histórico de treinos e observações de cada caso.",
  },
  {
    icon: IconCalendar,
    title: "Agenda inteligente",
    description:
      "Organize sessões com visão diária, semanal e mensal. Nunca mais perca um atendimento no caderno.",
  },
  {
    icon: IconDog,
    title: "Registro de treinos",
    description:
      "Cada sessão com título, avaliação, anotações, fotos e vídeos. A evolução do cão documentada de verdade.",
  },
  {
    icon: IconLink,
    title: "Portal do tutor",
    description:
      "Gere um link exclusivo para o tutor acompanhar tarefas, vídeos e o progresso — sem precisar instalar nada.",
  },
  {
    icon: IconSparkle,
    title: "Assistente IA",
    description:
      "Sugestões de próximos treinos com base no histórico e resumos automáticos das sessões.",
  },
  {
    icon: IconStar,
    title: "Gamificação",
    description:
      "Pontos e conquistas que engajam o tutor a fazer as tarefas de casa e manter o treino vivo.",
  },
  {
    icon: IconReport,
    title: "Relatórios & análises",
    description:
      "Acompanhe desempenho dos treinos e o engajamento de cada cliente com dados claros.",
  },
  {
    icon: IconDollar,
    title: "Financeiro",
    description:
      "Controle pacotes de aulas, cobranças e assinaturas. Saiba quem está em dia e quem precisa renovar.",
  },
  {
    icon: IconCheckSquare,
    title: "Funciona como app (PWA)",
    description:
      "Instale na tela inicial do celular e use offline. Acessível em qualquer dispositivo, sem loja de apps.",
  },
];

const pains: string[] = [
  "Agenda espalhada entre caderno, WhatsApp e memória — e atendimento esquecido.",
  "Tutor some entre uma aula e outra e não faz a tarefa de casa.",
  "Cobrança bagunçada: você não sabe quem pagou nem quem precisa renovar.",
  "Sem registro da evolução, fica difícil provar o resultado do seu trabalho.",
];

type Step = {
  number: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: "1",
    title: "Cadastre o cliente e o cão",
    description:
      "Em minutos você monta a ficha do tutor e do cão, com histórico e observações do caso.",
  },
  {
    number: "2",
    title: "Registre os treinos e abra o portal",
    description:
      "Anote cada sessão com fotos e vídeos e gere o link do portal para o tutor acompanhar.",
  },
  {
    number: "3",
    title: "Acompanhe, cobre e fidelize",
    description:
      "Veja a evolução, controle pagamentos e mantenha o tutor engajado com tarefas e conquistas.",
  },
];

type Audience = {
  title: string;
  description: string;
  image: string;
};

const audiences: Audience[] = [
  {
    title: "Adestradores autônomos",
    description:
      "Profissionalize seu atendimento e tenha mais tempo para o que importa: treinar cães.",
    image: IMG.audienceSolo,
  },
  {
    title: "Escolas de adestramento",
    description:
      "Centralize a carteira de clientes e padronize o acompanhamento de cada turma.",
    image: IMG.audienceSchool,
  },
  {
    title: "Franquias & equipes",
    description:
      "Multi-adestrador, relatórios por carteira e portal white-label para a sua marca.",
    image: IMG.audienceTeam,
  },
];

type Plan = {
  name: string;
  price: string;
  cycle: string;
  detail: string;
  badge: string | null;
  features: string[];
  highlight: boolean;
};

// Espelha os planos reais do fluxo de cadastro (app/cadastro).
const plans: Plan[] = [
  {
    name: "Trial Gratuito",
    price: "R$ 0",
    cycle: "/ 90 dias",
    detail: "Teste a plataforma completa, sem cartão.",
    badge: "Grátis",
    features: [
      "Todos os módulos",
      "Até 10 clientes",
      "Agenda + treinos",
      "Portal do cliente",
      "IA de protocolo",
    ],
    highlight: false,
  },
  {
    name: "Starter",
    price: "R$ 420",
    cycle: "/mês",
    detail: "Para quem está começando a organizar a carteira.",
    badge: null,
    features: [
      "Até 15 clientes",
      "Agenda + treinos",
      "Portal do cliente básico",
      "Suporte por e-mail",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 690",
    cycle: "/mês",
    detail: "Para operação recorrente com carteira ativa.",
    badge: "Mais popular",
    features: [
      "Clientes ilimitados",
      "Financeiro + cobrança",
      "Assistente IA",
      "Portal completo",
      "Prioridade no suporte",
    ],
    highlight: true,
  },
  {
    name: "Business",
    price: "R$ 990",
    cycle: "/mês",
    detail: "Para equipes, escolas e franquias.",
    badge: null,
    features: [
      "Multi-adestrador",
      "Relatórios analíticos",
      "Portal white-label",
      "Gerente de conta",
    ],
    highlight: false,
  },
];

type Faq = {
  question: string;
  answer: string;
};

const faqs: Faq[] = [
  {
    question: "Preciso instalar algum programa?",
    answer:
      "Não. O Adestro roda no navegador e pode ser instalado como app (PWA) na tela inicial do celular ou computador, sem passar por loja de aplicativos.",
  },
  {
    question: "Funciona no celular?",
    answer:
      "Sim. A plataforma é totalmente responsiva e funciona bem em celular, tablet e computador. Você atende em campo e registra tudo na hora.",
  },
  {
    question: "Como o tutor acompanha o treino?",
    answer:
      "Você gera um link exclusivo do portal e envia ao tutor. Ele acessa tarefas, vídeos e a evolução do cão sem precisar criar conta nem instalar nada.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. O acesso é protegido por autenticação e seguimos boas práticas de segurança. Cada adestrador enxerga apenas os próprios clientes.",
  },
  {
    question: "Posso testar antes de pagar?",
    answer:
      "Pode. O plano Trial é gratuito por 90 dias, com acesso aos módulos principais e sem necessidade de cartão de crédito.",
  },
  {
    question: "Posso mudar de plano ou cancelar depois?",
    answer:
      "Sim. Você pode trocar de plano conforme a carteira cresce e cancelar quando quiser, direto pelo painel.",
  },
];

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export function Landing() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 50% -10%, var(--accent-soft), transparent 70%)",
          }}
        />
        <div className={`${container} py-14 sm:py-20`}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Plataforma para adestradores profissionais
            </span>

            <h1 className="mt-6 text-3xl font-semibold leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl">
              Toda a sua operação de adestramento em um só lugar
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Clientes, agenda, treinos, portal do tutor, cobrança e IA — o
              Adestro organiza o dia a dia do adestrador e dá ao tutor um
              acompanhamento profissional da evolução do cão.
            </p>

            <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
              <Link
                href="/cadastro"
                className="btn-primary h-12 w-full px-6 text-[15px] sm:h-11 sm:w-auto"
              >
                Criar conta grátis
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary h-12 w-full px-6 text-[15px] sm:h-11 sm:w-auto"
              >
                <IconWhatsApp className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>

            <p className="mt-4 text-[13px] text-[var(--muted)]">
              90 dias grátis · sem cartão de crédito · cancele quando quiser
            </p>
          </div>

          {/* Imagem principal */}
          <div className="relative mx-auto mt-12 aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-lg sm:aspect-[16/8]">
            <Image
              src={IMG.hero}
              alt="Cão atento durante uma sessão de adestramento"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Dores ────────────────────────────────────────────────────────── */}
      <section className={`${container} py-14 sm:py-20`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">O problema</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Gerir adestramento na unha custa caro
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Sem uma ferramenta única, o trabalho fica solto e o resultado se
            perde. Soa familiar?
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
          {pains.map((pain) => (
            <div
              key={pain}
              className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
                <span className="text-sm font-bold leading-none">!</span>
              </span>
              <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
                {pain}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="scroll-mt-16 border-y border-[var(--border)] bg-[var(--surface)]"
      >
        <div className={`${container} py-14 sm:py-20`}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow">Como funciona</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Comece a usar em 3 passos
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              Do cadastro ao acompanhamento, sem complicação.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-base font-semibold text-white">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ──────────────────────────────────────────────── */}
      <section
        id="funcionalidades"
        className={`${container} scroll-mt-16 py-14 sm:py-24`}
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Funcionalidades</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Tudo que o adestrador precisa
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            Uma plataforma completa para você trabalhar melhor e encantar o
            tutor.
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-[var(--surface)] p-6 transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Showcase (portal do tutor) ───────────────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div
          className={`${container} grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2`}
        >
          <div className="relative order-last aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-md lg:order-first">
            <Image
              src={IMG.showcase}
              alt="Tutor acompanhando o treino do cão"
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-eyebrow">Portal do tutor</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Um acompanhamento que encanta o cliente
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              O tutor recebe um link e vê tudo: tarefas de casa, vídeos, fotos e
              a evolução do cão. Mais transparência, mais confiança e mais
              renovações para você.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Tarefas e vídeos de treino para o tutor praticar em casa",
                "Linha do tempo com a evolução do cão em fotos",
                "Gamificação que mantém o tutor engajado",
                "Sem instalar nada — abre direto no navegador",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  <span className="text-[var(--muted-strong)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Para quem é ──────────────────────────────────────────────────── */}
      <section className={`${container} py-14 sm:py-20`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Para quem é</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Feito para o seu tamanho
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="relative aspect-[16/10] w-full bg-[var(--surface-2)]">
                <Image
                  src={audience.image}
                  alt={audience.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold tracking-tight">
                  {audience.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {audience.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Planos ───────────────────────────────────────────────────────── */}
      <section
        id="planos"
        className={`${container} scroll-mt-16 py-14 sm:py-24`}
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Planos</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Comece grátis, evolua quando quiser
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            90 dias gratuitos para testar. Depois, escolha o plano que combina
            com a sua carteira.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlight
                  ? "border-[var(--accent)] bg-[var(--surface)] shadow-lg"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {plan.badge ? (
                <span
                  className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    plan.highlight
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--success-bg)] text-[var(--success)]"
                  }`}
                >
                  {plan.badge}
                </span>
              ) : null}

              <h3 className="text-lg font-semibold tracking-tight">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--muted)]">{plan.cycle}</span>
              </div>
              <p className="mt-2 min-h-[2.5rem] text-[13px] leading-relaxed text-[var(--muted)]">
                {plan.detail}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                    <span className="text-[var(--muted-strong)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/cadastro"
                className={`mt-6 ${
                  plan.highlight ? "btn-primary" : "btn-secondary"
                } h-11 w-full`}
              >
                {plan.price === "R$ 0" ? "Começar de graça" : "Escolher plano"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="scroll-mt-16 border-y border-[var(--border)] bg-[var(--surface)]"
      >
        <div className={`${container} py-14 sm:py-20`}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow">Dúvidas frequentes</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Perguntas que todo adestrador faz
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden hover:bg-[var(--surface-2)]">
                  <span className="text-[15px] font-medium text-[var(--foreground)]">
                    {faq.question}
                  </span>
                  <IconChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className={`${container} py-16 sm:py-28`}>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Comece grátis hoje e profissionalize seu adestramento
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
            90 dias gratuitos. Sem cartão, sem compromisso. Veja na prática como
            o Adestro organiza sua operação.
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href="/cadastro"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-[15px] font-medium text-[var(--accent)] transition-opacity hover:opacity-90 sm:h-11 sm:w-auto"
            >
              Criar conta grátis
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10 sm:h-11 sm:w-auto"
            >
              <IconWhatsApp className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div
          className={`${container} flex flex-col items-center justify-between gap-6 py-10 sm:flex-row`}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Adestro
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
            <a href="#como-funciona" className="hover:text-[var(--foreground)]">
              Como funciona
            </a>
            <a href="#funcionalidades" className="hover:text-[var(--foreground)]">
              Funcionalidades
            </a>
            <a href="#planos" className="hover:text-[var(--foreground)]">
              Planos
            </a>
            <a href="#faq" className="hover:text-[var(--foreground)]">
              Dúvidas
            </a>
            <Link href="/login" className="hover:text-[var(--foreground)]">
              Entrar
            </Link>
          </nav>

          <p className="text-[13px] text-[var(--muted)]">© 2026 Adestro</p>
        </div>
      </footer>
    </main>
  );
}
