"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { AdminContextNav } from "@/components/admin-context-nav";
import { SkeletonCard } from "@/components/skeletons";

type AuditLog = {
  id: string;
  action: string;
  resourceId: string | null;
  detail: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_LABEL: Record<string, { label: string; icon: string; tone: string }> = {
  "client.created": { label: "Cliente criado", icon: "👤", tone: "bg-emerald-50 text-emerald-800" },
  "client.updated": { label: "Cliente atualizado", icon: "✏️", tone: "bg-[var(--surface-2)] text-sky-800" },
  "client.deleted": { label: "Cliente removido", icon: "🗑️", tone: "bg-rose-50 text-rose-800" },
  "dog.created": { label: "Cão criado", icon: "🐶", tone: "bg-emerald-50 text-emerald-800" },
  "session.created": { label: "Treino registrado", icon: "📝", tone: "bg-purple-50 text-purple-800" },
  "session.updated": { label: "Treino atualizado", icon: "🔁", tone: "bg-[var(--surface-2)] text-sky-800" },
  "session.deleted": { label: "Treino removido", icon: "🗑️", tone: "bg-rose-50 text-rose-800" },
  "session.nps": { label: "NPS recebido", icon: "⭐", tone: "bg-amber-50 text-amber-900" },
  "contract.created": { label: "Contrato criado", icon: "📦", tone: "bg-emerald-50 text-emerald-800" },
  "invoice.paid": { label: "Cobrança paga", icon: "💰", tone: "bg-emerald-50 text-emerald-800" },
  "plan.changed": { label: "Plano alterado", icon: "🔼", tone: "bg-indigo-50 text-indigo-800" },
  "settings.updated": { label: "Ajustes salvos", icon: "⚙️", tone: "bg-slate-50 text-slate-700" },
  "template.updated": { label: "Template editado", icon: "📋", tone: "bg-slate-50 text-slate-700" },
  "portal-link.created": { label: "Link portal criado", icon: "🔗", tone: "bg-[var(--surface-2)] text-sky-800" },
  "portal-link.revoked": { label: "Link portal revogado", icon: "🚫", tone: "bg-rose-50 text-rose-800" },
  "csv.imported": { label: "CSV importado", icon: "📥", tone: "bg-purple-50 text-purple-800" },
  "export.lgpd": { label: "Export LGPD", icon: "📤", tone: "bg-amber-50 text-amber-900" },
};

function describe(action: string) {
  return ACTION_LABEL[action] ?? { label: action, icon: "•", tone: "bg-slate-50 text-slate-700" };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/audit?limit=200", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o histórico.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!filter) return logs;
    return logs.filter((log) => log.action.startsWith(filter));
  }, [logs, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    for (const log of filtered) {
      const date = new Date(log.createdAt).toLocaleDateString("pt-BR");
      const list = map.get(date) ?? [];
      list.push(log);
      map.set(date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AuthGuard role="admin">
      <main className="mx-auto w-full max-w-3xl px-3 pb-24 pt-3">
        <div className="mb-3">
          <AdminContextNav />
        </div>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <header data-tour="admin-audit" className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">Auditoria</p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Histórico de atividade</h1>
              <p className="mt-1 text-xs text-[var(--muted)]">Quem fez o quê e quando — essencial para multi-adestrador.</p>
            </div>
            <Link
              href="/configuracoes"
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
            >
              ← Configurações
            </Link>
          </header>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-[12px] font-bold">
            {["", "client", "session", "contract", "invoice", "settings", "template", "portal-link", "invite", "csv", "export"].map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setFilter(scope)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 transition ${
                  filter === scope
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] bg-white text-[var(--muted)]"
                }`}
              >
                {scope === "" ? "Todos" : scope}
              </button>
            ))}
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          ) : null}

          {!logs ? (
            <div className="mt-3 space-y-2">
              <SkeletonCard rows={2} />
              <SkeletonCard rows={2} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-6 text-center text-xs text-[var(--muted)]">
              Nenhuma atividade registrada ainda nesse filtro.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {groups.map(([date, items]) => (
                <section key={date}>
                  <h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">{date}</h2>
                  <ul className="mt-1 space-y-1">
                    {items.map((log) => {
                      const meta = describe(log.action);
                      let detail: unknown = null;
                      if (log.detail) {
                        try {
                          detail = JSON.parse(log.detail);
                        } catch {
                          detail = log.detail;
                        }
                      }
                      return (
                        <li
                          key={log.id}
                          className="flex items-start gap-2 rounded-md border border-slate-100 bg-white px-3 py-2"
                        >
                          <span aria-hidden className="text-base">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="flex items-center gap-2 text-xs">
                              <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${meta.tone}`}>
                                {meta.label}
                              </span>
                              <span className="text-[12px] text-[var(--muted)]">
                                {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </p>
                            {log.actorEmail ? (
                              <p className="mt-0.5 text-[12px] text-[var(--muted)]">por {log.actorEmail}</p>
                            ) : null}
                            {detail ? (
                              <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2 py-1 text-[12px] text-slate-700">
                                {typeof detail === "string" ? detail : JSON.stringify(detail)}
                              </pre>
                            ) : null}
                          </div>
                          <span className="text-[12px] text-slate-400">{log.ipAddress ?? "—"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <footer className="mt-4 text-center text-[12px] text-[var(--muted)]">
            Mostrando até 200 entradas mais recentes.
          </footer>
        </section>
      </main>
    </AuthGuard>
  );
}
