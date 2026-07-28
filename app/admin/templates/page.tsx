"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { AdminContextNav } from "@/components/admin-context-nav";

type ListKey = "defaultActivities" | "defaultCommands" | "defaultTutorTasks";
type WaTemplateKey = "agendamento" | "lembrete" | "confirmacao" | "treinoRealizado" | "cobranca" | "relatorio";

type SettingsState = {
  defaultActivities: string[];
  defaultCommands: string[];
  defaultTutorTasks: string[];
};

const EMPTY: SettingsState = {
  defaultActivities: [],
  defaultCommands: [],
  defaultTutorTasks: [],
};

const WA_TEMPLATE_FIELDS: Array<{ key: WaTemplateKey; label: string; placeholder: string }> = [
  { key: "agendamento", label: "Agendamento criado", placeholder: "Olá {cliente}! Seu treino com {cao} foi agendado para {data} às {hora}." },
  { key: "lembrete", label: "Lembrete de treino", placeholder: "Lembrete: treino do(a) {cao} amanhã às {hora}." },
  { key: "confirmacao", label: "Pedido de confirmação", placeholder: "Por favor, confirme a presença do(a) {cao} em {data}: {link}" },
  { key: "treinoRealizado", label: "Após o treino", placeholder: "Ótimo treino hoje com {cao}! Veja o resumo: {link}" },
  { key: "cobranca", label: "Cobrança pendente", placeholder: "Olá {cliente}! Sua cobrança de R$ {valor} vence em {data}." },
  { key: "relatorio", label: "Relatório mensal", placeholder: "O relatório de {cao} de {mes} já está disponível: {link}" },
];

const PANELS: Array<{
  key: ListKey;
  title: string;
  description: string;
  placeholder: string;
  accent: string;
  emoji: string;
}> = [
  {
    key: "defaultActivities",
    title: "Atividades de treino",
    description: "Aparecem como opções para marcar 'realizado?' na sessão (módulo 4.2 §C).",
    placeholder: "Ex: Aquecimento, Recall, Socialização",
    accent: "sky",
    emoji: "🏃‍♂️",
  },
  {
    key: "defaultCommands",
    title: "Comandos padrão",
    description: "Comandos que ficam disponíveis para avaliar obediência/evolução em estrelas (módulo 4.2 §D).",
    placeholder: "Ex: Senta, Fica, Vem, Junto",
    accent: "indigo",
    emoji: "🎯",
  },
  {
    key: "defaultTutorTasks",
    title: "Tarefas do dono (gamificação)",
    description: "Tarefas pré-definidas que viram opções no portal do cliente (módulo 9.4).",
    placeholder: "Ex: Passeio, Alimentação no horário, Treino de senta",
    accent: "amber",
    emoji: "🐶",
  },
];

function accentRing(accent: string): string {
  if (accent === "indigo") return "border-indigo-200 bg-indigo-50/40";
  if (accent === "amber") return "border-amber-200 bg-amber-50/40";
  return "border-[var(--border-strong)] bg-[var(--surface-2)]/40";
}

function accentChip(accent: string): string {
  if (accent === "indigo") return "bg-indigo-100 text-indigo-900 border-indigo-200";
  if (accent === "amber") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-[var(--border-strong)]";
}

function accentButton(accent: string): string {
  if (accent === "indigo") return "bg-indigo-600 hover:bg-indigo-700";
  if (accent === "amber") return "bg-amber-600 hover:bg-amber-700";
  return "bg-sky-600 hover:bg-sky-700";
}

export default function AdminTemplatesPage() {
  const [state, setState] = useState<SettingsState>(EMPTY);
  const [drafts, setDrafts] = useState<Record<ListKey, string>>({
    defaultActivities: "",
    defaultCommands: "",
    defaultTutorTasks: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ListKey | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [waTemplates, setWaTemplates] = useState<Record<WaTemplateKey, string>>({
    agendamento: "",
    lembrete: "",
    confirmacao: "",
    treinoRealizado: "",
    cobranca: "",
    relatorio: "",
  });
  const [waSaving, setWaSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/trainer/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Não foi possível carregar templates.");
        const data = await response.json();
        if (cancelled) return;
        setState({
          defaultActivities: data.defaultActivities ?? [],
          defaultCommands: data.defaultCommands ?? [],
          defaultTutorTasks: data.defaultTutorTasks ?? [],
        });
        // whatsappTemplates é serializado como JSON object {key: string}
        const waResponse = await fetch("/api/trainer/whatsapp-templates", { cache: "no-store" });
        if (waResponse.ok) {
          const wa = await waResponse.json();
          if (!cancelled) setWaTemplates({ agendamento: "", lembrete: "", confirmacao: "", treinoRealizado: "", cobranca: "", relatorio: "", ...wa });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveWaTemplates() {
    setWaSaving(true);
    setError("");
    try {
      const response = await fetch("/api/trainer/whatsapp-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waTemplates),
      });
      if (!response.ok) throw new Error("Falha ao salvar templates de WhatsApp.");
      setMessage("Templates de WhatsApp salvos.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setWaSaving(false);
    }
  }

  async function saveList(key: ListKey, nextList: string[]) {
    setSavingKey(key);
    setError("");
    try {
      const response = await fetch("/api/trainer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextList }),
      });
      if (!response.ok) throw new Error("Falha ao salvar template.");
      const data = await response.json();
      setState({
        defaultActivities: data.defaultActivities ?? [],
        defaultCommands: data.defaultCommands ?? [],
        defaultTutorTasks: data.defaultTutorTasks ?? [],
      });
      setMessage("Template atualizado.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSavingKey(null);
    }
  }

  function addItem(key: ListKey) {
    const draft = drafts[key].trim();
    if (!draft) return;
    if (state[key].includes(draft)) {
      setError("Esse item já está na lista.");
      window.setTimeout(() => setError(""), 2500);
      return;
    }
    saveList(key, [...state[key], draft]);
    setDrafts({ ...drafts, [key]: "" });
  }

  function removeItem(key: ListKey, value: string) {
    saveList(
      key,
      state[key].filter((item) => item !== value),
    );
  }

  return (
    <AuthGuard role="admin">
      <main className="mx-auto w-full max-w-3xl px-3 pb-24 pt-3">
        <div className="mb-3">
          <AdminContextNav />
        </div>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <header data-tour="admin-templates" className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Operacional</p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Templates do sistema</h1>
              <p className="mt-1 text-xs text-[var(--muted)]">Edite as listas que alimentam sessões e tarefas do cliente.</p>
            </div>
            <Link
              href="/configuracoes"
              className="flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)]"
            >
              ← Configurações
            </Link>
          </header>

          {message ? (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-center text-xs text-[var(--muted)]">Carregando templates…</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {/* WhatsApp templates customizáveis */}
              <article className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4">
                <header>
                  <h2 className="text-sm font-bold text-slate-900">💬 Templates de mensagem WhatsApp</h2>
                  <p className="text-[11px] text-slate-700">
                    Personalize o tom das mensagens enviadas via wa.me. Deixe em branco para usar o padrão do sistema.
                    Variáveis disponíveis: <code className="rounded bg-white px-1 text-[10px]">{"{cliente} {cao} {data} {hora} {link} {valor} {mes}"}</code>
                  </p>
                </header>
                <div className="mt-3 grid gap-3">
                  {WA_TEMPLATE_FIELDS.map((field) => (
                    <label key={field.key} className="grid gap-1 text-[10px] font-bold uppercase text-emerald-900">
                      {field.label}
                      <textarea
                        value={waTemplates[field.key]}
                        onChange={(event) =>
                          setWaTemplates({ ...waTemplates, [field.key]: event.target.value })
                        }
                        rows={2}
                        maxLength={400}
                        placeholder={field.placeholder}
                        className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-normal normal-case text-slate-900 outline-none"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={saveWaTemplates}
                  disabled={waSaving}
                  className="mt-3 rounded-full bg-emerald-600 px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  {waSaving ? "Salvando…" : "Salvar templates de WhatsApp"}
                </button>
              </article>

              {PANELS.map((panel) => (
                <article
                  key={panel.key}
                  className={`rounded-md border p-4 ${accentRing(panel.accent)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        <span aria-hidden className="mr-1.5">{panel.emoji}</span>
                        {panel.title}
                      </h2>
                      <p className="text-[11px] text-slate-700">{panel.description}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                      {state[panel.key].length} itens
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {state[panel.key].length === 0 ? (
                      <p className="text-[11px] italic text-slate-500">
                        Nenhum item personalizado — o sistema usa os padrões internos.
                      </p>
                    ) : (
                      state[panel.key].map((item) => (
                        <span
                          key={item}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accentChip(panel.accent)}`}
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => removeItem(panel.key, item)}
                            disabled={savingKey === panel.key}
                            className="ml-1 text-slate-500 hover:text-rose-600 disabled:opacity-40"
                            aria-label={`Remover ${item}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={drafts[panel.key]}
                      onChange={(event) => setDrafts({ ...drafts, [panel.key]: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addItem(panel.key);
                        }
                      }}
                      placeholder={panel.placeholder}
                      maxLength={80}
                      className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => addItem(panel.key)}
                      disabled={savingKey === panel.key || !drafts[panel.key].trim()}
                      className={`rounded-md px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${accentButton(panel.accent)}`}
                    >
                      {savingKey === panel.key ? "Salvando…" : "Adicionar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
