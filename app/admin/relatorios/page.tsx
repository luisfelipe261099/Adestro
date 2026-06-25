"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminContextNav } from "@/components/admin-context-nav";
import { PageShell } from "@/components/page-shell";

type OverviewResponse = {
  metrics: {
    totalTrainers: number;
    activeTrainers: number;
    trialTrainers: number;
    totalDogs: number;
    sessionsMonth: number;
    averageDogsPerTrainer: number;
  };
  planDistribution: Record<string, number>;
  trainers: Array<{
    id: string;
    name: string;
    dogs: number;
    sessions: number;
    paidRevenue: number;
  }>;
};

export default function RelatoriosPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) return;
      const json = (await res.json()) as OverviewResponse;
      if (mounted) setData(json);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const planRows = useMemo(() => Object.entries(data?.planDistribution ?? {}), [data?.planDistribution]);

  return (
    <PageShell
      kicker="Admin"
      title="Relatorios"
      description="Visualize crescimento, uso da plataforma e sinais de risco para agir mais rapido."
      requireAuth="admin"
    >
      <AdminContextNav />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Crescimento de Usuários */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
            <h3 className="mb-4 text-xl font-semibold">Crescimento de Adestradores</h3>
            <div className="space-y-3">
              {[
                { mes: "Ativos", value: data?.metrics.activeTrainers ?? 0 },
                { mes: "Trial", value: data?.metrics.trialTrainers ?? 0 },
                { mes: "Total", value: data?.metrics.totalTrainers ?? 0 },
              ].map((row) => (
                <div key={row.mes}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{row.mes}</p>
                    <p className="text-sm font-semibold text-slate-900">{row.value}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div 
                      className="h-full bg-sky-500" 
                      style={{ width: `${data?.metrics.totalTrainers ? (row.value / data.metrics.totalTrainers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Taxa de Retenção */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
            <h3 className="mb-4 text-xl font-semibold">Taxa de Retenção por Plano</h3>
            <div className="space-y-3">
              {planRows.map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{plan}</p>
                    <p className="text-sm font-semibold text-slate-900">{count}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${data?.metrics.totalTrainers ? (count / data.metrics.totalTrainers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!planRows.length ? <p className="text-sm text-[var(--muted)]">Sem distribuição de planos disponível.</p> : null}
            </div>
          </div>

          {/* Cães por Adestrador */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
            <h3 className="mb-4 text-xl font-semibold">Média de Cães por Adestrador</h3>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-sky-600">{data?.metrics.averageDogsPerTrainer ?? 0}</p>
              <p className="mt-2 text-sm text-slate-600">casos ativos por conta</p>
              <p className="mt-4 text-xs text-slate-500">{data?.metrics.totalDogs ?? 0} cães monitorados na base</p>
            </div>
          </div>

          {/* Sessões Realizadas */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
            <h3 className="mb-4 text-xl font-semibold">Sessões Realizadas este Mês</h3>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-emerald-600">{data?.metrics.sessionsMonth ?? 0}</p>
              <p className="mt-2 text-sm text-slate-600">sessões confirmadas e registradas</p>
              <p className="mt-4 text-xs text-slate-500">dados acumulados no mês atual</p>
            </div>
          </div>
        </div>

        {/* Tabela de Adestradores com Performance */}
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
          <h3 className="mb-4 text-xl font-semibold">Performance da base de adestradores</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50">
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Adestrador</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Cães</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Sessões</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Receita</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Satisfação</th>
                </tr>
              </thead>
              <tbody>
                {(data?.trainers ?? []).slice(0, 10).map((trainer) => (
                  <tr key={trainer.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900 font-medium">{trainer.name}</td>
                    <td className="px-6 py-3 text-slate-600">{trainer.dogs}</td>
                    <td className="px-6 py-3 text-slate-600">{trainer.sessions}</td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{trainer.paidRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${Math.min(100, trainer.sessions * 10)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-900">{Math.min(100, trainer.sessions * 10)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
