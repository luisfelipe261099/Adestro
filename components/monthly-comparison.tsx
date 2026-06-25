"use client";

import { useEffect, useMemo, useState } from "react";

import { SkeletonCard } from "@/components/skeletons";

type Metrics = {
  sessions: number;
  averageCommandRating: number;
  activitiesCompletionRate: number;
  npsAverage: number | null;
  approvedSessions: number;
};

type Compare = {
  dogId: string;
  monthA: Metrics & { label: string };
  monthB: Metrics & { label: string };
  delta: {
    sessions: number;
    averageCommandRating: number;
    activitiesCompletionRate: number;
    npsAverage: number | null;
  };
};

function buildMonthOptions(): string[] {
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const today = new Date();
  const options: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    options.push(`${months[d.getMonth()]} de ${d.getFullYear()}`);
  }
  return options;
}

function delta(value: number, withSign = true): string {
  const fixed = value.toFixed(1);
  if (!withSign) return fixed;
  if (value > 0) return `+${fixed}`;
  return fixed;
}

function deltaColor(value: number, lowerIsBetter = false): string {
  if (value === 0) return "text-slate-500";
  const positive = lowerIsBetter ? value < 0 : value > 0;
  return positive ? "text-emerald-700" : "text-rose-700";
}

export function MonthlyComparison({ dogId, dogName }: { dogId: string; dogName: string }) {
  const months = useMemo(buildMonthOptions, []);
  const [monthA, setMonthA] = useState(months[1] ?? "");
  const [monthB, setMonthB] = useState(months[0] ?? "");
  const [data, setData] = useState<Compare | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dogId || !monthA || !monthB) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(
      `/api/relatorios/compare?dogId=${encodeURIComponent(dogId)}&monthA=${encodeURIComponent(monthA)}&monthB=${encodeURIComponent(monthB)}`,
      { cache: "no-store" },
    )
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar comparativo");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dogId, monthA, monthB]);

  return (
    <article className="rounded-md border border-emerald-100 bg-emerald-50/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Comparativo</p>
          <h3 className="text-base font-semibold text-emerald-950">Evolução mês vs mês • {dogName}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <select
            value={monthA}
            onChange={(event) => setMonthA(event.target.value)}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-emerald-700">vs</span>
          <select
            value={monthB}
            onChange={(event) => setMonthB(event.target.value)}
            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </header>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="mt-3"><SkeletonCard rows={3} /></div>
      ) : data ? (
        <div className="mt-3 grid gap-2 text-xs">
          <div className="grid grid-cols-3 gap-2 rounded-md bg-white p-3 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-700">{data.monthA.label}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">{data.monthA.sessions}</p>
              <p className="text-[10px] text-[var(--muted)]">Sessões</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span aria-hidden className="text-emerald-700">→</span>
              <span className={`text-[11px] font-bold ${deltaColor(data.delta.sessions)}`}>{delta(data.delta.sessions)}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-700">{data.monthB.label}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">{data.monthB.sessions}</p>
              <p className="text-[10px] text-[var(--muted)]">Sessões</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md bg-white p-3 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-950">{data.monthA.averageCommandRating.toFixed(1)}<span className="text-sm text-emerald-600">/5</span></p>
              <p className="text-[10px] text-[var(--muted)]">Comando médio</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className={`text-[11px] font-bold ${deltaColor(data.delta.averageCommandRating)}`}>{delta(data.delta.averageCommandRating)}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-950">{data.monthB.averageCommandRating.toFixed(1)}<span className="text-sm text-emerald-600">/5</span></p>
              <p className="text-[10px] text-[var(--muted)]">Comando médio</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md bg-white p-3 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-950">{data.monthA.activitiesCompletionRate.toFixed(0)}<span className="text-sm text-emerald-600">%</span></p>
              <p className="text-[10px] text-[var(--muted)]">Atividades feitas</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className={`text-[11px] font-bold ${deltaColor(data.delta.activitiesCompletionRate)}`}>{delta(data.delta.activitiesCompletionRate)}pp</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-950">{data.monthB.activitiesCompletionRate.toFixed(0)}<span className="text-sm text-emerald-600">%</span></p>
              <p className="text-[10px] text-[var(--muted)]">Atividades feitas</p>
            </div>
          </div>

          {data.monthA.npsAverage !== null || data.monthB.npsAverage !== null ? (
            <div className="grid grid-cols-3 gap-2 rounded-md bg-white p-3 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-950">
                  {data.monthA.npsAverage === null ? "—" : data.monthA.npsAverage.toFixed(1)}
                </p>
                <p className="text-[10px] text-[var(--muted)]">NPS médio</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className={`text-[11px] font-bold ${data.delta.npsAverage === null ? "text-slate-400" : deltaColor(data.delta.npsAverage)}`}>
                  {data.delta.npsAverage === null ? "—" : delta(data.delta.npsAverage)}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-950">
                  {data.monthB.npsAverage === null ? "—" : data.monthB.npsAverage.toFixed(1)}
                </p>
                <p className="text-[10px] text-[var(--muted)]">NPS médio</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
