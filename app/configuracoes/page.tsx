"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { PlanUsageCard } from "@/components/plan-usage-card";
import { PushPermissionCard } from "@/components/push-permission-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppStore } from "@/lib/app-store";

type AlertSettings = {
  reminderHoursBefore: number;
  chargeReminderDaysBefore: number;
  morningBriefHour: number;
  defaultStreakTolerance: number;
};

const DEFAULT_ALERTS: AlertSettings = {
  reminderHoursBefore: 24,
  chargeReminderDaysBefore: 3,
  morningBriefHour: 7,
  defaultStreakTolerance: 100,
};

export default function ConfiguracoesPage() {
  const trainerName = useAppStore((state) => state.trainerName);
  const [displayName, setDisplayName] = useState(trainerName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhats, setNotifyWhats] = useState(true);
  const [language, setLanguage] = useState("pt-BR");
  const [theme, setTheme] = useState("claro");
  const [savedMessage, setSavedMessage] = useState("");
  const [alerts, setAlerts] = useState<AlertSettings>(DEFAULT_ALERTS);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: number; total: number } | null>(null);
  const [csvError, setCsvError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/trainer/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setAlerts({
          reminderHoursBefore: data.reminderHoursBefore ?? 24,
          chargeReminderDaysBefore: data.chargeReminderDaysBefore ?? 3,
          morningBriefHour: data.morningBriefHour ?? 7,
          defaultStreakTolerance: data.defaultStreakTolerance ?? 100,
        });
      } catch {
        // mantém defaults
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedMessage("Preferências salvas neste dispositivo.");
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  async function handleImportCsv() {
    if (!csvFile) return;
    setCsvBusy(true);
    setCsvError("");
    setCsvResult(null);
    try {
      const text = await csvFile.text();
      const response = await fetch("/api/clients/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao importar");
      setCsvResult({ created: data.created ?? 0, skipped: data.skipped?.length ?? 0, total: data.total ?? 0 });
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setCsvBusy(false);
    }
  }

  async function handleExportLgpd() {
    const response = await fetch("/api/me/export");
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adestro-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleSaveAlerts() {
    setAlertsSaving(true);
    setAlertsError("");
    try {
      const response = await fetch("/api/trainer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alerts),
      });
      if (!response.ok) throw new Error("Falha ao salvar configurações de alerta.");
      setSavedMessage("Configurações de alerta atualizadas.");
      window.setTimeout(() => setSavedMessage(""), 3000);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setAlertsSaving(false);
    }
  }

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Conta</p>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Configurações</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">Ajuste preferências de conta, notificações e operação.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <fieldset className="rounded-md border border-[var(--border)] bg-white p-3">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Dados pessoais</legend>
              <div className="mt-2 grid gap-2">
                <label className="text-xs text-[var(--muted)]">
                  Nome
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                  />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                  />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Telefone
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-md border border-[var(--border)] bg-white p-3">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Notificações</legend>
              <div className="mt-2 grid gap-2 text-sm text-[var(--foreground)]">
                <label className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                  <span>Receber por e-mail</span>
                  <input type="checkbox" checked={notifyEmail} onChange={(event) => setNotifyEmail(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                  <span>Receber por WhatsApp</span>
                  <input type="checkbox" checked={notifyWhats} onChange={(event) => setNotifyWhats(event.target.checked)} />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-md border border-[var(--border)] bg-white p-3">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Aparência</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-[var(--muted)]">
                  Idioma
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Tema
                  <select
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                  >
                    <option value="claro">Claro</option>
                    <option value="escuro">Escuro</option>
                  </select>
                </label>
              </div>
            </fieldset>

            {savedMessage ? (
              <p className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs text-sky-800">{savedMessage}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="pc-primary-action rounded-full px-4 py-2 text-sm font-semibold"
              >
                Salvar preferências
              </button>
              <Link href="/dashboard" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
                Voltar
              </Link>
            </div>
          </form>

          {/* ── Uso do plano ─────────────────────────────────────────────────── */}
          <div className="mt-5">
            <PlanUsageCard />
          </div>

          {/* ── Acessos rápidos a admin ─────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href="/admin/audit"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-[var(--foreground)]"
            >
              📜 Histórico de atividade
            </Link>
            <Link
              href="/admin/templates"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-[var(--foreground)]"
            >
              📋 Templates do sistema
            </Link>
          </div>

          {/* ── Notificações Push + Tema ─────────────────────────────────────── */}
          <section className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 space-y-3">
            <header>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Experiência</p>
              <h2 className="text-base font-semibold text-sky-950">Aparência e notificações push</h2>
            </header>
            <PushPermissionCard />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Tema do app</p>
                <p className="text-[11px] text-[var(--muted)]">Alterna entre modo claro e escuro instantaneamente.</p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* ── Import CSV + Export LGPD ─────────────────────────────────────── */}
          <section className="mt-5 rounded-md border border-purple-100 bg-purple-50/40 p-4 space-y-3">
            <header>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Dados</p>
              <h2 className="text-base font-semibold text-purple-950">Importar clientes e exportar dados</h2>
            </header>

            <div className="rounded-md border border-purple-100 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Importar CSV</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                Cabeçalho esperado: <code className="rounded bg-slate-100 px-1">name,phone,email,dogName,dogBreed,notes</code>
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs file:mr-2 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={!csvFile || csvBusy}
                className="mt-2 rounded-full bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {csvBusy ? "Importando…" : "Importar"}
              </button>
              {csvResult ? (
                <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                  ✓ {csvResult.created} criados de {csvResult.total} • {csvResult.skipped} pulados
                </p>
              ) : null}
              {csvError ? (
                <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{csvError}</p>
              ) : null}
            </div>

            <div className="rounded-md border border-purple-100 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Exportar todos os meus dados (LGPD)</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                Baixa um JSON com clientes, cães, sessões, contratos, faturas e tudo associado à sua conta. Art. 18, §1º da LGPD.
              </p>
              <button
                type="button"
                onClick={handleExportLgpd}
                className="mt-2 rounded-full bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Baixar JSON
              </button>
            </div>
          </section>

          {/* ── Configurações de Alertas (módulo 10.3 §8.5) ─────────────────── */}
          <section data-tour="settings-alerts" className="mt-5 rounded-md border border-amber-100 bg-amber-50/40 p-4">
            <header className="flex items-center justify-between border-b border-amber-100 pb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Operacional</p>
                <h2 className="text-base font-semibold text-amber-950">Configurações de alertas</h2>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Define quando o brief diário e os lembretes do tutor são preparados.
                </p>
              </div>
              <Link
                href="/admin/templates"
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-50"
                title="Editar templates de atividades, comandos e tarefas"
              >
                Templates →
              </Link>
            </header>

            {alertsLoading ? (
              <p className="mt-3 text-xs text-amber-900">Carregando configurações…</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-[10px] font-bold uppercase text-amber-900">
                  Antecedência do lembrete de treino (horas)
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={alerts.reminderHoursBefore}
                    onChange={(event) =>
                      setAlerts({ ...alerts, reminderHoursBefore: Number(event.target.value) || 24 })
                    }
                    className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal text-amber-950 outline-none"
                  />
                  <span className="text-[10px] font-normal normal-case text-amber-700">
                    Padrão: 24h antes do horário da aula
                  </span>
                </label>

                <label className="grid gap-1 text-[10px] font-bold uppercase text-amber-900">
                  Antecedência da cobrança (dias)
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={alerts.chargeReminderDaysBefore}
                    onChange={(event) =>
                      setAlerts({ ...alerts, chargeReminderDaysBefore: Number(event.target.value) || 3 })
                    }
                    className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal text-amber-950 outline-none"
                  />
                  <span className="text-[10px] font-normal normal-case text-amber-700">
                    Padrão: 3 dias antes do vencimento
                  </span>
                </label>

                <label className="grid gap-1 text-[10px] font-bold uppercase text-amber-900">
                  Horário do brief matinal
                  <select
                    value={alerts.morningBriefHour}
                    onChange={(event) =>
                      setAlerts({ ...alerts, morningBriefHour: Number(event.target.value) })
                    }
                    className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal text-amber-950 outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] font-normal normal-case text-amber-700">
                    Adestro prepara o resumo do dia neste horário
                  </span>
                </label>

                <label className="grid gap-1 text-[10px] font-bold uppercase text-amber-900">
                  % mínimo para manter streak (cães)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={alerts.defaultStreakTolerance}
                    onChange={(event) =>
                      setAlerts({ ...alerts, defaultStreakTolerance: Number(event.target.value) || 100 })
                    }
                    className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal text-amber-950 outline-none"
                  />
                  <span className="text-[10px] font-normal normal-case text-amber-700">
                    Padrão: 100% (todas as tarefas do dia)
                  </span>
                </label>
              </div>
            )}

            {alertsError ? (
              <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{alertsError}</p>
            ) : null}

            <button
              type="button"
              onClick={handleSaveAlerts}
              disabled={alertsSaving || alertsLoading}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
            >
              {alertsSaving ? "Salvando…" : "Salvar configurações de alerta"}
            </button>
          </section>
        </section>
      </main>
    </AuthGuard>
  );
}
