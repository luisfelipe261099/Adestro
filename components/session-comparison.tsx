"use client";

// Comparativo de evolução POR SESSÃO (ex.: Sessão 1 vs Sessão 4), com gráfico
// da progressão entre as sessões — substitui a comparação por período/mês.
// 100% client-side: deriva tudo das sessões já carregadas no app-store.

import { useMemo, useState } from "react";

import { useAppStore } from "@/lib/app-store";

type SessionPoint = {
  sessionId: string;
  label: string; // "Sessão 3"
  date: string;
  /** Nota média dos comandos (0-5) */
  commandAvg: number | null;
  /** Média das notas comportamentais (0-5) */
  behaviorAvg: number | null;
  /** % de atividades concluídas (0-100) */
  activityRate: number | null;
};

function parseBrazilianDate(date: string): number {
  const [d, m, y] = (date ?? "").split("/").map(Number);
  return d && m && y ? new Date(y, m - 1, d).getTime() : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function deltaLabel(a: number | null, b: number | null, unit = ""): { text: string; tone: string } {
  if (a === null || b === null) return { text: "—", tone: "text-[var(--muted)]" };
  const delta = round1(b - a);
  if (delta > 0) return { text: `+${delta}${unit}`, tone: "text-emerald-700" };
  if (delta < 0) return { text: `${delta}${unit}`, tone: "text-rose-700" };
  return { text: `0${unit}`, tone: "text-[var(--muted)]" };
}

// Gráfico de linhas em SVG puro (sem lib): comandos e comportamento (escala 0-5)
// + barras de % de atividades concluídas ao fundo (escala própria 0-100).
function ProgressionChart({ points }: { points: SessionPoint[] }) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 34, left: 30 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const x = (index: number) =>
    pad.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const yScore = (value: number) => pad.top + innerH - (Math.max(0, Math.min(5, value)) / 5) * innerH;
  const yRate = (value: number) => pad.top + innerH - (Math.max(0, Math.min(100, value)) / 100) * innerH;

  const linePath = (selector: (p: SessionPoint) => number | null) => {
    let path = "";
    points.forEach((point, index) => {
      const value = selector(point);
      if (value === null) return;
      const cmd = path && !path.endsWith("M") ? "L" : "M";
      path += `${cmd}${x(index).toFixed(1)},${yScore(value).toFixed(1)} `;
    });
    return path.trim();
  };

  const barWidth = Math.min(28, innerW / Math.max(points.length, 1) / 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Gráfico de progressão entre as sessões"
    >
      {/* Grade horizontal (notas 0-5) */}
      {[0, 1, 2, 3, 4, 5].map((grade) => (
        <g key={grade}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={yScore(grade)}
            y2={yScore(grade)}
            stroke="var(--border)"
            strokeWidth={grade === 0 ? 1.4 : 0.6}
          />
          <text x={pad.left - 8} y={yScore(grade) + 3.5} fontSize="10" textAnchor="end" fill="var(--muted)">
            {grade}
          </text>
        </g>
      ))}

      {/* Barras: % de atividades concluídas */}
      {points.map((point, index) =>
        point.activityRate === null ? null : (
          <rect
            key={point.sessionId}
            x={x(index) - barWidth / 2}
            y={yRate(point.activityRate)}
            width={barWidth}
            height={pad.top + innerH - yRate(point.activityRate)}
            rx={3}
            fill="var(--card-sky-border)"
            opacity={0.55}
          />
        ),
      )}

      {/* Linhas: comandos e comportamento */}
      <path d={linePath((p) => p.commandAvg)} fill="none" stroke="var(--card-blue)" strokeWidth={2.5} />
      <path
        d={linePath((p) => p.behaviorAvg)}
        fill="none"
        stroke="var(--card-purple)"
        strokeWidth={2.5}
        strokeDasharray="5 4"
      />

      {/* Pontos + rótulos do eixo X */}
      {points.map((point, index) => (
        <g key={point.sessionId}>
          {point.commandAvg !== null && (
            <circle cx={x(index)} cy={yScore(point.commandAvg)} r={3.5} fill="var(--card-blue)" />
          )}
          {point.behaviorAvg !== null && (
            <circle cx={x(index)} cy={yScore(point.behaviorAvg)} r={3.5} fill="var(--card-purple)" />
          )}
          <text
            x={x(index)}
            y={height - pad.bottom + 14}
            fontSize="10"
            textAnchor="middle"
            fill="var(--muted)"
          >
            {point.label.replace("Sessão ", "S")}
          </text>
          <text x={x(index)} y={height - pad.bottom + 26} fontSize="8.5" textAnchor="middle" fill="var(--muted)">
            {point.date.slice(0, 5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function SessionComparison({ dogId, dogName }: { dogId: string; dogName: string }) {
  const trainingSessions = useAppStore((state) => state.trainingSessions);

  // Todas as sessões deste cão, da mais antiga para a mais nova.
  const points = useMemo<SessionPoint[]>(() => {
    const own = trainingSessions
      .filter((s) => s.dogId === dogId || (s.dogSessions ?? []).some((ds) => ds.dogId === dogId))
      .sort((a, b) => parseBrazilianDate(a.date) - parseBrazilianDate(b.date) || a.number - b.number);

    return own.map((session, index) => {
      const ds = (session.dogSessions ?? []).find((item) => item.dogId === dogId);
      const commands = ds?.commands ?? [];
      const rated = commands.filter((c) => Number(c.rating) > 0);
      const activities = ds?.activities ?? [];
      const behaviorValues = Object.values(ds?.behaviorScores ?? {}).filter((v) => Number(v) > 0);

      // Fallback para registros antigos (nota 0-10 nas notes → escala 0-5).
      const legacyScores = session.notes?.map((n) => n.score) ?? [];
      const legacyAvg = legacyScores.length
        ? legacyScores.reduce((t, v) => t + v, 0) / legacyScores.length / 2
        : null;

      return {
        sessionId: session.id,
        label: `Sessão ${index + 1}`,
        date: session.date,
        commandAvg: rated.length
          ? round1(rated.reduce((t, c) => t + Number(c.rating), 0) / rated.length)
          : legacyAvg !== null
            ? round1(legacyAvg)
            : null,
        behaviorAvg: behaviorValues.length
          ? round1(behaviorValues.reduce((t, v) => t + Number(v), 0) / behaviorValues.length)
          : null,
        activityRate: activities.length
          ? Math.round((activities.filter((a) => a.completed).length / activities.length) * 100)
          : null,
      };
    });
  }, [trainingSessions, dogId]);

  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [toIndex, setToIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <section className="card p-4">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Evolução por sessão</h3>
        <p className="mt-2 text-[12.5px] text-[var(--muted)]">
          Nenhuma sessão registrada para {dogName} ainda. Registre treinos para acompanhar a progressão.
        </p>
      </section>
    );
  }

  const from = Math.min(fromIndex ?? 0, points.length - 1);
  const to = Math.min(toIndex ?? points.length - 1, points.length - 1);
  const [start, end] = from <= to ? [from, to] : [to, from];
  const range = points.slice(start, end + 1);
  const first = points[start];
  const last = points[end];

  const metrics: Array<{ label: string; a: number | null; b: number | null; unit: string }> = [
    { label: "Comandos (média /5)", a: first.commandAvg, b: last.commandAvg, unit: "" },
    { label: "Comportamento (média /5)", a: first.behaviorAvg, b: last.behaviorAvg, unit: "" },
    { label: "Atividades concluídas", a: first.activityRate, b: last.activityRate, unit: " pp" },
  ];

  return (
    <section className="card p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
            Evolução por sessão — {dogName}
          </h3>
          <p className="text-[12.5px] text-[var(--muted)]">
            Compare duas sessões e veja a progressão no gráfico ({points.length}{" "}
            {points.length === 1 ? "sessão registrada" : "sessões registradas"}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="grid gap-0.5 text-[12px] font-medium text-[var(--muted)]">
            De
            <select
              value={start}
              onChange={(event) => setFromIndex(Number(event.target.value))}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[12.5px] text-[var(--foreground)]"
            >
              {points.map((point, index) => (
                <option key={point.sessionId} value={index}>
                  {point.label} · {point.date}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-0.5 text-[12px] font-medium text-[var(--muted)]">
            Até
            <select
              value={end}
              onChange={(event) => setToIndex(Number(event.target.value))}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[12.5px] text-[var(--foreground)]"
            >
              {points.map((point, index) => (
                <option key={point.sessionId} value={index}>
                  {point.label} · {point.date}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* Comparação sessão A vs sessão B */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {metrics.map((metric) => {
          const delta = deltaLabel(metric.a, metric.b, metric.unit);
          const isRate = metric.unit === " pp";
          const fmt = (v: number | null) => (v === null ? "—" : isRate ? `${v}%` : v.toFixed(1));
          return (
            <article key={metric.label} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">{metric.label}</p>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold text-[var(--foreground)]">{fmt(metric.a)}</span>
                <span className={`text-[13px] font-bold ${delta.tone}`}>{delta.text} →</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{fmt(metric.b)}</span>
              </div>
              <p className="mt-0.5 flex justify-between text-[11px] text-[var(--muted)]">
                <span>{first.label}</span>
                <span>{last.label}</span>
              </p>
            </article>
          );
        })}
      </div>

      {/* Gráfico da progressão no intervalo escolhido */}
      <div className="mt-4 rounded-md border border-[var(--border)] bg-white p-3">
        <ProgressionChart points={range} />
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-5 rounded-full" style={{ background: "var(--card-blue)" }} />
            Comandos (0-5)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-5 rounded-full"
              style={{ background: "var(--card-purple)" }}
            />
            Comportamento (0-5)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--card-sky-border)" }}
            />
            % atividades concluídas
          </span>
        </div>
      </div>
    </section>
  );
}
