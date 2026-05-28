"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useAppStore } from "@/lib/app-store";

const plans = [
  {
    id: "Trial",
    label: "Trial Gratuito",
    price: "R$ 0",
    cycle: "90 dias",
    detail: "Teste completo por 90 dias",
    lessonInfo: "Sem cobrança de aulas no período de teste",
    badge: "Gratis",
    features: ["Todos os modulos", "Ate 10 clientes", "Agenda + treinos", "Portal do cliente", "IA de protocolo"],
    highlight: false,
    cta: "Comecar de graca",
  },
  {
    id: "Starter",
    label: "Starter",
    price: "R$ 420",
    cycle: "/mes",
    detail: "Referência: pacote inicial de atendimento",
    lessonInfo: "Sugestão comercial: até 4 aulas por cliente ativo",
    badge: null,
    features: ["Ate 15 clientes", "Agenda + treinos", "Portal do cliente basico", "Suporte por e-mail"],
    highlight: false,
    cta: "Escolher Starter",
  },
  {
    id: "Pro",
    label: "Pro",
    price: "R$ 690",
    cycle: "/mes",
    detail: "Referência: operação recorrente",
    lessonInfo: "Controle de pacotes de 4, 8 ou 12 aulas no painel",
    badge: "Mais popular",
    features: ["Clientes ilimitados", "Financeiro + cobranca", "Assistente IA", "Portal completo", "Prioridade no suporte"],
    highlight: true,
    cta: "Escolher Pro",
  },
  {
    id: "Business",
    label: "Business",
    price: "R$ 990",
    cycle: "/mes",
    detail: "Referência: equipe ou franquia",
    lessonInfo: "Pacotes maiores, equipe e relatórios por carteira",
    badge: null,
    features: ["Multi-adestrador", "Relatorios analiticos", "White label do portal", "Gerente de conta"],
    highlight: false,
    cta: "Escolher Business",
  },
];

type Step = "plan" | "account";

export function CadastroClient() {
  const router = useRouter();
  const { status } = useSession();

  const [step, setStep]           = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState("Trial");

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  function handleSelectPlan(planId: string) {
    setSelectedPlan(planId);
    setStep("account");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("As senhas nao coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password, plan: selectedPlan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar a conta.");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Conta criada! Acesse pela pagina de login.");
        return;
      }

      useAppStore.getState().clearAppData();
      router.replace("/dashboard");
    } catch {
      setError("Erro de conexao. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }

  const planLabel = plans.find((p) => p.id === selectedPlan)?.label ?? selectedPlan;

  // -- Etapa 1: selecao de plano ----------------------------------------------
  if (step === "plan") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Adestro</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Escolha seu plano</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Comece de graca por 90 dias ou escolha um plano pago. Os pacotes de aulas podem ser ajustados depois em Meu Plano.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-lg border p-5 transition ${
                plan.highlight
                  ? "border-[#145a82] bg-[linear-gradient(145deg,_rgba(20,90,130,0.07),_rgba(31,154,138,0.05))]"
                  : "border-[var(--border)] bg-white/90"
              }`}
            >
              {plan.badge ? (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
                  plan.id === "Trial"
                    ? "bg-[rgba(31,154,138,0.9)] text-white"
                    : "bg-[var(--accent)] text-white"
                }`}>
                  {plan.badge}
                </span>
              ) : null}

              <div className="flex-1">
                <p className="text-lg font-semibold text-[var(--foreground)]">{plan.label}</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-2xl font-semibold text-[var(--foreground)]">{plan.price}</span>
                  <span className="mb-0.5 text-xs text-[var(--muted)]">{plan.cycle}</span>
                </div>
                <p className="mt-2 rounded-md border border-[var(--border)] bg-white/80 px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                  <span className="font-semibold text-[var(--foreground)]">{plan.detail}</span><br />
                  {plan.lessonInfo}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                      <span className="mt-0.5 flex-shrink-0 text-emerald-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPlan(plan.id)}
                className={`mt-5 w-full rounded-md px-4 py-3 text-sm font-semibold transition ${
                  plan.highlight || plan.id === "Trial"
                    ? "pc-primary-action"
                    : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#145a82] hover:text-[var(--foreground)]"
                }`}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Ja tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--foreground)] hover:underline">Entrar</Link>
        </p>
      </main>
    );
  }

  // -- Etapa 2: dados da conta ------------------------------------------------
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-76px)] w-full max-w-7xl items-start justify-center px-4 pb-16 pt-4 sm:min-h-[calc(100dvh-96px)] sm:items-center sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
      <section className="relative w-full max-w-md overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(180deg,_rgba(248,254,255,0.97),_rgba(238,249,255,0.99))] p-5 shadow-sm sm:rounded-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-[rgba(34,137,190,0.14)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[rgba(31,154,138,0.12)] blur-3xl" />

        <button
          type="button"
          onClick={() => setStep("plan")}
          className="relative mb-4 flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Voltar aos planos
        </button>

        <p className="relative text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Adestro</p>
        <h2 className="relative mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Criar conta</h2>

        {/* Plano selecionado */}
        <div className="relative mt-3 flex items-center gap-3 rounded-md border border-[rgba(20,90,130,0.2)] bg-[rgba(20,90,130,0.05)] px-4 py-2.5">
          <span className="text-base">✓</span>
          <p className="text-sm font-semibold text-[var(--foreground)]">Plano: {planLabel}</p>
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="ml-auto text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Trocar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-5 space-y-3 sm:mt-5 sm:space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">Nome completo</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#1b719d]"
              placeholder="Carlos Adestrador"
              required
              minLength={2}
              autoComplete="name"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#1b719d]"
              placeholder="voce@adestrador.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#1b719d]"
              placeholder="Minimo 6 caracteres"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">Confirmar senha</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[#1b719d]"
              placeholder="Repita a senha"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="pc-primary-action w-full rounded-md px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Criando sua conta..." : "Criar conta"}
          </button>

          {error ? (
            <div className="rounded-md border border-[rgba(176,116,32,0.3)] bg-[rgba(245,186,86,0.16)] px-4 py-3 text-sm font-medium text-[#8a5b1a]">
              {error}
            </div>
          ) : null}
        </form>

        <p className="relative mt-5 text-center text-sm text-[var(--muted)]">
          Ja tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--foreground)] hover:underline">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
