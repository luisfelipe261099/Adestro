"use client";

// Tela "Planos de treino" (Fase 2 — análise GPT): pacotes/contratos de sessões
// dos clientes (ClientContract). Listagem; a venda é feita no Financeiro.
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { plural } from "@/lib/labels";

type Contract = {
  id: string;
  name: string;
  sessionsCount: number;
  amount: number;
  status: string;
  startDate: string;
  client?: { id: string; name: string } | null;
  dog?: { id: string; name: string } | null;
  servicePackage?: { name: string } | null;
};

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export default function PlanosTreinoPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/finance/contracts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setContracts(data as Contract[]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = contracts.filter((c) => c.status === "Ativo").length;

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Planos de treino</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Pacotes e contratos de sessões dos clientes.</p>
          </div>
          <span className="text-xs font-medium text-[var(--muted)]">{plural(activeCount, "ativo", "ativos")}</span>
        </header>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando…</p>
        ) : contracts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nenhum plano de treino cadastrado. Crie um na tela de Financeiro (venda de pacote).
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contracts.map((c) => (
              <section key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {c.servicePackage?.name || c.name}
                  </h2>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                      c.status === "Ativo"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-[12px] text-[var(--muted)]">
                  {c.client?.name ?? "—"}
                  {c.dog?.name ? ` · ${c.dog.name}` : ""}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{c.sessionsCount} sessões</span>
                  <span className="font-bold text-[var(--foreground)]">{brl(c.amount)}</span>
                </div>
                {c.startDate ? (
                  <p className="mt-1 text-[12px] text-[var(--muted)]">Início: {c.startDate}</p>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
