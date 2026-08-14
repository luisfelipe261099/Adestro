"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { DateField } from "@/components/date-field";
import { useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";
import { buildPixPayload, isPixKey } from "@/lib/pix";
import { copyToClipboard, nativeShare } from "@/lib/native-share";
import { buildReceiptPdf, receiptFileName, type ReceiptData } from "@/lib/receipt-pdf";

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
  const contractFormRef = useRef<HTMLFormElement | null>(null);
  // Recebimento por cartão: fatura com painel de taxa aberto + taxa digitada
  const [cardFeeFor, setCardFeeFor] = useState<string | null>(null);
  const [cardFeePct, setCardFeePct] = useState("");

  // Ao abrir a venda, rola até o formulário — sem isso ele abria fora da tela.
  useEffect(() => {
    if (!showContractForm) return;
    const id = requestAnimationFrame(() =>
      contractFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    return () => cancelAnimationFrame(id);
  }, [showContractForm]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  // ?vender=true (vindo da página do cliente ou do pós-cadastro) abre a venda
  // direto; ?clienteId=... já deixa o cliente selecionado no formulário.
  // Fatura destacada quando se chega por um link de cobrança (quadro do dia,
  // sino, resumo diário). Sem isso o link caía no painel e o adestrador tinha
  // de procurar de novo qual cobrança era.
  const [faturaDestacada, setFaturaDestacada] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("aba") === "cobrancas") {
      setActiveTab("cobrancas");
      const fatura = params.get("fatura");
      if (fatura) {
        setFaturaDestacada(fatura);
        // Rola até ela assim que a lista existir na tela.
        window.setTimeout(() => {
          document.getElementById(`fatura-${fatura}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 600);
      }
    }

    if (params.get("vender") !== "true") return;
    const preselectClientId = params.get("clienteId") ?? "";
    const id = window.setTimeout(() => {
      setActiveTab("dashboard");
      setShowContractForm(true);
      if (preselectClientId) setSelectedClientId(preselectClientId);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
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

  // Cadastro do adestrador — assina o recibo e identifica quem emitiu.
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    whatsapp: "",
    signatureUrl: "",
    businessName: "",
    businessDocument: "",
    logoUrl: "",
  });

  useEffect(() => {
    let cancelado = false;
    fetch("/api/trainer/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || cancelado) return;
        setProfile({
          name: d.name ?? "",
          email: d.email ?? "",
          whatsapp: d.whatsapp ?? "",
          signatureUrl: d.signatureUrl ?? "",
          businessName: d.businessName ?? "",
          businessDocument: d.businessDocument ?? "",
          logoUrl: d.logoUrl ?? "",
        });
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

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
      const criado = (await res.json().catch(() => null)) as { id?: string } | null;
      setMessage("Pacote cadastrado com sucesso!");
      setShowPackageForm(false);
      setNewPkgName("");
      await loadFinancials();
      return criado?.id ?? null;
    } catch {
      setError("Falha ao salvar pacote.");
      return null;
    }
  };

  // Pacote criado sem sair da venda.
  //
  // Antes, quem não tinha pacote precisava sair para a aba Pacotes, criar e
  // voltar — e voltava para o começo, perdendo a venda e o cliente escolhido.
  // Agora o formulário abre dentro da própria venda e o pacote recém-criado já
  // entra selecionado.
  const [criandoPacoteNaVenda, setCriandoPacoteNaVenda] = useState(false);
  const [pacoteInlineNome, setPacoteInlineNome] = useState("");
  const [pacoteInlineSessoes, setPacoteInlineSessoes] = useState(8);
  const [pacoteInlineValor, setPacoteInlineValor] = useState(0);
  const [salvandoPacoteInline, setSalvandoPacoteInline] = useState(false);

  async function criarPacoteNaVenda() {
    if (!pacoteInlineNome.trim() || pacoteInlineValor <= 0) {
      setError("Dê um nome e um valor ao pacote.");
      return;
    }
    setSalvandoPacoteInline(true);
    setError("");
    try {
      const res = await fetch("/api/finance/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pacoteInlineNome.trim(),
          sessionsCount: pacoteInlineSessoes,
          amount: pacoteInlineValor,
          isFractioned: false,
          fractionSessions: 1,
        }),
      });
      if (!res.ok) throw new Error();
      const criado = (await res.json()) as { id: string; sessionsCount: number; amount: number };
      await loadFinancials();
      // Já deixa selecionado: a venda continua exatamente de onde parou.
      setSelectedPackageId(criado.id);
      setSaleSessions(criado.sessionsCount ?? pacoteInlineSessoes);
      setSaleAmount(criado.amount ?? pacoteInlineValor);
      setSaleFractioned(false);
      setSaleFractionSessions(1);
      setCriandoPacoteNaVenda(false);
      setPacoteInlineNome("");
      setMessage("Pacote criado e selecionado nesta venda.");
    } catch {
      setError("Falha ao criar o pacote.");
    } finally {
      setSalvandoPacoteInline(false);
    }
  }

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
      // Terminada a venda, o próximo passo é cobrar: em vez de avisar e deixar
      // o adestrador procurar, a tela já abre as cobranças recém-geradas.
      setMessage("Venda registrada! As cobranças deste pacote estão abaixo.");
      setShowContractForm(false);
      setContractNotes("");
      await loadFinancials();
      setActiveTab("cobrancas");
    } catch {
      setError("Falha ao registrar venda de pacote.");
    }
  };

  // Handler: Enviar cobrança via WhatsApp (wa.me deeplink)
  const handleSendChargeReminder = (inv: InvoiceInfo) => {
    const client = clients.find((c) => c.name === inv.clientName);
    if (!client?.phone) {
      setError("Cliente sem WhatsApp cadastrado para envio da cobrança.");
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

  // Monta o recibo em PDF com os dados da tela e do cadastro do adestrador.
  const [gerandoPdf, setGerandoPdf] = useState(false);

  function dadosDoRecibo(): ReceiptData {
    return {
      numero: receiptNumber,
      cliente: receiptClient,
      cao: receiptDog,
      servico: receiptService,
      valor: receiptAmount,
      metodo: receiptMethod,
      data: new Date().toLocaleDateString("pt-BR"),
      adestrador: profile.name || trainerName || "Adestrador",
      negocio: profile.businessName || undefined,
      documento: profile.businessDocument || undefined,
      contato: [profile.whatsapp, profile.email].filter(Boolean).join(" · ") || undefined,
      assinatura: profile.signatureUrl || undefined,
      logo: profile.logoUrl || undefined,
    };
  }

  async function baixarReciboPdf() {
    setGerandoPdf(true);
    setError("");
    try {
      const dados = dadosDoRecibo();
      const blob = await buildReceiptPdf(dados);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = receiptFileName(dados);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível gerar o PDF do recibo.");
    } finally {
      setGerandoPdf(false);
    }
  }

  // Handler: Enviar recibo — manda o ARQUIVO, não um link.
  //
  // O link antigo apontava para /financeiro, que é a página do adestrador e
  // exige login: o cliente clicava e caía na tela de entrar. Agora o recibo vai
  // como PDF pelo compartilhamento do celular (WhatsApp aparece na lista); no
  // computador, onde não há compartilhamento nativo, o arquivo é baixado e o
  // WhatsApp Web abre com a mensagem pronta para anexá-lo.
  const handleSendReceiptViaWhats = async () => {
    const client = clients.find((c) => c.name === receiptClient);
    setError("");
    setGerandoPdf(true);
    try {
      const dados = dadosDoRecibo();
      const blob = await buildReceiptPdf(dados);
      const arquivo = new File([blob], receiptFileName(dados), { type: "application/pdf" });
      const texto = waTemplates.reciboPagamento({
        tutor: receiptClient,
        valor: receiptAmount.toFixed(2),
        servico: receiptService,
      });

      const compartilhou = await nativeShare({
        title: `Recibo ${receiptNumber}`,
        text: texto,
        files: [arquivo],
      });
      if (compartilhou) return;

      // Sem compartilhamento nativo: baixa o arquivo e abre a conversa.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (client?.phone) {
        window.open(buildWaUrl(client.phone, texto), "_blank", "noopener,noreferrer");
        setMessage("Recibo baixado. Anexe o PDF na conversa que acabou de abrir.");
      } else {
        setMessage("Recibo baixado. O cliente está sem WhatsApp cadastrado.");
      }
    } catch {
      setError("Não foi possível gerar o recibo em PDF.");
    } finally {
      setGerandoPdf(false);
    }
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
            {/* Vender é a ação nº 1 do financeiro — sempre visível no topo */}
            <button
              type="button"
              data-tour="finance-sell"
              onClick={() => {
                setActiveTab("dashboard");
                setShowContractForm(true);
              }}
              className="btn-primary text-[13px]"
            >
              💰 Vender Pacote
            </button>
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
                  {/* Os quatro números do mês. Cores vêm dos tokens do tema —
                      com as cores fixas do tema claro, estes cards saíam
                      lavados (texto escuro sobre fundo escuro) no modo noite. */}
                  <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-md border border-[var(--card-green-border)] bg-[var(--card-green-bg)] p-3.5">
                      <span className="text-[12px] font-bold uppercase tracking-[0.19em] text-[var(--card-green)]">Recebido</span>
                      <p className="mt-1 text-xl font-bold text-[var(--foreground)]">R$ {stats.metrics.received.toFixed(2)}</p>
                      <span className="text-[12px] text-[var(--muted-strong)]">Parcelas quitadas</span>
                    </article>
                    <article className="rounded-md border border-[var(--card-sky-border)] bg-[var(--card-sky-bg)] p-3.5">
                      <span className="text-[12px] font-bold uppercase tracking-[0.19em] text-[var(--card-sky)]">A Receber</span>
                      <p className="mt-1 text-xl font-bold text-[var(--foreground)]">R$ {stats.metrics.pending.toFixed(2)}</p>
                      <span className="text-[12px] text-[var(--muted-strong)]">Faturas em aberto</span>
                    </article>
                    <article className="rounded-md border border-[var(--card-orange-border)] bg-[var(--card-orange-bg)] p-3.5">
                      <span className="text-[12px] font-bold uppercase tracking-[0.19em] text-[var(--card-orange)]">Em Atraso</span>
                      <p className="mt-1 text-xl font-bold text-[var(--foreground)]">R$ {stats.metrics.overdue.toFixed(2)}</p>
                      <span className="text-[12px] text-[var(--muted-strong)]">Faturas vencidas</span>
                    </article>
                    <article className="rounded-md border border-[var(--card-purple-border)] bg-[var(--card-purple-bg)] p-3.5">
                      <span className="text-[12px] font-bold uppercase tracking-[0.19em] text-[var(--card-purple)]">Contratos</span>
                      <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{stats.metrics.activeContracts} Ativos</p>
                      <span className="text-[12px] text-[var(--muted-strong)]">Pacotes ativos vendidos</span>
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
                    <form ref={contractFormRef} onSubmit={handleCreateContract} className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 animate-in slide-in-from-top-4 duration-200">
                      <h4 className="text-xs font-bold text-[var(--foreground)]">Nova Venda de Pacote</h4>
                      {packages.length === 0 ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                          Você ainda não criou nenhum pacote de aulas. Primeiro cadastre o pacote (nome,
                          nº de sessões, valor e parcelamento) na aba <b>Pacotes</b> — depois é só vender
                          aqui que contrato e cobranças saem automáticos.{" "}
                          <button
                            type="button"
                            onClick={() => setActiveTab("pacotes")}
                            className="font-bold underline"
                          >
                            Criar pacote agora →
                          </button>
                        </div>
                      ) : null}
                      
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                          Cliente
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

                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                          <button
                            type="button"
                            onClick={() => setCriandoPacoteNaVenda((v) => !v)}
                            className="justify-self-start text-[12px] font-semibold normal-case text-[var(--accent-text)] hover:underline"
                          >
                            {criandoPacoteNaVenda
                              ? "Cancelar"
                              : packages.length === 0
                                ? "+ Criar o primeiro pacote aqui mesmo"
                                : "+ Criar um pacote novo aqui mesmo"}
                          </button>
                        </label>

                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                          Data de Início
                          <DateField
                            value={contractStartDate}
                            onChange={(e) => setContractStartDate(e.target.value)}
                            required
                            className="w-full"
                          />
                        </label>
                      </div>

                      {criandoPacoteNaVenda && (
                        <div className="grid gap-2 rounded-md border border-[var(--accent)] bg-[var(--surface)] p-3">
                          <p className="text-[12px] font-bold uppercase text-[var(--accent-text)]">Pacote novo</p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                              Nome
                              <input
                                value={pacoteInlineNome}
                                onChange={(e) => setPacoteInlineNome(e.target.value)}
                                placeholder="Ex: Pacote Pro — 8 aulas"
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-normal normal-case text-[var(--foreground)] outline-none"
                              />
                            </label>
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                              Sessões
                              <input
                                type="number"
                                min={1}
                                value={pacoteInlineSessoes}
                                onChange={(e) => setPacoteInlineSessoes(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-normal text-[var(--foreground)] outline-none"
                              />
                            </label>
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                              Valor (R$)
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={pacoteInlineValor}
                                onChange={(e) => setPacoteInlineValor(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-normal text-[var(--foreground)] outline-none"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={criarPacoteNaVenda}
                            disabled={salvandoPacoteInline}
                            className="justify-self-start rounded-full bg-[var(--accent)] px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
                          >
                            {salvandoPacoteInline ? "Criando..." : "Criar e usar nesta venda"}
                          </button>
                        </div>
                      )}

                      {selectedPackageId && (
                        <div className="grid gap-2 rounded-md border border-dashed border-[var(--border)] bg-white/60 p-2.5">
                          <p className="text-[12px] font-bold uppercase text-[var(--muted)]">Ajustes desta venda</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                              Nº de Sessões
                              <input
                                type="number"
                                min={1}
                                value={saleSessions}
                                onChange={(e) => setSaleSessions(Number(e.target.value))}
                                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none"
                              />
                            </label>
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                          <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                            <input
                              type="checkbox"
                              checked={saleFractioned}
                              onChange={(e) => setSaleFractioned(e.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            Cobrança fracionada
                          </label>
                          {saleFractioned && (
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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

                      <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pagamentos a receber</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("cobrancas")}
                        className="text-[12px] font-semibold text-[var(--accent-text)] hover:underline"
                      >
                        Ver todas as cobranças →
                      </button>
                    </div>
                    {invoices.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-5 text-center">
                        <p className="text-xs text-[var(--muted)]">
                          Nenhuma cobrança ainda. Cadastre um pacote e venda para um cliente — as cobranças
                          (com parcelas e lembretes de WhatsApp) são geradas automaticamente.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("pacotes")}
                          className="btn-primary mt-3 text-[12.5px]"
                        >
                          Criar primeiro pacote
                        </button>
                      </div>
                    ) : (
                      invoices.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center rounded-md border border-slate-100 bg-white p-3 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{inv.clientName} ({inv.dogName})</p>
                            {/* Vencimento em corpo maior e, quando atrasado, em
                                vermelho com o aviso — era o que o adestrador
                                não conseguia enxergar na lista. */}
                            <p className="text-[12px] text-[var(--muted)]">{inv.packageName}</p>
                            <p className={`mt-0.5 text-[13.5px] font-semibold ${
                              inv.status === "Atrasado" ? "text-rose-600" : "text-[var(--foreground)]"
                            }`}>
                              {inv.status === "Atrasado" ? "⚠ Venceu em " : "Vence em "}{inv.dueDate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">R$ {inv.amount.toFixed(2)}</p>
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[12px] font-bold ${
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
                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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

                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                          <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)] mt-2">
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
                          <p className="mt-1 text-[12px] text-[var(--muted)]">
                            {pkg.sessionsCount} sessões • Cobrança parcelada: {pkg.isFractioned ? `A cada ${pkg.fractionSessions} aulas` : "Não"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[var(--foreground)]">R$ {pkg.amount.toFixed(2)}</p>
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[12px] font-bold text-sky-800">{pkg.status}</span>
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
                      <div
                        key={inv.id}
                        id={`fatura-${inv.id}`}
                        className={`rounded-md border bg-white p-3.5 flex flex-col gap-2.5 shadow-xs ${
                          faturaDestacada === inv.id
                            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{inv.clientName} ({inv.dogName})</p>
                            <p className="text-[12px] text-[var(--muted)] mt-0.5">{inv.packageName}</p>
                            <p className={`text-[13px] font-semibold ${
                              inv.status === "Atrasado" ? "text-rose-600" : "text-[var(--foreground)]"
                            }`}>
                              {inv.status === "Atrasado" ? "⚠ Venceu em " : "Vencimento: "}{inv.dueDate}
                              {inv.method && ` • Pago via ${inv.method}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-950">R$ {inv.amount.toFixed(2)}</p>
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[12px] font-bold mt-1 ${
                              inv.status === "Pago" ? "bg-emerald-100 text-emerald-800" :
                              inv.status === "Atrasado" ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-900"
                            }`}>{inv.status}</span>
                          </div>
                        </div>

                        {/* Ações de cobrança */}
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2 text-[12px]">
                          {inv.status !== "Pago" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, "Pago", "PIX")}
                                className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 py-1 font-bold text-center"
                              >
                                Receber por Pix
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, "Pago", "Dinheiro")}
                                className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 py-1 font-bold text-center"
                              >
                                Receber em dinheiro
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCardFeeFor(cardFeeFor === inv.id ? null : inv.id);
                                  setCardFeePct("");
                                }}
                                className="flex-1 rounded-lg bg-sky-50 border border-sky-300 text-sky-800 py-1 font-bold text-center"
                              >
                                Receber por cartão
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendChargeReminder(inv)}
                                className="flex-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] text-sky-700 py-1 font-bold text-center"
                                title="Enviar cobrança via WhatsApp"
                              >
                                Lembrar
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

                        {/* Recebimento por cartão: taxa da maquininha + valor líquido real */}
                        {cardFeeFor === inv.id && inv.status !== "Pago" ? (
                          <div className="mt-2 grid gap-2 rounded-md border border-sky-200 bg-sky-50/70 p-2.5 sm:grid-cols-[1fr_1fr_auto]">
                            <label className="grid gap-1 text-[12px] font-bold uppercase text-sky-900">
                              Taxa da maquininha (%)
                              <input
                                value={cardFeePct}
                                onChange={(e) => setCardFeePct(e.target.value.replace(/[^\d.,]/g, ""))}
                                inputMode="decimal"
                                placeholder="Ex: 4,99"
                                className="rounded-md border border-sky-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                              />
                              <span className="text-[11px] font-normal normal-case text-sky-800">
                                Deixe em branco se a taxa é repassada ao cliente.
                              </span>
                            </label>
                            <div className="grid gap-1 text-[12px] font-bold uppercase text-sky-900">
                              Valor líquido recebido
                              <p className="rounded-md border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                                R$ {(inv.amount * (1 - (parseFloat(cardFeePct.replace(",", ".")) || 0) / 100)).toFixed(2)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const pct = parseFloat(cardFeePct.replace(",", ".")) || 0;
                                const net = (inv.amount * (1 - pct / 100)).toFixed(2);
                                handleUpdateInvoiceStatus(
                                  inv.id,
                                  "Pago",
                                  pct > 0 ? `Cartão (taxa ${pct}% · líquido R$ ${net})` : "Cartão",
                                );
                                setCardFeeFor(null);
                              }}
                              className="self-end rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-bold text-white"
                            >
                              Confirmar
                            </button>
                          </div>
                        ) : null}
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
                          <DateField value={extratoStart} onChange={(e) => setExtratoStart(e.target.value)} />
                          <span className="text-xs text-[var(--muted)]">até</span>
                          <DateField value={extratoEnd} onChange={(e) => setExtratoEnd(e.target.value)} />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[12px] font-bold uppercase text-emerald-700">Recebido</p>
                        <p className="mt-1 text-lg font-bold text-emerald-800">R$ {totalRecebido.toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[12px] font-bold uppercase text-amber-700">Pendente</p>
                        <p className="mt-1 text-lg font-bold text-amber-800">R$ {totalPendente.toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                        <p className="text-[12px] font-bold uppercase text-rose-700">Em atraso</p>
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
                                <p className="truncate text-[12px] text-[var(--muted)]">{inv.packageName} · {ref?.toLocaleDateString("pt-BR")}{inv.method ? ` · ${inv.method}` : ""}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">R$ {inv.amount.toFixed(2)}</p>
                                <span className={`text-[12px] font-semibold ${inv.status === "Pago" ? "text-emerald-700" : inv.status === "Atrasado" ? "text-rose-700" : "text-amber-700"}`}>{inv.status}</span>
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
                      
                      <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
                        Cliente
                        <input
                          type="text"
                          required
                          placeholder="Nome do cliente"
                          value={receiptClient}
                          onChange={(e) => setReceiptClient(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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

                        <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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

                      <label className="grid gap-1 text-[12px] font-bold uppercase text-[var(--muted)]">
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
                          <p className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider">Recibo Nº {receiptNumber}</p>
                        </div>

                        <div className="space-y-3.5 text-xs text-slate-800 mt-4 leading-relaxed">
                          <p>Recebemos de <strong className="text-slate-900">{receiptClient}</strong>, cliente(a) responsável pelo cão <strong className="text-slate-900">{receiptDog}</strong>.</p>
                          <p>A importância líquida de <strong className="text-slate-900">R$ {receiptAmount.toFixed(2)}</strong> referente à prestação de serviços de adestramento comportamental canino: <span className="font-semibold text-[var(--foreground)]">{receiptService}</span>.</p>
                          <p>Pagamento quitado via <strong className="text-slate-900">{receiptMethod}</strong> em {new Date().toLocaleDateString("pt-BR")}.</p>
                        </div>

                        {receiptMethod === "Pix" && pixKey && isPixKey(pixKey) ? (
                          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs">
                            <p className="font-bold text-emerald-900">Pix Copia e Cola</p>
                            <p className="mt-0.5 text-[12px] text-emerald-700">
                              O cliente cola no banco e o pagamento já vem preenchido — sem gateway pago.
                            </p>
                            <code className="mt-2 block break-all rounded-lg bg-white px-2 py-1.5 text-[12px] text-emerald-950">
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
                              className="mt-2 rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-bold text-white"
                            >
                              {pixCopied ? "✓ Copiado!" : "Copiar Pix"}
                            </button>
                          </div>
                        ) : null}

                        {/* Assinatura e identificação vêm do cadastro do
                            adestrador (Configurações › Meu cadastro). Sem
                            assinatura cadastrada, sobra a linha para assinar à
                            mão — o recibo nunca sai sem quem o emitiu. */}
                        <div className="mt-8 border-t border-slate-100 pt-5 flex flex-col items-center justify-center text-[12px] text-[var(--muted)]">
                          {profile.signatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.signatureUrl}
                              alt="Assinatura do adestrador"
                              className="mb-1 h-14 object-contain"
                            />
                          ) : (
                            <div className="h-0.5 w-36 bg-slate-200 mb-1" />
                          )}
                          <p>Assinatura do Adestrador Canino</p>
                          <p className="mt-0.5 font-bold text-slate-900">{profile.name || trainerName || "Adestrador"}</p>
                          {profile.businessName ? (
                            <p className="text-[12px] text-[var(--muted)]">{profile.businessName}</p>
                          ) : null}
                          {profile.businessDocument ? (
                            <p className="text-[12px] text-[var(--muted)]">{profile.businessDocument}</p>
                          ) : null}
                          {profile.whatsapp || profile.email ? (
                            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                              {[profile.whatsapp, profile.email].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setReceiptGenerated(false)}
                          className="rounded-md border border-[var(--border)] py-2 text-center text-xs font-bold text-[var(--muted)]"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={baixarReciboPdf}
                          disabled={gerandoPdf}
                          className="rounded-md border border-[#145a82] bg-white py-2 text-center text-xs font-bold text-[var(--foreground)] disabled:opacity-60"
                        >
                          {gerandoPdf ? "Gerando..." : "Baixar PDF"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendReceiptViaWhats}
                          disabled={gerandoPdf}
                          className="rounded-md bg-emerald-600 py-2 text-center text-xs font-bold text-white disabled:opacity-60"
                        >
                          {gerandoPdf ? "Gerando..." : "Enviar PDF no WhatsApp"}
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
