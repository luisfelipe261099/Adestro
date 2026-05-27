"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { MonthlyReport } from "@/components/monthly-report";

type GeneratedReport = {
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
};

export default function RelatoriosClientPage() {
  const clients = useAppStore((state) => state.clients);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [editableReport, setEditableReport] = useState<GeneratedReport | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Options for months: current month and last 5 months
  const [monthOptions, setMonthOptions] = useState<string[]>([]);

  useEffect(() => {
    const options: string[] = [];
    const today = new Date();
    const monthsPt = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = monthsPt[d.getMonth()];
      const year = d.getFullYear();
      // Format like "maio de 2026"
      options.push(`${monthName} de ${year}`);
    }

    setMonthOptions(options);
    if (options.length > 0) {
      setSelectedMonth(options[0]);
    }
  }, []);

  // Set default client and dog
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const activeClient = clients.find((c) => c.id === selectedClientId);
  const clientDogs = activeClient?.dogs ?? [];

  useEffect(() => {
    if (clientDogs.length > 0) {
      setSelectedDogId(clientDogs[0].id);
    } else {
      setSelectedDogId("");
    }
  }, [selectedClientId, clientDogs]);

  async function handleGenerateReport() {
    if (!selectedDogId || !selectedMonth) {
      setError("Selecione um cão e o período.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");
    setReport(null);
    setEditableReport(null);

    try {
      const url = `/api/relatorios/generate?dogId=${selectedDogId}&month=${encodeURIComponent(selectedMonth)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Erro ao consultar a API de relatórios.");
      }
      const data = (await res.json()) as GeneratedReport;
      setReport(data);
      setEditableReport({ ...data });
      setSuccessMsg("Relatório gerado com sucesso baseando-se nos treinos registrados!");
    } catch (err: any) {
      setError(err.message || "Falha ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  }

  // Helpers to update editable lists
  const handleUpdateList = (
    field: "highlights" | "areasForImprovement" | "nextObjectives" | "recommendedNextSteps",
    index: number,
    value: string
  ) => {
    if (!editableReport) return;
    const updatedList = [...editableReport[field]];
    updatedList[index] = value;
    setEditableReport({
      ...editableReport,
      [field]: updatedList,
    });
  };

  const handleAddListItem = (
    field: "highlights" | "areasForImprovement" | "nextObjectives" | "recommendedNextSteps"
  ) => {
    if (!editableReport) return;
    setEditableReport({
      ...editableReport,
      [field]: [...editableReport[field], "Nova observação / recomendação"],
    });
  };

  const handleRemoveListItem = (
    field: "highlights" | "areasForImprovement" | "nextObjectives" | "recommendedNextSteps",
    index: number
  ) => {
    if (!editableReport) return;
    const updatedList = editableReport[field].filter((_, idx) => idx !== index);
    setEditableReport({
      ...editableReport,
      [field]: updatedList,
    });
  };

  return (
    <AuthGuard role="trainer">
      {/* CSS para Impressão limpa do PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-container, #printable-report-container * {
            visibility: visible;
          }
          #printable-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            box-shadow: none;
            padding: 0;
            margin: 0;
          }
          /* Esconder botões de ação e rodapé gerado pelo navegador */
          #printable-report-container button,
          #printable-report-container .flex.gap-3 {
            display: none !important;
          }
        }
      `}</style>

      <main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-3">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[#fcfdff] p-4 shadow-[var(--shadow)] sm:p-6">
          
          {/* Cabeçalho */}
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2d6f99]">Módulo Pedagógico</p>
              <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">Relatórios de Evolução</h1>
              <p className="text-xs text-[var(--muted)]">Gere e edite relatórios mensais automáticos para os tutores.</p>
            </div>
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[#145a82]"
              aria-label="Voltar ao início"
            >
              ✕
            </Link>
          </header>

          {/* Seletores */}
          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Configurar Geração</h2>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                Cliente (Tutor)
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
                >
                  <option value="">Selecione...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                Cão (Aluno)
                <select
                  value={selectedDogId}
                  onChange={(e) => setSelectedDogId(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
                  disabled={clientDogs.length === 0}
                >
                  <option value="">Selecione...</option>
                  {clientDogs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} • {d.breed}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                Período
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading || !selectedDogId}
              className={`pc-primary-action rounded-xl py-2.5 text-xs font-bold mt-2 ${
                loading ? "opacity-75" : ""
              }`}
            >
              {loading ? "Calculando evolução..." : "Gerar Relatório de Evolução"}
            </button>
          </div>

          {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {successMsg && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMsg}</p>}

          {editableReport && (
            <div className="mt-6 space-y-6">
              
              {/* Seção de Edição do Relatório */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#145a82] border-b border-sky-100 pb-2 mb-4">Ajustes Finos (Editor)</h3>
                
                <div className="space-y-4">
                  
                  {/* Conceito Geral e Progresso */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                      Conceito Geral
                      <select
                        value={editableReport.overallGrade}
                        onChange={(e) => setEditableReport({ ...editableReport, overallGrade: e.target.value })}
                        className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)]"
                      >
                        <option value="A">A - Excelente</option>
                        <option value="B">B - Bom</option>
                        <option value="C">C - Regular</option>
                        <option value="D">D - Insuficiente</option>
                        <option value="F">F - Crítico</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                      Evolução (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editableReport.progressPercentage}
                        onChange={(e) => setEditableReport({ ...editableReport, progressPercentage: Number(e.target.value) })}
                        className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)]"
                      />
                    </label>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Destaques do Mês</span>
                      <button
                        type="button"
                        onClick={() => handleAddListItem("highlights")}
                        className="text-[10px] font-bold text-[#145a82] hover:underline"
                      >
                        + Adicionar Destaque
                      </button>
                    </div>
                    {editableReport.highlights.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateList("highlights", idx, e.target.value)}
                          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveListItem("highlights", idx)}
                          className="text-rose-600 text-xs px-2 hover:bg-rose-50 rounded-lg py-1.5"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Areas For Improvement List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Áreas para Melhoria</span>
                      <button
                        type="button"
                        onClick={() => handleAddListItem("areasForImprovement")}
                        className="text-[10px] font-bold text-[#145a82] hover:underline"
                      >
                        + Adicionar Melhoria
                      </button>
                    </div>
                    {editableReport.areasForImprovement.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateList("areasForImprovement", idx, e.target.value)}
                          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveListItem("areasForImprovement", idx)}
                          className="text-rose-600 text-xs px-2 hover:bg-rose-50 rounded-lg py-1.5"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Next Objectives List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Objetivos do Próximo Mês</span>
                      <button
                        type="button"
                        onClick={() => handleAddListItem("nextObjectives")}
                        className="text-[10px] font-bold text-[#145a82] hover:underline"
                      >
                        + Adicionar Objetivo
                      </button>
                    </div>
                    {editableReport.nextObjectives.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateList("nextObjectives", idx, e.target.value)}
                          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveListItem("nextObjectives", idx)}
                          className="text-rose-600 text-xs px-2 hover:bg-rose-50 rounded-lg py-1.5"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Next Steps */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Dever de Casa / Recomendações</span>
                      <button
                        type="button"
                        onClick={() => handleAddListItem("recommendedNextSteps")}
                        className="text-[10px] font-bold text-[#145a82] hover:underline"
                      >
                        + Adicionar Passo
                      </button>
                    </div>
                    {editableReport.recommendedNextSteps.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateList("recommendedNextSteps", idx, e.target.value)}
                          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveListItem("recommendedNextSteps", idx)}
                          className="text-rose-600 text-xs px-2 hover:bg-rose-50 rounded-lg py-1.5"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Pré-visualização do Relatório Oficial */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Pré-visualização do Relatório</h3>
                
                <div id="printable-report-container" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <MonthlyReport
                    report={editableReport}
                    onDownloadPDF={() => window.print()}
                  />
                </div>
              </div>

            </div>
          )}

        </section>
      </main>
    </AuthGuard>
  );
}
