import React from "react";

interface FeedbackDimensions {
  obedience: number; // 1-5
  socialBehavior: number; // 1-5
  confidence: number; // 1-5
  discipline: number; // 1-5
}

interface TrainerFeedback {
  id: string;
  date: string;
  trainerName: string;
  dogName: string;
  ratings: FeedbackDimensions;
  comments: string;
  videoLink?: string;
  nextGoals: string[];
}

interface FeedbackCardProps {
  feedback: TrainerFeedback;
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-orange-600";
  };

  const getRatingLabel = (rating: number) => {
    const labels = ["", "Precisa de melhoria", "Bom início", "Progredindo bem", "Excelente", "Perfeito"];
    return labels[rating] || "Sem avaliação";
  };

  const dimensionLabels = {
    obedience: "Obediência",
    socialBehavior: "Comportamento Social",
    confidence: "Confiança",
    discipline: "Disciplina",
  };

  const ratings = Object.entries(feedback.ratings) as Array<[keyof FeedbackDimensions, number]>;

  return (
    <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-md">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{feedback.dogName}</h3>
          <p className="text-sm text-gray-600">
            Feedback de <strong>{feedback.trainerName}</strong> em {new Date(feedback.date).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {feedback.videoLink && (
          <a
            href={feedback.videoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
          >
            Ver vídeo
          </a>
        )}
      </div>

      {/* Avaliações em Dimensões */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {ratings.map(([key, value]) => (
          <div key={key} className="rounded-lg bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                {dimensionLabels[key as keyof typeof dimensionLabels]}
              </label>
              <span className={`text-lg font-bold ${getRatingColor(value)}`}>{value}/5</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < value ? "bg-yellow-400" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-600">{getRatingLabel(value)}</p>
          </div>
        ))}
      </div>

      {/* Comentários */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-gray-900">Observações</h4>
        <p className="text-gray-700">{feedback.comments}</p>
      </div>

      {/* Próximos Objetivos */}
      {feedback.nextGoals.length > 0 && (
        <div className="rounded-lg bg-green-50 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-green-900">
            Próximos Objetivos
          </h4>
          <ul className="space-y-2">
            {feedback.nextGoals.map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-green-900">
                <span className="mt-0.5 flex-shrink-0">✓</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Média Geral */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">Avaliação Geral</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const avg = ratings.reduce((sum, [, val]) => sum + val, 0) / ratings.length;
              return (
                <span
                  key={i}
                  className={`text-lg ${i < Math.round(avg) ? "text-yellow-400" : "text-gray-300"}`}
                >
                  ★
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
