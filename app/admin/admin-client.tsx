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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-md border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Comece por aqui</p>
        <h2 className="mt-1 text-2xl font-semibold">O que voce quer fazer agora?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Use os atalhos abaixo para chegar direto na acao principal sem precisar procurar no menu.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/adestradores", label: "Gerenciar adestradores", detail: "Cadastrar, editar e ajustar status" },
            { href: "/admin/planos", label: "Ajustar planos", detail: "Alterar plano por conta" },
            { href: "/admin/faturamento", label: "Revisar faturamento", detail: "Pagamentos e pendencias" },
            { href: "/admin/relatorios", label: "Ver relatorios", detail: "Uso e desempenho da base" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 transition hover:bg-white"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
              <p className="text-xs text-[var(--muted)]">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            icon: "👥",
            label: "Adestradores Ativos",
            value: String(metrics?.activeTrainers ?? 0),
            subtext: `+ ${metrics?.trialTrainers ?? 0} em trial • ${metrics?.totalTrainers ?? 0} contas`,
          },
          {
            icon: "🐕",
            label: "Cães em Gestão",
            value: String(metrics?.totalDogs ?? 0),
            subtext: "casos monitorados pela base ativa",
          },
          {
            icon: "💰",
            label: "MRR",
            value: (metrics?.mrr ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            subtext: "receita mensal recorrente consolidada",
          },
          {
            icon: "📈",
            label: "Sessões do mês",
            value: String(metrics?.sessionsMonth ?? 0),
            subtext: "sessões registradas na plataforma",
          },
          {
            icon: "🧪",
            label: "Receita pendente",
            value: (metrics?.totalPending ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            subtext: "pendências em aberto",
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-5 shadow-sm ${index > 2 ? "hidden sm:block" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-[var(--muted)]">{stat.label}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.subtext}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de conteúdo principal */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Coluna esquerda - Adestradores */}
        <div className="space-y-5 lg:col-span-2">
          {/* Adestradores Ativos */}
          <section className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Base de adestradores</h3>
              <span className="hidden text-sm font-medium text-slate-600 sm:block">
                {metrics?.activeTrainers ?? 0} ativos • {metrics?.trialTrainers ?? 0} em trial
              </span>
            </div>

            <div className="space-y-3">
              {trainers.slice(0, 4).map((trainer) => (
                <div
                  key={trainer.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{trainer.name}</p>
                    <p className="text-sm text-slate-600">{trainer.email}</p>
                    <p className="mt-1 text-xs text-slate-500">Entrou em {trainer.joinedAt}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{trainer.monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <p className="text-sm text-slate-600">{trainer.planType}</p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {trainer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Relatório de Crescimento */}
          <section className="hidden rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6 shadow-sm lg:block">
            <h3 className="mb-5 text-xl font-semibold">Indicadores resumidos</h3>

            <div className="space-y-4">
              {[
                { label: "Taxa de ativação", current: metrics?.totalTrainers ? Math.round(((metrics?.activeTrainers ?? 0) / metrics.totalTrainers) * 100) : 0, total: 100 },
                { label: "Sessões por adestrador", current: Math.min(((metrics?.averageDogsPerTrainer ?? 0) * 20), 100), total: 100 },
                { label: "Receita confirmada", current: metrics?.mrr ? Math.round(((metrics?.totalPaid ?? 0) / metrics.mrr) * 100) : 0, total: 100 },
                { label: "Receita pendente", current: metrics?.mrr ? Math.round(((metrics?.totalPending ?? 0) / metrics.mrr) * 100) : 0, total: 100 },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{metric.label}</p>
                    <p className="font-semibold text-slate-900">{metric.current}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all"
                      style={{ width: `${metric.current}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Coluna direita - Info do administrador e ações */}
        <div className="space-y-5">
          {/* Info Admin */}
          <section className="rounded-md border border-[var(--border)] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seu Acesso
            </p>
            <h3 className="mt-3 text-2xl font-semibold">Administrador</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Esta area concentra as decisoes principais de operacao: contas, planos, faturamento e desempenho.
            </p>

            <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
              {[
                "✓ Criar e editar adestradores",
                "✓ Ajustar plano por conta",
                "✓ Acompanhar receita e pendencias",
                "✓ Ver desempenho da base",
              ].map((item) => (
                <p key={item} className="text-sm text-slate-300">
                  {item}
                </p>
              ))}
            </div>
          </section>

          {/* Atividades Recentes */}
          <section className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Movimentacao recente</h3>

            <div className="space-y-3">
              {recentTransactions.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex gap-3 text-sm">
                  <span className="text-xl">{tx.status === "Pago" ? "✅" : "⏳"}</span>
                  <div className="flex-1">
                    <p className="text-slate-900">{tx.trainer} • {tx.source}</p>
                    <p className="text-xs text-slate-500">{tx.date} • {tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} • {tx.status}</p>
                  </div>
                </div>
              ))}
              {!loading && recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-500">Sem transações recentes.</p>
              ) : null}
            </div>
          </section>

          {/* Status do Sistema */}
          <section className="hidden rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-6 shadow-sm lg:block">
            <h3 className="mb-4 text-lg font-semibold">Saude do sistema</h3>

            <div className="space-y-3">
              {[
                { name: "API", status: "Operacional", color: "emerald" },
                { name: "Database", status: "Operacional", color: "emerald" },
                { name: "Armazenamento", status: "Operacional", color: "emerald" },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full bg-${item.color}-500`}
                      style={{ backgroundColor: item.color === "emerald" ? "#10b981" : "#ef4444" }}
                    />
                    <p className="text-xs font-medium text-slate-600">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">Carregando dados reais da base...</p> : null}
    </div>
  );
}
