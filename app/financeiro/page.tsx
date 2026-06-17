"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";
import { buildPixPayload, isPixKey } from "@/lib/pix";
import { copyToClipboard } from "@/lib/native-share";

type PackageInfo = {
  id: string;
  name: string;
  type: string;
  sessionsCount: number;
  amount: number;
  isFractioned: boolean;
  fractionSessions: number;
  status: "Ativo" | "Inativo";
};

type InvoiceInfo = {
  id: string;
  clientName: string;
  dogName: string;
  packageName: string;
  amount: number;
  dueDate: string;
  status: "Pago" | "Pendente" | "Atrasado";
  method?: string;
  paidAt?: string;
};

type OverviewStats = {
  metrics: {
    received: number;
    pending: number;
    overdue: number;
    activeContracts: number;
  };
  previsibilidade: {
    totalContracted: number;
    recurrenceRate: number;
    averageTicket: number;
  };
};

// Parser tolerante p/ datas do financeiro (ISO YYYY-MM-DD, DD/MM/YYYY ou Date).
function parseFinDate(value?: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  let d: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(`${v.slice(0, 10)}T00:00:00`);
  else {
    const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    d = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`) : new Date(v);
  }
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function FinanceiroPage() {
  const clients = useAppStore((state) => state.clients);
  const trainerName = useAppStore((state) => state.trainerName);
  const pixKey = useAppStore((state) => state.trainerPaymentProfile.pixKey);

  const [activeTab, setActiveTab] = useState<"dashboard" | "pacotes" | "cobrancas" | "recibos" | "extrato">("dashboard");
  const [pixCopied, setPixCopied] = useState(false);

  // Extrato: filtros de período
  const [extratoPeriod, setExtratoPeriod] = useState<"dia" | "semana" | "mes" | "intervalo">("mes");
  const [extratoStart, setExtratoStart] = useState("");
  const [extratoEnd, setExtratoEnd] = useState("");

  // Estados carregados do Backend
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    metrics: { received: 0, pending: 0, overdue: 0, activeContracts: 0 },
    previsibilidade: { totalContracted: 0, recurrenceRate: 100, averageTicket: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Formulário: Novo Pacote
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgSessions, setNewPkgSessions] = useState(8);
  const [newPkgAmount, setNewPkgAmount] = useState(320);
  const [newPkgFractioned, setNewPkgFractioned] = useState(false);
  const [newPkgFractionSessions, setNewPkgFractionSessions] = useState(4);

  // Formulário: Vender Pacote (Novo Contrato)
  const [showContractForm, setShowContractForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [contractNotes, setContractNotes] = useState("");
  // Ajustes na venda — pré-preenchidos pelo pacote, mas editáveis por venda.
  const [saleSessions, setSaleSessions] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [saleFractioned, setSaleFractioned] = useState(false);
  const [saleFractionSessions, setSaleFractionSessions] = useState(1);

  // Ao escolher um pacote, copia os valores dele para os campos editáveis.
  function selectPackageForSale(pkgId: string) {
    setSelectedPackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      setSaleSessions(pkg.sessionsCount);
      setSaleAmount(pkg.amount);
      setSaleFractioned(pkg.isFractioned);
      setSaleFractionSessions(pkg.fractionSessions || 1);
    }
  }

  // Estado do Recibo
  const [receiptClient, setReceiptClient] = useState("");
  const [receiptDog, setReceiptDog] = useState("");
  const [receiptService, setReceiptService] = useState("");
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [receiptMethod, setReceiptMethod] = useState("Pix");
  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(1);

  // Função para carregar dados
  async function loadFinancials() {
    setLoading(true);
    try {
      const [pkgRes, invRes, statsRes] = await Promise.all([
        fetch("/api/finance/packages"),
        fetch("/api/finance/invoices"),
        fetch("/api/finance/overview"),
      ]);

      if (pkgRes.ok) setPackages(await pkgRes.json());
      if (invRes.ok) setInvoices(await invRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      setError("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinancials();
  }, []);

  // Filtrar cães do cliente selecionado no form de venda
  const currentClient = clients.find((c) => c.id === selectedClientId);
  const clientDogs = currentClient?.dogs ?? [];

  useEffect(() => {
    if (clientDogs.length > 0) {
      setSelectedDogId(clientDogs[0].id);
    } else {
      setSelectedDogId("");
    }
  }, [selectedClientId, clientDogs]);

  // Handler: Cadastrar Pacote de Serviço
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName || newPkgSessions <= 0 || newPkgAmount <= 0) return;
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/finance/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPkgName,
          sessionsCount: newPkgSessions,
          amount: newPkgAmount,
          isFractioned: newPkgFractioned,
          fractionSessions: newPkgFractioned ? newPkgFractionSessions : 1,
        }),
      });

      if (!res.ok) throw new Error();
      setMessage("Pacote cadastrado com sucesso!");
      setShowPackageForm(false);
      setNewPkgName("");
      loadFinancials();
    } catch {
      setError("Falha ao salvar pacote.");
    }
  };

  // Handler: Vender Pacote (Novo Contrato)
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedPackageId || !contractStartDate) return;
    setError("");
    setMessage("");

    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;

    try {
      const res = await fetch("/api/finance/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          dogId: selectedDogId || undefined,
          packageId: selectedPackageId,
          name: pkg.name,
          sessionsCount: saleSessions || pkg.sessionsCount,
          amount: saleAmount || pkg.amount,
          isFractioned: saleFractioned,
          fractionSessions: saleFractioned ? (saleFractionSessions || 1) : 1,
          startDate: contractStartDate,
          notes: contractNotes,
        }),
      });

      if (!res.ok) throw new Error();
      setMessage("Venda registrada! Faturas geradas.");
      setShowContractForm(false);
      setContractNotes("");
      loadFinancials();
    } catch {
      setError("Falha ao registrar venda de pacote.");
    }
  };

  // Handler: Enviar cobrança via WhatsApp (wa.me deeplink)
  const handleSendChargeReminder = (inv: InvoiceInfo) => {
    const client = clients.find((c) => c.name === inv.clientName);
    if (!client?.phone) {
      setError("Tutor sem WhatsApp cadastrado para envio da cobrança.");
      return;
    }
    const today = new Date();
    const due = new Date(inv.dueDate.split("/").reverse().join("-"));
    const overdueDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const message = overdueDays > 0
      ? waTemplates.cobrancaAtrasada({ tutor: inv.clientName, valor: inv.amount.toFixed(2), diasAtraso: overdueDays })
      : waTemplates.cobrancaPendente({ tutor: inv.clientName, valor: inv.amount.toFixed(2), data: inv.dueDate });
    window.open(buildWaUrl(client.phone, message), "_blank", "noopener,noreferrer");
  };

  // Handler: Enviar recibo via WhatsApp
  const handleSendReceiptViaWhats = () => {
    const client = clients.find((c) => c.name === receiptClient);
    if (!client?.phone) {
      setError("Tutor sem WhatsApp cadastrado para envio do recibo.");
      return;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const message = waTemplates.reciboPagamento({
      tutor: receiptClient,
      valor: receiptAmount.toFixed(2),
      servico: receiptService,
      link: `${baseUrl}/financeiro`,
    });
    window.open(buildWaUrl(client.phone, message), "_blank", "noopener,noreferrer");
  };

  // Handler: Atualizar Status da Fatura (Liquidar)
  const handleUpdateInvoiceStatus = async (invoiceId: string, status: "Pago" | "Pendente" | "Atrasado", method?: string) => {
    setError("");
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, status, paymentMethod: method }),
      });

      if (!res.ok) throw new Error();
      loadFinancials();
    } catch {
      setError("Falha ao atualizar cobrança.");
    }
  };

  // Preencher dados do recibo a partir de uma fatura paga
  const handlePrefillReceipt = (inv: InvoiceInfo) => {
    setReceiptClient(inv.clientName);
    setReceiptDog(inv.dogName);
    setReceiptService(inv.packageName);
    setReceiptAmount(inv.amount);
    setReceiptMethod(inv.method || "Pix");
    setActiveTab("recibos");
    setReceiptGenerated(true);
  };

  const handleGenerateReceiptManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptClient || !receiptDog || !receiptService || receiptAmount <= 0) return;
    setReceiptNumber((prev) => prev + 1);
    setReceiptGenerated(true);
  };

  return (
    <AuthGuard role="trainer">
      {/* CSS para Impressão limpa no PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 24px;
            background: white;
            box-shadow: none;
          }
        }
      `}</style>

      <main className="page">
        <header className="page-header">
          <div className="page-header-actions">
            <div className="min-w-0">
              <p className="text-eyebrow mb-1.5">Financeiro</p>
              <h1 className="text-display">Painel Financeiro</h1>
              <p className="mt-1 text-subtitle">Controle de faturamento, pacotes, cobranças e recibos.</p>
            </div>
          </div>
        </header>

        <div data-tour="finance-tabs" className="mb-4 tabs">
          {[
            { id: "dashboard", label: "Faturamento" },
            { id: "pacotes", label: "Pacotes" },
            { id: "cobrancas", label: "Cobranças" },
            { id: "extrato", label: "Extrato" },
            { id: "recibos", label: "Recibos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-active={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setReceiptGenerated(false);
              }}
              className="tab-trigger"
            >
              {tab.label}
            </button>
          ))}
        </div>

          {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {message && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

          {loading ? (
            <p className="text-center text-xs text-[var(--muted)] py-12">Carregando painel financeiro...</p>
          ) : (
            <>
              {/* ─── TAB: DASHBOARD (FATURAMENTO) ─────────────────────────────────── */}
              {activeTab === "dashboard" && (
                <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                  
                  {/* Grid de faturamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.19em] text-emerald-800">💰 Recebido</span>
                      <p className="mt-1 text-xl font-bold text-emerald-950">R$ {stats.metrics.received.toFixed(2)}</p>
                      <span className="text-[9px] text-emerald-700">Parcelas quitadas</span>
                    </article>
                    <article className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.19em] text-sky-800">⏳ A Receber</span>
                      <p className="mt-1 text-xl font-bold text-sky-950">R$ {stats.metrics.pending.toFixed(2)}</p>
                      <span className="text-[9px] text-sky-700">Faturas em aberto</span>
                    </article>
                    <article className="rounded-md border border-rose-100 bg-rose-50/50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.19em] text-rose-800">🔴 Em Atraso</span>
                      <p className="mt-1 text-xl font-bold text-rose-950">R$ {stats.metrics.overdue.toFixed(2)}</p>
                      <span className="text-[9px] text-rose-700">Faturas vencidas</span>
                    </article>
                    <article className="rounded-md border border-purple-100 bg-purple-50/50 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.19em] text-purple-800">📦 Contratos</span>
                      <p className="mt-1 text-xl font-bold text-purple-950">{stats.metrics.activeContracts} Ativos</p>
                      <span className="text-[9px] text-purple-700">Pacotes ativos vendidos</span>
                    </article>
                  </div>

                  {/* Previsibilidade */}
                  <article className="rounded-md border border-slate-100 bg-white p-4 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Previsão Comercial</h3>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-[var(--muted)]">Total Contratado</p>
                        <p className="text-sm font-bold text-slate-900">R$ {stats.previsibilidade.totalContracted.toFixed(2)}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                      <div>
                        <p className="text-xs text-[var(--muted)]">Taxa de Recorrência</p>
                        <p className="text-sm font-bold text-emerald-600">{stats.previsibilidade.recurrenceRate}%</p>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                      <div>
                        <p className="text-xs text-[var(--muted)]">Ticket Médio</p>
                        <p className="text-sm font-bold text-slate-900">R$ {stats.previsibilidade.averageTicket.toFixed(2)}</p>
                      </div>
                    </div>
                  </article>

                  {/* Venda de Pacote Rápida */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Vendas de Pacotes</h3>
                    <button
                      type="button"
                      onClick={() => setShowContractForm(!showContractForm)}
                      className="rounded-full bg-[var(--accent)] px-3.5 py-1 text-xs font-bold text-white shadow-xs"
                    >
                      {showContractForm ? "Fechar" : "+ Vender Pacote"}
                    </button>
                  </div>

                  {showContractForm && (
                    <form onSubmit={handleCreateContract} className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 animate-in slide-in-from-top-4 duration-200">
                      <h4 className="text-xs font-bold text-[var(--foreground)]">Nova Venda de Pacote</h4>
                      
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Cliente (Tutor)
                          <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            required
                            className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          >
                            <option value="">Selecione...</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Cão
                          <select
                            value={selectedDogId}
                            onChange={(e) => setSelectedDogId(e.target.value)}
                            required
                            className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          >
                            <option value="">Selecione...</option>
                            {clientDogs.map((d) => (
                              <option key={d.id} value={d.id}>{d.name} • {d.breed}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Pacote de Serviço
                          <select
                            value={selectedPackageId}
                            onChange={(e) => selectPackageForSale(e.target.value)}
                            required
                            className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          >
                            <option value="">Selecione...</option>
                            {packages.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} (R$ {p.amount})</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Data de Início
                          <input
                            type="date"
                            value={contractStartDate}
                            onChange={(e) => setContractStartDate(e.target.value)}
                            required
                            className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          />
                        </label>
                      </div>

                      {selectedPackageId && (
                        <div className="grid gap-2 rounded-md border border-dashed border-[var(--border)] bg-white/60 p-2.5">
                          <p className="text-[10px] font-bold uppercase text-[var(--muted)]">Ajustes desta venda</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                              Nº de Sessões
                              <input
                                type="number"
                                min={1}
                                value={saleSessions}
                                onChange={(e) => setSaleSessions(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                              />
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                              Valor Total (R$)
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={saleAmount}
                                onChange={(e) => setSaleAmount(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                              />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                            <input
                              type="checkbox"
                              checked={saleFractioned}
                              onChange={(e) => setSaleFractioned(e.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            Cobrança fracionada
                          </label>
                          {saleFractioned && (
                            <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                              Cobrar a cada X sessões
                              <input
                                type="number"
                                min={1}
                                value={saleFractionSessions}
                                onChange={(e) => setSaleFractionSessions(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                              />
                            </label>
                          )}
                        </div>
                      )}

                      <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                        Observações da Venda
                        <input
                          type="text"
                          value={contractNotes}
                          onChange={(e) => setContractNotes(e.target.value)}
                          placeholder="Ajustes no cronograma, acordos, etc."
                          className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                        />
                      </label>

                      <button type="submit" className="pc-primary-action rounded-md py-2 text-xs font-bold mt-1">
                        Confirmar Venda e Gerar Cobranças
                      </button>
                    </form>
                  )}

                  {/* Transações Recentes */}
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Cobranças Recentes</h3>
                    {invoices.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] py-4">Nenhuma cobrança registrada.</p>
                    ) : (
                      invoices.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center rounded-md border border-slate-100 bg-white p-3 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{inv.clientName} ({inv.dogName})</p>
                            <p className="text-[10px] text-[var(--muted)]">{inv.packageName} • Vence em {inv.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">R$ {inv.amount.toFixed(2)}</p>
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[8.5px] font-bold ${
                              inv.status === "Pago" ? "bg-emerald-100 text-emerald-800" :
                              inv.status === "Atrasado" ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-900"
                            }`}>{inv.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                </div>
              )}

              {/* ─── TAB: PACOTES ─────────────────────────────────────────────────── */}
              {activeTab === "pacotes" && (
                <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pacotes Disponíveis</span>
                    <button
                      type="button"
                      onClick={() => setShowPackageForm(!showPackageForm)}
                      className="rounded-full bg-[var(--accent)] px-3.5 py-1 text-xs font-bold text-white shadow-xs"
                    >
                      {showPackageForm ? "Fechar" : "+ Novo Pacote"}
                    </button>
                  </div>

                  {showPackageForm && (
                    <form onSubmit={handleCreatePackage} className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 animate-in slide-in-from-top-4 duration-200">
                      <h4 className="text-xs font-bold text-[var(--foreground)]">Configurar Novo Pacote</h4>
                      
                      <input
                        type="text"
                        required
                        placeholder="Nome do pacote (ex: Pacote Básico 4 aulas)"
                        value={newPkgName}
                        onChange={(e) => setNewPkgName(e.target.value)}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Sessões
                          <input
                            type="number"
                            min={1}
                            required
                            value={newPkgSessions}
                            onChange={(e) => setNewPkgSessions(Number(e.target.value))}
                            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                          />
                        </label>

                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Valor Cobrado (R$)
                          <input
                            type="number"
                            min={1}
                            required
                            value={newPkgAmount}
                            onChange={(e) => setNewPkgAmount(Number(e.target.value))}
                            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                          />
                        </label>
                      </div>

                      <div className="rounded-md bg-white p-3 border border-slate-100">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPkgFractioned}
                            onChange={(e) => setNewPkgFractioned(e.target.checked)}
                            className="rounded border-[var(--border)] text-[var(--foreground)]"
                          />
                          Cobrança Fracionada (Parcelado)
                        </label>

                        {newPkgFractioned && (
                          <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)] mt-2">
                            Cobrar a cada X sessões
                            <input
                              type="number"
                              min={1}
                              value={newPkgFractionSessions}
                              onChange={(e) => setNewPkgFractionSessions(Number(e.target.value))}
                              className="rounded-md border border-[var(--border)] bg-slate-50 px-3 py-1.5 text-xs outline-none"
                            />
                          </label>
                        )}
                      </div>

                      <button type="submit" className="pc-primary-action rounded-md py-2 text-xs font-bold mt-1">
                        Salvar Serviço
                      </button>
                    </form>
                  )}

                  <div className="grid gap-2">
                    {packages.map((pkg) => (
                      <article key={pkg.id} className="rounded-md border border-slate-100 bg-white p-3.5 flex items-center justify-between text-xs shadow-xs">
                        <div>
                          <h4 className="font-bold text-slate-900">{pkg.name}</h4>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">
                            {pkg.sessionsCount} sessões • Cobrança parcelada: {pkg.isFractioned ? `A cada ${pkg.fractionSessions} aulas` : "Não"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[var(--foreground)]">R$ {pkg.amount.toFixed(2)}</p>
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[8.5px] font-bold text-sky-800">{pkg.status}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB: COBRANÇAS (LISTAGEM & LIQUIDAÇÃO) ─────────────────────────── */}
              {activeTab === "cobrancas" && (
                <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Listagem de Parcelas Emitidas</span>
                  
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="rounded-md border border-slate-100 bg-white p-3.5 flex flex-col gap-2.5 shadow-xs">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{inv.clientName} ({inv.dogName})</p>
                            <p className="text-[10px] text-[var(--muted)] mt-0.5">{inv.packageName}</p>
                            <p className="text-[9px] text-[var(--muted)]">Vencimento: {inv.dueDate} {inv.method && `• Pago via ${inv.method}`}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-950">R$ {inv.amount.toFixed(2)}</p>
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 ${
                              inv.status === "Pago" ? "bg-emerald-100 text-emerald-800" :
                              inv.status === "Atrasado" ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-900"
                            }`}>{inv.status}</span>
                          </div>
                        </div>

                        {/* Ações de cobrança */}
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2 text-[10px]">
                          {inv.status !== "Pago" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, "Pago", "PIX")}
                                className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 py-1 font-bold text-center"
                              >
                                Pagar via PIX
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, "Pago", "Dinheiro")}
                                className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 py-1 font-bold text-center"
                              >
                                Pago (Dinheiro)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendChargeReminder(inv)}
                                className="flex-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] text-sky-700 py-1 font-bold text-center"
                                title="Enviar cobrança via WhatsApp"
                              >
                                💬 Lembrar
                              </button>
                              {inv.status !== "Atrasado" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInvoiceStatus(inv.id, "Atrasado")}
                                  className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 font-bold"
                                >
                                  Atrasar
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrefillReceipt(inv)}
                                className="flex-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] text-[var(--foreground)] py-1 font-bold"
                              >
                                Emitir Recibo Oficial
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, "Pendente")}
                                className="rounded-lg bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1"
                              >
                                Reabrir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB: EXTRATO (HISTÓRICO COM FILTROS) ────────────────────────── */}
              {activeTab === "extrato" && (() => {
                // Define o intervalo conforme o período escolhido.
                const now = new Date();
                let start: Date;
                let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                if (extratoPeriod === "dia") {
                  start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                } else if (extratoPeriod === "semana") {
                  start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                } else if (extratoPeriod === "mes") {
                  start = new Date(now.getFullYear(), now.getMonth(), 1);
                  end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                } else {
                  start = parseFinDate(extratoStart) ?? new Date(now.getFullYear(), now.getMonth(), 1);
                  end = parseFinDate(extratoEnd) ?? end;
                  end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
                }

                const rows = invoices
                  .map((inv) => ({ inv, ref: parseFinDate(inv.paidAt || inv.dueDate) }))
                  .filter((r) => r.ref && r.ref >= start && r.ref <= end)
                  .sort((a, b) => (b.ref!.getTime() - a.ref!.getTime()));

                const totalRecebido = rows.filter((r) => r.inv.status === "Pago").reduce((s, r) => s + r.inv.amount, 0);
                const totalPendente = rows.filter((r) => r.inv.status === "Pendente").reduce((s, r) => s + r.inv.amount, 0);
                const totalAtraso = rows.filter((r) => r.inv.status === "Atrasado").reduce((s, r) => s + r.inv.amount, 0);

                return (
                  <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-end gap-2">
                      {([
                        { id: "dia", label: "Hoje" },
                        { id: "semana", label: "7 dias" },
                        { id: "mes", label: "Este mês" },
                        { id: "intervalo", label: "Intervalo" },
                      ] as const).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setExtratoPeriod(p.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${extratoPeriod === p.id ? "border-sky-400 bg-sky-50 text-sky-800" : "border-[var(--border)] text-[var(--muted)]"}`}
                        >
                          {p.label}
                        </button>
                      ))}
                      {extratoPeriod === "intervalo" && (
                        <div className="flex items-center gap-2">
                          <input type="date" value={extratoStart} onChange={(e) => setExtratoStart(e.target.value)} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs" />
                          <span className="text-xs text-[var(--muted)]">até</span>
                          <input type="date" value={extratoEnd} onChange={(e) => setExtratoEnd(e.target.value)} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs" />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-emerald-700">Recebido</p>
                        <p className="mt-1 text-lg font-bold text-emerald-800">R$ {totalRecebido.toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-amber-700">Pendente</p>
                        <p className="mt-1 text-lg font-bold text-amber-800">R$ {totalPendente.toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-rose-700">Em atraso</p>
                        <p className="mt-1 text-lg font-bold text-rose-800">R$ {totalAtraso.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--border)] bg-white">
                      {rows.length === 0 ? (
                        <p className="p-6 text-center text-xs text-[var(--muted)]">Nenhuma transação no período selecionado.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {rows.map(({ inv, ref }) => (
                            <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-900">{inv.clientName} · {inv.dogName}</p>
                                <p className="truncate text-[11px] text-[var(--muted)]">{inv.packageName} · {ref?.toLocaleDateString("pt-BR")}{inv.method ? ` · ${inv.method}` : ""}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">R$ {inv.amount.toFixed(2)}</p>
                                <span className={`text-[10px] font-semibold ${inv.status === "Pago" ? "text-emerald-700" : inv.status === "Atrasado" ? "text-rose-700" : "text-amber-700"}`}>{inv.status}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ─── TAB: RECIBOS (IMPRESSÃO/PDF) ─────────────────────────────────── */}
              {activeTab === "recibos" && (
                <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                  
                  {!receiptGenerated ? (
                    <form onSubmit={handleGenerateReceiptManual} className="grid gap-3 rounded-md border border-slate-100 bg-white p-4 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Emitir Recibo Manual</h3>
                      
                      <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                        Tutor (Dono)
                        <input
                          type="text"
                          required
                          placeholder="Nome do cliente"
                          value={receiptClient}
                          onChange={(e) => setReceiptClient(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                        Cão (Animal)
                        <input
                          type="text"
                          required
                          placeholder="Nome do cão"
                          value={receiptDog}
                          onChange={(e) => setReceiptDog(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Serviço Prestado
                          <input
                            type="text"
                            required
                            placeholder="Ex: Treino de Comportamento"
                            value={receiptService}
                            onChange={(e) => setReceiptService(e.target.value)}
                            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                          />
                        </label>

                        <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                          Valor Cobrado (R$)
                          <input
                            type="number"
                            min={1}
                            required
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(Number(e.target.value))}
                            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                        Forma de Pagamento
                        <select
                          value={receiptMethod}
                          onChange={(e) => setReceiptMethod(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                        >
                          <option value="Pix">Pix</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Transferência">Transferência Bancária</option>
                        </select>
                      </label>

                      <button type="submit" className="pc-primary-action rounded-md py-2.5 text-xs font-bold mt-2">
                        Gerar Recibo Oficial
                      </button>
                    </form>
                  ) : (
                    <div className="grid gap-4 bg-white p-5 animate-in zoom-in-95 duration-200">
                      
                      {/* Recibo Layout para Impressão */}
                      <div id="printable-receipt" className="border-2 border-dashed border-[#145a82]/40 bg-white p-6 rounded-md">
                        <div className="border-b border-slate-100 pb-3.5 text-center">
                          <h3 className="text-lg font-bold text-[var(--foreground)]">RECIBO DE PAGAMENTO</h3>
                          <p className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">Recibo Nº {receiptNumber}</p>
                        </div>

                        <div className="space-y-3.5 text-xs text-slate-800 mt-4 leading-relaxed">
                          <p>Recebemos de <strong className="text-slate-900">{receiptClient}</strong>, tutor(a) responsável pelo cão <strong className="text-slate-900">{receiptDog}</strong>.</p>
                          <p>A importância líquida de <strong className="text-slate-900">R$ {receiptAmount.toFixed(2)}</strong> referente à prestação de serviços de adestramento comportamental canino: <span className="font-semibold text-[var(--foreground)]">{receiptService}</span>.</p>
                          <p>Pagamento quitado via <strong className="text-slate-900">{receiptMethod}</strong> em {new Date().toLocaleDateString("pt-BR")}.</p>
                        </div>

                        {receiptMethod === "Pix" && pixKey && isPixKey(pixKey) ? (
                          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs">
                            <p className="font-bold text-emerald-900">Pix Copia e Cola</p>
                            <p className="mt-0.5 text-[10px] text-emerald-700">
                              O tutor cola no banco e o pagamento já vem preenchido — sem gateway pago.
                            </p>
                            <code className="mt-2 block break-all rounded-lg bg-white px-2 py-1.5 text-[10px] text-emerald-950">
                              {buildPixPayload({
                                pixKey,
                                merchantName: trainerName || "Adestrador",
                                merchantCity: "BRASIL",
                                amount: receiptAmount,
                                txid: `ADESTRO${receiptNumber}`,
                                description: receiptService.slice(0, 40),
                              })}
                            </code>
                            <button
                              type="button"
                              onClick={async () => {
                                const payload = buildPixPayload({
                                  pixKey,
                                  merchantName: trainerName || "Adestrador",
                                  merchantCity: "BRASIL",
                                  amount: receiptAmount,
                                  txid: `ADESTRO${receiptNumber}`,
                                  description: receiptService.slice(0, 40),
                                });
                                const ok = await copyToClipboard(payload);
                                setPixCopied(ok);
                                window.setTimeout(() => setPixCopied(false), 2500);
                              }}
                              className="mt-2 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white"
                            >
                              {pixCopied ? "✓ Copiado!" : "Copiar Pix"}
                            </button>
                          </div>
                        ) : null}

                        <div className="mt-8 border-t border-slate-100 pt-5 flex flex-col items-center justify-center text-[10px] text-[var(--muted)]">
                          <div className="h-0.5 w-36 bg-slate-200 mb-1" />
                          <p>Assinatura do Adestrador Canino</p>
                          <p className="mt-0.5 font-bold text-slate-900">Adestro CRM</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setReceiptGenerated(false)}
                          className="rounded-md border border-[var(--border)] py-2 text-center text-xs font-bold text-[var(--muted)]"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="rounded-md border border-[#145a82] bg-white py-2 text-center text-xs font-bold text-[var(--foreground)]"
                        >
                          🖨️ PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleSendReceiptViaWhats}
                          className="rounded-md bg-emerald-600 py-2 text-center text-xs font-bold text-white"
                        >
                          💬 WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
      </main>
    </AuthGuard>
  );
}
