"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { MonthlyComparison } from "@/components/monthly-comparison";
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

  // #11 — persistência/ciclo de vida dos relatórios
  type SavedReport = { id: string; dogId: string; month: string; status: string; sentAt: string | null; updatedAt: string; content: GeneratedReport };
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [savingReport, setSavingReport] = useState(false);

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

  async function loadSavedReports(dogId: string) {
    if (!dogId) {
      setSavedReports([]);
      return;
    }
    try {
      const res = await fetch(`/api/relatorios?dogId=${dogId}`, { cache: "no-store" });
      if (!res.ok) return;
      setSavedReports((await res.json()) as SavedReport[]);
    } catch {
      // silencioso — listagem é secundária
    }
  }

  useEffect(() => {
    loadSavedReports(selectedDogId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDogId]);

  async function handleSaveReport(status: "Rascunho" | "Aguardando" | "Enviado") {
    if (!editableReport || !selectedDogId) return;
    setSavingReport(true);
    setError("");
    try {
      const res = await fetch("/api/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dogId: selectedDogId, month: editableReport.month, status, content: editableReport }),
      });
      if (!res.ok) throw new Error("Falha ao salvar o relatório.");
      setSuccessMsg(
        status === "Enviado"
          ? "Relatório aprovado e marcado como enviado."
          : status === "Aguardando"
          ? "Relatório salvo (aguardando aprovação)."
          : "Rascunho salvo.",
      );
      window.setTimeout(() => setSuccessMsg(""), 3000);
      await loadSavedReports(selectedDogId);
    } catch (err: any) {
      setError(err.message || "Falha ao salvar.");
    } finally {
      setSavingReport(false);
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

      <main className="page">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
          
          {/* Cabeçalho */}
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Módulo Pedagógico</p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Relatórios de Evolução</h1>
              <p className="text-xs text-[var(--muted)]">Gere e edite relatórios mensais automáticos para os clientes.</p>
            </div>
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
              aria-label="Voltar ao início"
            >
              ✕
            </Link>
          </header>

          {/* Seletores */}
          <div className="mt-5 grid gap-3 rounded-md border border-slate-100 bg-white p-4 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Configurar Geração</h2>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                Cliente
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
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
                  className="rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
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
                  className="rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-xs text-[var(--foreground)] outline-none"
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
              className={`pc-primary-action rounded-md py-2.5 text-xs font-bold mt-2 ${
                loading ? "opacity-75" : ""
              }`}
            >
              {loading ? "Calculando evolução..." : "Gerar Relatório de Evolução"}
            </button>
          </div>

          {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {successMsg && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMsg}</p>}

          {editableReport && (
            <div className="mt-6 space-y-6">
              
              {/* Seção de Edição do Relatório */}
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/30 p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2 mb-4">Ajustes Finos (Editor)</h3>
                
                <div className="space-y-4">
                  
                  {/* Conceito Geral e Progresso */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                      Conceito Geral
                      <select
                        value={editableReport.overallGrade}
                        onChange={(e) => setEditableReport({ ...editableReport, overallGrade: e.target.value })}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)]"
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
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)]"
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
                        className="text-[10px] font-bold text-[var(--foreground)] hover:underline"
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
                          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
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
                        className="text-[10px] font-bold text-[var(--foreground)] hover:underline"
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
                          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
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
                        className="text-[10px] font-bold text-[var(--foreground)] hover:underline"
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
                          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
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
                        className="text-[10px] font-bold text-[var(--foreground)] hover:underline"
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
                          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
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
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-3">Pré-visualização do Relatório</h3>
                
                <div id="printable-report-container" className="rounded-md border border-slate-100 bg-white p-4 shadow-sm">
                  <MonthlyReport
                    report={editableReport}
                    onDownloadPDF={() => window.print()}
                  />
                </div>

                {/* #11 — salvar / aprovar relatório (ciclo de vida) */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveReport("Rascunho")}
                    disabled={savingReport}
                    className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--muted)] disabled:opacity-60"
                  >
                    Salvar rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveReport("Aguardando")}
                    disabled={savingReport}
                    className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-60"
                  >
                    Marcar p/ aprovação
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveReport("Enviado")}
                    disabled={savingReport}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {savingReport ? "Salvando..." : "Aprovar e marcar enviado"}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* #11 — Relatórios salvos deste cão */}
          {selectedDogId && savedReports.length > 0 ? (
            <div className="mt-4 rounded-md border border-[var(--border)] bg-white p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Relatórios salvos</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {savedReports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{r.month}</p>
                      <p className="text-[11px] text-[var(--muted)]">
                        Atualizado em {new Date(r.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.status === "Enviado"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "Aguardando"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReport(r.content);
                          setEditableReport({ ...r.content });
                          setSuccessMsg("Relatório salvo carregado para edição.");
                          window.setTimeout(() => setSuccessMsg(""), 2500);
                        }}
                        className="rounded-full border border-sky-300 px-3 py-1 text-[11px] font-semibold text-sky-700"
                      >
                        Abrir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Comparativo mês vs mês — só faz sentido quando há um cão selecionado */}
          {selectedDogId ? (
            <div className="mt-4">
              <MonthlyComparison
                dogId={selectedDogId}
                dogName={clientDogs.find((d) => d.id === selectedDogId)?.name ?? "Cão"}
              />
            </div>
          ) : null}

        </section>
      </main>
    </AuthGuard>
  );
}
