import React from "react";

interface AIAnalysisResult {
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  estimated_progress: number;
  recommended_exercises: string[];
  summary_for_tutor: string;
}

interface AIAnalysisPanelProps {
  analysis: AIAnalysisResult;
  dogName: string;
  sessionDate: string;
}

export function AIAnalysisPanel({ analysis, dogName, sessionDate }: AIAnalysisPanelProps) {
  return (
    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6 shadow-md">
      <div className="mb-6">
        <h3 className="mb-1 flex items-center gap-2 text-xl font-bold text-purple-900">
          <span>🤖</span>
          Análise de IA - {dogName}
        </h3>
        <p className="text-sm text-gray-600">Análise automática da sessão de {sessionDate}</p>
      </div>

      {/* Resumo para o Cliente */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <h4 className="mb-2 font-semibold text-gray-900">Resumo para Enviar ao Cliente</h4>
        <p className="italic text-gray-700">{analysis.summary_for_tutor}</p>
      </div>

      {/* Progresso Estimado */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Progresso Estimado</h4>
          <span className="text-2xl font-bold text-purple-600">{analysis.estimated_progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${analysis.estimated_progress}%` }}
          />
        </div>
      </div>

      {/* Pontos Fortes */}
      <div className="mb-6">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-green-700">
          <span>✅</span>
          Pontos Fortes
        </h4>
        <ul className="space-y-2">
          {analysis.strengths.map((strength, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1 flex-shrink-0 text-green-500">•</span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Áreas de Melhoria */}
      <div className="mb-6">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-orange-700">
          <span>⚠️</span>
          Áreas de Melhoria
        </h4>
        <ul className="space-y-2">
          {analysis.improvements.map((improvement, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1 flex-shrink-0 text-orange-500">•</span>
              <span>{improvement}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Próximos Passos */}
      <div className="mb-6">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-700">
          <span>🎯</span>
          Próximos Passos
        </h4>
        <ul className="space-y-2">
          {analysis.next_steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1 flex-shrink-0 text-blue-500">→</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exercícios Recomendados */}
      {analysis.recommended_exercises.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
            <span>💪</span>
            Exercícios Recomendados
          </h4>
          <ul className="space-y-2">
            {analysis.recommended_exercises.map((exercise, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                <span className="mt-1 flex-shrink-0 text-blue-600">→</span>
                <span>{exercise}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dica */}
      <div className="mt-6 rounded-lg border-l-4 border-purple-500 bg-purple-50 px-4 py-3 text-sm text-gray-700">
        <p className="font-semibold text-purple-900">💡 Dica:</p>
        <p>
          Compartilhe o resumo acima com o cliente para manter a comunicação clara sobre o progresso do cão. A análise de IA
          ajuda a personalizar o plano de treino.
        </p>
      </div>
    </div>
  );
}
