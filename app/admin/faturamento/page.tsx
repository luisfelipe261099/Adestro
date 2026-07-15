"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { AdminContextNav } from "@/components/admin-context-nav";

type OverviewResponse = {
  metrics: {
    mrr: number;
    totalPaid: number;
    totalPending: number;
    arr: number;
  };
  recentTransactions: Array<{
    id: string;
    trainer: string;
    plan: string;
    amount: number;
    status: "Pago" | "Pendente";
    date: string;
    source: string;
  }>;
};

export default function FaturamentoPage() {
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

  const metrics = data?.metrics;
  const transactions = data?.recentTransactions ?? [];

  return (
    <PageShell
      kicker="Admin"
      title="Faturamento e receita recorrente"
      description="Veja rapidamente o que foi pago, o que esta pendente e como a receita evolui."
      requireAuth="admin"
    >
      <AdminContextNav />
      <div className="mx-auto max-w-7xl space-y-6">
        <div data-tour="admin-faturamento" className="grid gap-4 md:grid-cols-4">
          {[
            { icon: "💰", label: "Receita MRR", value: (metrics?.mrr ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { icon: "✅", label: "Pagamentos Confirmados", value: (metrics?.totalPaid ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { icon: "⏳", label: "Pagamentos Pendentes", value: (metrics?.totalPending ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { icon: "📈", label: "ARR Estimado", value: (metrics?.arr ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-md border border-slate-300 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-900">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-base font-bold text-emerald-700">dados reais da base</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6">
          <h3 className="mb-4 text-xl font-semibold">Transações recentes de assinaturas</h3>
          <div className="space-y-3">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border-2 border-slate-300 bg-white p-4">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-base">{tx.trainer}</p>
                  <p className="text-base font-medium text-slate-700">{tx.plan} • {tx.source}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-base">{tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  <p className="text-sm font-medium text-slate-600">{tx.date}</p>
                </div>
                <span className={`ml-4 inline-block rounded-full px-4 py-2 text-base font-bold ${
                  tx.status === "Pago" 
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {tx.status}
                </span>
              </div>
            ))}
            {!transactions.length ? <p className="text-sm text-[var(--muted)]">Sem transações registradas até o momento.</p> : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
