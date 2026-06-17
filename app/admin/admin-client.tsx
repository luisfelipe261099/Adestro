"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OverviewResponse = {
  metrics: {
    totalTrainers: number;
    activeTrainers: number;
    trialTrainers: number;
    totalDogs: number;
    mrr: number;
    totalPaid: number;
    totalPending: number;
    arr: number;
    sessionsMonth: number;
    averageDogsPerTrainer: number;
  };
  trainers: Array<{
    id: string;
    name: string;
    email: string;
    joinedAt: string;
    status: "Ativo" | "Trial";
    planType: string;
    monthlyValue: number;
    dogs: number;
    sessions: number;
    paidRevenue: number;
  }>;
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

export function AdminDashboard() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const res = await fetch("/api/admin/overview");
        if (!res.ok) return;
        const json = (await res.json()) as OverviewResponse;
        if (mounted) setData(json);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = data?.metrics;
  const trainers = data?.trainers ?? [];
  const recentTransactions = data?.recentTransactions ?? [];

  const kpis = [
    {
      icon: "👥",
      label: "Adestradores ativos",
      value: String(metrics?.activeTrainers ?? 0),
      subtext: `+${metrics?.trialTrainers ?? 0} em trial • ${metrics?.totalTrainers ?? 0} contas`,
    },
    { icon: "🐕", label: "Cães em gestão", value: String(metrics?.totalDogs ?? 0), subtext: "casos monitorados" },
    {
      icon: "💰",
      label: "MRR",
      value: (metrics?.mrr ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      subtext: "receita recorrente",
    },
    { icon: "📈", label: "Sessões do mês", value: String(metrics?.sessionsMonth ?? 0), subtext: "registradas" },
    {
      icon: "🧪",
      label: "Receita pendente",
      value: (metrics?.totalPending ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      subtext: "em aberto",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-slate-900">
      {/* Atalhos */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Comece por aqui</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">O que você quer fazer agora?</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/adestradores", label: "Gerenciar adestradores", detail: "Cadastrar, editar, senha e status" },
            { href: "/admin/planos", label: "Ajustar planos", detail: "Alterar plano por conta" },
            { href: "/admin/faturamento", label: "Revisar faturamento", detail: "Pagamentos e pendências" },
            { href: "/admin/relatorios", label: "Ver relatórios", detail: "Uso e desempenho da base" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* KPIs — todos visíveis, 2 colunas no mobile */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stat.value}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-700">{stat.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {/* Conteúdo principal */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Esquerda */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Base de adestradores</h3>
              <Link href="/admin/adestradores" className="text-xs font-semibold text-sky-700 hover:text-sky-900">
                Gerenciar →
              </Link>
            </div>

            <div className="space-y-2.5">
              {trainers.slice(0, 5).map((trainer) => (
                <div
                  key={trainer.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition hover:bg-slate-100"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{trainer.name}</p>
                    <p className="truncate text-sm text-slate-500">{trainer.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {trainer.monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <p className="text-xs text-slate-500">{trainer.planType}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        trainer.status === "Ativo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {trainer.status}
                    </span>
                  </div>
                </div>
              ))}
              {!loading && trainers.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum adestrador cadastrado ainda.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Indicadores resumidos</h3>
            <div className="space-y-4">
              {[
                { label: "Taxa de ativação", current: metrics?.totalTrainers ? Math.round(((metrics?.activeTrainers ?? 0) / metrics.totalTrainers) * 100) : 0 },
                { label: "Sessões por adestrador", current: Math.min(((metrics?.averageDogsPerTrainer ?? 0) * 20), 100) },
                { label: "Receita confirmada", current: metrics?.mrr ? Math.round(((metrics?.totalPaid ?? 0) / metrics.mrr) * 100) : 0 },
                { label: "Receita pendente", current: metrics?.mrr ? Math.round(((metrics?.totalPending ?? 0) / metrics.mrr) * 100) : 0 },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{metric.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{metric.current}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all" style={{ width: `${Math.min(metric.current, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Direita */}
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Seu acesso</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Administrador</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Contas, planos, faturamento e desempenho da base em um só lugar.
            </p>
            <div className="mt-4 space-y-1.5 border-t border-slate-700 pt-4">
              {["Criar, editar e trocar senha de adestradores", "Ajustar plano e permissão por conta", "Acompanhar receita e pendências", "Ver desempenho da base"].map((item) => (
                <p key={item} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Movimentação recente</h3>
            <div className="space-y-2.5">
              {recentTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex gap-2.5 text-sm">
                  <span className="text-lg">{tx.status === "Pago" ? "✅" : "⏳"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-900">{tx.trainer} • {tx.source}</p>
                    <p className="text-xs text-slate-500">
                      {tx.date} • {tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} • {tx.status}
                    </p>
                  </div>
                </div>
              ))}
              {!loading && recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">Sem transações recentes.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Carregando dados reais da base...</p> : null}
    </div>
  );
}
