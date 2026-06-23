"use client";

import { useState } from "react";

import {
  PageShell,
} from "@/components/page-shell";
import {
  useAppStore,
  type TrainerCardBrand,
  type TrainerLessonPackage,
  type TrainerPaymentMethod,
  type TrainerPlanName,
} from "@/lib/app-store";

const paymentMethods: TrainerPaymentMethod[] = ["Pix", "Cartao", "Boleto"];
const lessonPackages: TrainerLessonPackage[] = ["4 aulas", "8 aulas", "12 aulas"];
const cardBrands: TrainerCardBrand[] = ["Visa", "Mastercard", "Elo"];

const pricingPlans = [
  {
    name: "Starter" as TrainerPlanName,
    price: "a partir de R$ 120 por pacote",
    audience: "Autônomo em validação",
    summary: "Ideal para organizar poucos casos e manter o controle comercial por quantidade de aulas.",
    features: ["Até 5 clientes", "Agenda básica", "Portal externo"],
    featured: false,
  },
  {
    name: "Pro" as TrainerPlanName,
    price: "a partir de R$ 168 por pacote",
    audience: "Operação recorrente",
    summary: "Plano principal para quem trabalha com carteira recorrente e precisa controlar pacotes de atendimento.",
    features: ["Clientes ilimitados", "WhatsApp", "PDFs", "Portal completo"],
    featured: true,
  },
  {
    name: "Business" as TrainerPlanName,
    price: "a partir de R$ 220 por pacote",
    audience: "Equipe ou franquia",
    summary: "Camada premium para operação maior, com mais margem por pacote e previsão comercial.",
    features: ["Multi-adestrador", "ERP básico", "White-label"],
    featured: false,
  },
];

function packageBenefitLabel(lessonPackage: TrainerLessonPackage) {
  if (lessonPackage === "12 aulas") return "Melhor custo por aula para casos de acompanhamento longo";
  if (lessonPackage === "8 aulas") return "Equilíbrio entre frequência, caixa e previsão operacional";
  return "Pacote enxuto para casos novos ou acompanhamento mais leve";
}

function packageChargeLabel(lessonPackage: TrainerLessonPackage) {
  if (lessonPackage === "12 aulas") return "Controle por pacote de 12 aulas";
  if (lessonPackage === "8 aulas") return "Controle por pacote de 8 aulas";
  return "Controle por pacote de 4 aulas";
}

export default function TrainerPlansPage() {
  const subscription = useAppStore((state) => state.trainerSubscription);
  const paymentProfile = useAppStore((state) => state.trainerPaymentProfile);
  const renewalHistory = useAppStore((state) => state.trainerRenewalHistory);
  const setTrainerSubscriptionPlan = useAppStore((state) => state.setTrainerSubscriptionPlan);
  const setTrainerPaymentSettings = useAppStore((state) => state.setTrainerPaymentSettings);
  const setTrainerPaymentProfile = useAppStore((state) => state.setTrainerPaymentProfile);
  const renewTrainerSubscription = useAppStore((state) => state.renewTrainerSubscription);
  const [busyPlanName, setBusyPlanName] = useState<TrainerPlanName | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  async function handlePlanSelection(plan: TrainerPlanName) {
    if (busyPlanName || plan === subscription.planName) return;
    setBusyPlanName(plan);
    const ok = await setTrainerSubscriptionPlan(plan);
    if (ok) {
      setFeedbackMessage("Plano atualizado com sucesso.");
    } else {
      setFeedbackMessage("Não foi possível atualizar o plano agora.");
    }
    window.setTimeout(() => setFeedbackMessage(""), 3000);
    setBusyPlanName(null);
  }

  async function handleRenewNow() {
    if (isRenewing) return;
    setIsRenewing(true);
    const ok = await renewTrainerSubscription();
    if (ok) {
      setFeedbackMessage("Renovação gerada com sucesso.");
    } else {
      setFeedbackMessage("Não foi possível gerar renovação agora.");
    }
    window.setTimeout(() => setFeedbackMessage(""), 3000);
    setIsRenewing(false);
  }

  return (
    <PageShell
      kicker="Planos"
      title="Planos e pacotes do adestrador"
      description="Controle plano, pagamento e quantidade de aulas do pacote sem depender de cobrança por período."
      requireAuth="trainer"
    >
      {feedbackMessage ? (
        <section>
          <article className="rounded-md border border-[var(--border)] bg-white/90 px-4 py-3 text-sm text-[var(--foreground)] shadow-sm">
            {feedbackMessage}
          </article>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Planos disponíveis</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => {
              const isActive = subscription.planName === plan.name;

              return (
                <article
                  key={plan.name}
                  className={`rounded-lg border p-5 ${
                    isActive
                      ? "border-[#145a82] bg-[rgba(20,90,130,0.08)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{plan.audience}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{plan.name}</h2>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{plan.price}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{plan.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.features.slice(0, 4).map((feature) => (
                      <span key={feature} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlanSelection(plan.name as TrainerPlanName)}
                    disabled={busyPlanName !== null}
                    className={`mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold ${
                      isActive ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white text-[var(--foreground)]"
                    } disabled:opacity-60`}
                  >
                    {busyPlanName === plan.name
                      ? "Salvando..."
                      : isActive
                      ? "Plano atual"
                      : "Escolher plano"}
                  </button>
                </article>
              );
            })}
          </div>
        </article>

        <div className="grid gap-4">
          <article className="rounded-lg border border-[var(--border)] bg-white/95 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Assinatura atual</p>
            <h2 className="mt-2 text-2xl font-semibold">{subscription.planName}</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <p>Status: <span className="font-semibold text-[var(--foreground)]">{subscription.status}</span></p>
              <p>Forma de pagamento: <span className="font-semibold text-[var(--foreground)]">{subscription.paymentMethod}</span></p>
              <p>Pacote: <span className="font-semibold text-[var(--foreground)]">{subscription.lessonPackage}</span></p>
              <p>Próxima revisão: <span className="font-semibold text-[var(--foreground)]">{subscription.nextChargeDate}</span></p>
              <p>Valor do pacote: <span className="font-semibold text-[var(--foreground)]">{subscription.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
            </div>

            <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">{packageChargeLabel(subscription.lessonPackage)}</p>
              <p className="mt-1">{packageBenefitLabel(subscription.lessonPackage)}</p>
            </div>

            <button
              type="button"
              onClick={handleRenewNow}
              disabled={isRenewing}
              className="pc-primary-action mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {isRenewing ? "Gerando renovação..." : "Renovar agora"}
            </button>
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Pagamento e controle do pacote</p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-[var(--muted)]">Forma de pagamento</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setTrainerPaymentSettings({
                          paymentMethod: method,
                          lessonPackage: subscription.lessonPackage,
                          autoRenew: subscription.autoRenew,
                        })
                      }
                      className={`rounded-md border px-3 py-3 text-sm font-semibold ${
                        subscription.paymentMethod === method
                          ? "border-[#145a82] bg-[rgba(20,90,130,0.08)] text-[var(--foreground)]"
                          : "border-[var(--border)] bg-white text-[var(--foreground)]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--muted)]">Quantidade de aulas</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {lessonPackages.map((lessonPackage) => (
                    <button
                      key={lessonPackage}
                      type="button"
                      onClick={() =>
                        setTrainerPaymentSettings({
                          paymentMethod: subscription.paymentMethod,
                          lessonPackage,
                          autoRenew: subscription.autoRenew,
                        })
                      }
                      className={`rounded-md border px-3 py-3 text-sm font-semibold ${
                        subscription.lessonPackage === lessonPackage
                          ? "border-[#145a82] bg-[rgba(20,90,130,0.08)] text-[var(--foreground)]"
                          : "border-[var(--border)] bg-white text-[var(--foreground)]"
                      }`}
                    >
                      {lessonPackage}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setTrainerPaymentSettings({
                    paymentMethod: subscription.paymentMethod,
                    lessonPackage: subscription.lessonPackage,
                    autoRenew: !subscription.autoRenew,
                  })
                }
                className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
              >
                Renovação automática: {subscription.autoRenew ? "Ativada" : "Desativada"}
              </button>

              <div className="rounded-md border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Dados de pagamento</p>

                {subscription.paymentMethod === "Pix" ? (
                  <label className="mt-3 block">
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Chave Pix</span>
                    <input
                      value={paymentProfile.pixKey}
                      onChange={(event) => setTrainerPaymentProfile({ pixKey: event.target.value })}
                      className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none"
                      placeholder="seu-email@pix"
                    />
                  </label>
                ) : null}

                {subscription.paymentMethod === "Cartao" ? (
                  <div className="mt-3 grid gap-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Titular</span>
                      <input
                        value={paymentProfile.cardHolder}
                        onChange={(event) => setTrainerPaymentProfile({ cardHolder: event.target.value })}
                        className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none"
                        placeholder="Nome no cartão"
                      />
                    </label>
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Bandeira</span>
                        <select
                          value={paymentProfile.cardBrand}
                          onChange={(event) => setTrainerPaymentProfile({ cardBrand: event.target.value as TrainerCardBrand })}
                          className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        >
                          {cardBrands.map((brand) => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Final</span>
                        <input
                          value={paymentProfile.cardLast4}
                          onChange={(event) => setTrainerPaymentProfile({ cardLast4: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                          className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none"
                          placeholder="4456"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {subscription.paymentMethod === "Boleto" ? (
                  <label className="mt-3 block">
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Email para boleto</span>
                    <input
                      type="email"
                      value={paymentProfile.boletoEmail}
                      onChange={(event) => setTrainerPaymentProfile({ boletoEmail: event.target.value })}
                      className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none"
                      placeholder="financeiro@seunegocio.com"
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-[var(--border)] bg-white/95 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Histórico de renovações</p>
            <div className="mt-4 space-y-2">
              {renewalHistory.slice(0, 5).map((record) => (
                <div key={record.id} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{record.planName} • {record.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  <p className="mt-1 text-[var(--muted)]">{record.date} • {record.paymentMethod} • {record.lessonPackage}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{record.status}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  );
}