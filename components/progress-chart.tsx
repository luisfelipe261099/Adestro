import React from "react";

interface MonthlyProgress {
  month: string;
  obedience: number;
  socialBehavior: number;
  confidence: number;
  discipline: number;
}

interface ProgressChartProps {
  data: MonthlyProgress[];
  dogName: string;
}

type ProgressDimensionKey = Exclude<keyof MonthlyProgress, "month">;

export function ProgressChart({ data, dogName }: ProgressChartProps) {
  const max = 5;
  const dimensions: Array<{ key: ProgressDimensionKey; label: string; color: string }> = [
    { key: "obedience", label: "Obediência", color: "#3b82f6" },
    { key: "socialBehavior", label: "Comportamento Social", color: "#8b5cf6" },
    { key: "confidence", label: "Confiança", color: "#ec4899" },
    { key: "discipline", label: "Disciplina", color: "#f59e0b" },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-center text-gray-500">Sem dados de progresso ainda. Acompanhe após os primeiros treinos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-md">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Progresso de {dogName}</h3>

      {/* Legenda */}
      <div className="mb-6 flex flex-wrap gap-4">
        {dimensions.map((dim) => (
          <div key={dim.key} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: dim.color }}
            />
            <span className="text-sm text-gray-700">{dim.label}</span>
          </div>
        ))}
      </div>

      {/* Gráfico Simplificado */}
      <div className="space-y-6">
        {data.map((month, idx) => (
          <div key={idx}>
            <h4 className="mb-3 font-semibold text-gray-700">{month.month}</h4>
            <div className="space-y-2">
              {dimensions.map((dim) => {
                const value = month[dim.key] || 0;
                const percentage = (value / max) * 100;
                return (
                  <div key={dim.key} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-gray-600">{dim.label}</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: dim.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-gray-900">
                      {value}/5
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumo de Tendência */}
      <div className="mt-8 rounded-lg bg-green-50 p-4">
        <h4 className="mb-2 font-semibold text-green-900">Análise de Tendência</h4>
        <p className="text-sm text-green-800">
          {data.length > 1
            ? `${dogName} mostrou progresso consistente. A média geral aumentou de ${(
                (data[0].obedience +
                  data[0].socialBehavior +
                  data[0].confidence +
                  data[0].discipline) /
                4
              ).toFixed(1)} para ${(
                (data[data.length - 1].obedience +
                  data[data.length - 1].socialBehavior +
                  data[data.length - 1].confidence +
                  data[data.length - 1].discipline) /
                4
              ).toFixed(1)}.`
            : `Apenas um mês de dados. Continue acompanhando para ver a tendência.`}
        </p>
      </div>
    </div>
  );
}
