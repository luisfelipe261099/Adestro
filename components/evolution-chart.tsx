"use client";

import { behaviorLabel } from "@/lib/behavior";

// Curva da evolução ao longo das sessões.
//
// O adestrador pediu gráfico, e não só o número inicial e o final: é a curva
// que mostra ao cliente que o trabalho andou. Uma linha para a média das
// estrelas dos exercícios e uma linha por eixo comportamental escolhido.
//
// SVG puro, sem biblioteca de gráfico: são poucos pontos e o desenho precisa
// sair no relatório impresso e no PDF do cliente.

export type ProgressPoint = {
  sessao: number;
  data: string;
  titulo?: string;
  media: number;
  exercicios: number;
  comportamento: Record<string, number>;
};

type Props = {
  pontos: ProgressPoint[];
  dogName: string;
};

const CORES = ["#8b5cf6", "#60a5fa", "#34d399", "#fb923c"];
const LARGURA = 640;
const ALTURA = 220;
const PAD = { topo: 16, direita: 16, baixo: 34, esquerda: 30 };

export function EvolutionChart({ pontos, dogName }: Props) {
  if (!pontos || pontos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[12.5px] text-[var(--muted)]">
        Sem sessões neste recorte para desenhar a evolução.
      </div>
    );
  }

  // Uma sessão só não faz curva — mostra o número e explica.
  if (pontos.length === 1) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
        <p className="text-[12.5px] text-[var(--muted)]">
          Só a sessão {pontos[0].sessao} neste recorte — a curva aparece a partir de duas sessões.
        </p>
        <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
          Média {pontos[0].media.toFixed(1)}/5
        </p>
      </div>
    );
  }

  // Eixos comportamentais presentes em pelo menos duas sessões viram linha.
  const chavesComportamento = Array.from(
    new Set(pontos.flatMap((p) => Object.keys(p.comportamento ?? {}))),
  )
    .filter((chave) => pontos.filter((p) => typeof p.comportamento?.[chave] === "number").length >= 2)
    .slice(0, 3);

  const largura = LARGURA - PAD.esquerda - PAD.direita;
  const altura = ALTURA - PAD.topo - PAD.baixo;
  const x = (i: number) => PAD.esquerda + (largura * i) / (pontos.length - 1);
  const y = (valor: number) => PAD.topo + altura - (altura * Math.max(0, Math.min(5, valor))) / 5;

  const linha = (valores: Array<number | null>) =>
    valores
      .map((valor, i) => (valor === null ? null : `${x(i)},${y(valor)}`))
      .filter(Boolean)
      .join(" ");

  const series = [
    {
      chave: "media",
      rotulo: "Média dos exercícios",
      cor: CORES[0],
      valores: pontos.map((p) => p.media),
    },
    ...chavesComportamento.map((chave, idx) => ({
      chave,
      rotulo: behaviorLabel(chave),
      cor: CORES[(idx + 1) % CORES.length],
      valores: pontos.map((p) =>
        typeof p.comportamento?.[chave] === "number" ? p.comportamento[chave] : null,
      ),
    })),
  ];

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const variacao = ultimo.media - primeiro.media;

  return (
    <figure className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--foreground)]">
          Evolução de {dogName} — sessão {primeiro.sessao} à {ultimo.sessao}
        </span>
        <span
          className={`text-[12.5px] font-semibold ${
            variacao > 0 ? "text-[var(--card-green)]" : variacao < 0 ? "text-[var(--danger)]" : "text-[var(--muted)]"
          }`}
        >
          {variacao > 0 ? "▲" : variacao < 0 ? "▼" : "="} {Math.abs(variacao).toFixed(1)} ponto
          {Math.abs(variacao) === 1 ? "" : "s"} · de {primeiro.media.toFixed(1)} para {ultimo.media.toFixed(1)}
        </span>
      </figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="h-auto w-full min-w-[420px]"
          role="img"
          aria-label={`Evolução de ${dogName} da sessão ${primeiro.sessao} à ${ultimo.sessao}`}
        >
          {/* grade e escala 0-5 */}
          {[0, 1, 2, 3, 4, 5].map((valor) => (
            <g key={valor}>
              <line
                x1={PAD.esquerda}
                x2={LARGURA - PAD.direita}
                y1={y(valor)}
                y2={y(valor)}
                stroke="var(--border)"
                strokeWidth={valor === 0 ? 1.2 : 0.6}
              />
              <text x={PAD.esquerda - 6} y={y(valor) + 3.5} textAnchor="end" fontSize="9" fill="var(--muted)">
                {valor}
              </text>
            </g>
          ))}

          {/* eixo das sessões */}
          {pontos.map((p, i) => (
            <text key={p.sessao} x={x(i)} y={ALTURA - 14} textAnchor="middle" fontSize="9" fill="var(--muted)">
              S{p.sessao}
            </text>
          ))}

          {series.map((serie) => (
            <g key={serie.chave}>
              <polyline
                points={linha(serie.valores)}
                fill="none"
                stroke={serie.cor}
                strokeWidth={serie.chave === "media" ? 2.4 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {serie.valores.map((valor, i) =>
                valor === null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(valor)}
                    r={serie.chave === "media" ? 3.4 : 2.4}
                    fill={serie.cor}
                  />
                ),
              )}
            </g>
          ))}
        </svg>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((serie) => (
          <li key={serie.chave} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-strong)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.cor }} />
            {serie.rotulo}
          </li>
        ))}
      </ul>
    </figure>
  );
}
