"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { plural } from "@/lib/labels";

type PlanStatus = {
  plan: "Trial" | "Starter" | "Pro" | "Business";
  trialEndsAt: string | null;
  daysRemaining: number | null;
  isTrial: boolean;
  usage: {
    clients: number;
    sessionsThisMonth: number;
  };
  limits: {
    clients: number;
    monthlySessions: number;
    trainers: number;
    dogsPerClient: number;
    storageMb: number;
  };
};

function bar(value: number, limit: number): string {
  const pct = Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
  if (pct >= 90) return "bg-rose-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function pctLabel(value: number, limit: number): number {
  return Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
}

export function PlanUsageCard() {
  const [data, setData] = useState<PlanStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trainer/plan-status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o status do plano.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-xs text-[var(--muted)]">Carregando uso do plano…</p>;
  }

  const showLimited = data.plan !== "Business";

  return (
    <article className="rounded-md border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-indigo-700">Plano atual</p>
          <h2 className="text-base font-semibold text-indigo-950">
            {data.plan} {data.isTrial && data.daysRemaining !== null ? `• ${plural(data.daysRemaining, "dia", "dias")} restantes` : ""}
          </h2>
        </div>
        {data.plan !== "Business" ? (
          <Link
            href="/planos"
            className="rounded-full bg-indigo-600 px-3 py-1 text-[12px] font-bold text-white shadow-sm"
          >
            Fazer upgrade
          </Link>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-800">
            Plano Business ativo
          </span>
        )}
      </header>

      {showLimited ? (
        <div className="grid gap-2">
          <div>
            <div className="flex items-center justify-between text-[12px] font-semibold text-indigo-900">
              <span>Clientes</span>
              <span>{data.usage.clients} / {data.limits.clients}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              <div className={`h-full ${bar(data.usage.clients, data.limits.clients)}`} style={{ width: `${pctLabel(data.usage.clients, data.limits.clients)}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[12px] font-semibold text-indigo-900">
              <span>Sessões este mês</span>
              <span>{data.usage.sessionsThisMonth} / {data.limits.monthlySessions}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              <div className={`h-full ${bar(data.usage.sessionsThisMonth, data.limits.monthlySessions)}`} style={{ width: `${pctLabel(data.usage.sessionsThisMonth, data.limits.monthlySessions)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] text-indigo-900">
            <div className="rounded-lg bg-white px-2 py-1.5 text-center">
              <span className="block font-bold">{data.limits.trainers}</span>
              <span>{data.limits.trainers === 1 ? "Adestrador" : "Adestradores"}</span>
            </div>
            <div className="rounded-lg bg-white px-2 py-1.5 text-center">
              <span className="block font-bold">{data.limits.dogsPerClient}</span>
              <span>Cães/cliente</span>
            </div>
            <div className="rounded-lg bg-white px-2 py-1.5 text-center">
              <span className="block font-bold">{data.limits.storageMb}MB</span>
              <span>Storage</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-indigo-900">Uso ilimitado nesse plano.</p>
      )}
    </article>
  );
}
