"use client";

import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { AdminContextNav } from "@/components/admin-context-nav";

type TrainerRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  status: "Ativo" | "Trial";
  planType: "Trial" | "Starter" | "Pro" | "Business";
  monthlyValue: number;
};

export default function PlanosPage() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [draftPlan, setDraftPlan] = useState<"Trial" | "Starter" | "Pro" | "Business">("Starter");
  const [message, setMessage] = useState("");

  async function fetchTrainers(): Promise<TrainerRow[]> {
    const response = await fetch("/api/admin/trainers");
    if (!response.ok) return [];
    return (await response.json()) as TrainerRow[];
  }

  async function loadTrainers() {
    const data = await fetchTrainers();
    setTrainers(data);
    if (!selectedTrainerId && data[0]) {
      setSelectedTrainerId(data[0].id);
      setDraftPlan(data[0].planType);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const data = await fetchTrainers();
      if (!mounted) return;
      setTrainers(data);
      if (data[0]) {
        setSelectedTrainerId(data[0].id);
        setDraftPlan(data[0].planType);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedTrainer = useMemo(
    () => trainers.find((trainer) => trainer.id === selectedTrainerId) ?? null,
    [trainers, selectedTrainerId],
  );

  const planDistribution = useMemo(() => {
    return trainers.reduce<Record<string, number>>((acc, trainer) => {
      acc[trainer.planType] = (acc[trainer.planType] ?? 0) + 1;
      return acc;
    }, {});
  }, [trainers]);

  async function savePlan() {
    if (!selectedTrainerId) return;

    const response = await fetch("/api/admin/trainers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedTrainerId, planType: draftPlan, status: draftPlan === "Trial" ? "Trial" : "Ativo" }),
    });

    if (!response.ok) {
      setMessage("Não foi possível salvar o plano agora.");
      return;
    }

    setMessage("Plano atualizado com sucesso.");
    await loadTrainers();
  }

  return (
    <PageShell
      kicker="Admin"
      title="Planos"
      description="Ajuste o plano de cada conta e acompanhe a distribuicao atual da base."
      requireAuth="admin"
    >
      <AdminContextNav />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div data-tour="admin-planos" className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
          <h3 className="mb-6 text-xl font-semibold">Distribuição real dos planos</h3>
          <p className="mb-6 text-sm text-[var(--muted)]">Contagem por plano com base na base real de adestradores.</p>
          
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(planDistribution).map(([plan, count]) => (
              <div key={plan} className="rounded-md border border-slate-300 bg-slate-50 p-5">
                <h4 className="text-2xl font-bold text-slate-900">{plan}</h4>
                <p className="mt-2 text-3xl font-bold text-slate-900">{count}</p>
                <p className="mt-2 text-sm text-slate-600">adestradores neste plano</p>
              </div>
            ))}
            {!Object.keys(planDistribution).length ? <p className="text-sm text-[var(--muted)]">Sem dados de plano na base.</p> : null}
          </div>
        </div>

          <aside className="rounded-md border border-[var(--border)] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Atualização operacional
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              Plano de adestrador
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Edite o plano de uma conta real e persista a alteração no banco.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[var(--muted)]">Adestrador</span>
                <select
                  value={selectedTrainerId}
                  onChange={(event) => {
                    const next = trainers.find((trainer) => trainer.id === event.target.value);
                    setSelectedTrainerId(event.target.value);
                    if (next) setDraftPlan(next.planType);
                  }}
                  className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
                >
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>{trainer.name} • {trainer.email}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--muted)]">Plano</span>
                <select
                  value={draftPlan}
                  onChange={(event) => setDraftPlan(event.target.value as "Trial" | "Starter" | "Pro" | "Business")}
                  className="mt-2 w-full rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
                >
                  <option value="Trial">Trial</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Business">Business</option>
                </select>
              </label>

              {selectedTrainer ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">
                  Conta atual: {selectedTrainer.name} • {selectedTrainer.planType} • {selectedTrainer.status}
                </div>
              ) : null}

              {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}

              <button
                type="button"
                onClick={savePlan}
                className="pc-primary-action w-full rounded-full px-5 py-3 text-sm font-semibold"
              >
                Salvar plano
              </button>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
