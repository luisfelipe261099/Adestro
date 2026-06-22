import React from "react";

interface MonthlyReport {
  dogName: string;
  ownerName: string;
  month: string;
  sessionsCompleted: number;
  pointsEarned: number;
  highlights: string[];
  areasForImprovement: string[];
  nextObjectives: string[];
  overallGrade: string;
  progressPercentage: number;
  recommendedNextSteps: string[];
}

interface MonthlyReportProps {
  report: MonthlyReport;
  onDownloadPDF?: () => void;
}

export function MonthlyReport({ report, onDownloadPDF }: MonthlyReportProps) {
  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-green-100 text-green-800",
      B: "bg-blue-100 text-blue-800",
      C: "bg-yellow-100 text-yellow-800",
      D: "bg-orange-100 text-orange-800",
      F: "bg-red-100 text-red-800",
    };
    return colors[grade] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <div className="rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{report.dogName}</h2>
            <p className="text-gray-600">Relatório mensal de progresso</p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Cliente: {report.ownerName} | Período: {report.month}
            </p>
          </div>
          <div className={`rounded-lg px-4 py-2 text-center ${getGradeColor(report.overallGrade)}`}>
            <p className="text-sm font-semibold">Conceito Geral</p>
            <p className="text-3xl font-bold">{report.overallGrade}</p>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Sessões Realizadas</p>
          <p className="text-3xl font-bold text-blue-600">{report.sessionsCompleted}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Pontos Ganhos</p>
          <p className="text-3xl font-bold text-purple-600">{report.pointsEarned}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Progresso Geral</p>
          <p className="text-3xl font-bold text-green-600">{report.progressPercentage}%</p>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Evolução do Mês</h3>
          <span className="text-2xl font-bold text-purple-600">{report.progressPercentage}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${report.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Destaques */}
      <div className="rounded-lg bg-green-50 p-6 shadow">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-green-900">
          <span>✨</span>
          Destaques do Mês
        </h3>
        <ul className="space-y-2">
          {report.highlights.map((highlight, idx) => (
            <li key={idx} className="flex items-start gap-3 text-green-900">
              <span className="mt-1 flex-shrink-0 text-green-600">✓</span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Áreas para Melhoria */}
      <div className="rounded-lg bg-yellow-50 p-6 shadow">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-yellow-900">
          <span>⚠️</span>
          Áreas para Melhoria
        </h3>
        <ul className="space-y-2">
          {report.areasForImprovement.map((area, idx) => (
            <li key={idx} className="flex items-start gap-3 text-yellow-900">
              <span className="mt-1 flex-shrink-0 text-yellow-600">•</span>
              <span>{area}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Próximos Objetivos */}
      <div className="rounded-lg bg-blue-50 p-6 shadow">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900">
          <span>🎯</span>
          Objetivos para Próximo Mês
        </h3>
        <ul className="space-y-2">
          {report.nextObjectives.map((objective, idx) => (
            <li key={idx} className="flex items-start gap-3 text-blue-900">
              <span className="mt-1 flex-shrink-0 text-blue-600">→</span>
              <span>{objective}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Próximos Passos Recomendados */}
      <div className="rounded-lg border-l-4 border-purple-500 bg-purple-50 p-6">
        <h3 className="mb-3 font-semibold text-purple-900">Recomendações para Casa</h3>
        <ul className="space-y-2">
          {report.recommendedNextSteps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-purple-900">
              <span className="mt-1 flex-shrink-0">→</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão de Download */}
      <div className="flex gap-3">
        <button
          onClick={onDownloadPDF}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
        >
          <span>📥</span>
          Baixar Relatório em PDF
        </button>
        <button className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50">
          📧 Enviar por E-mail
        </button>
      </div>

      {/* Rodapé */}
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
        <p>Relatório gerado automaticamente pelo Adestro</p>
        <p>{new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}</p>
      </div>
    </div>
  );
}
