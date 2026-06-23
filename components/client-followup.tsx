"use client";

// Acompanhamento dos clientes (Fase 2 — análise GPT: "Cliente precisa fazer").
// Mostra, por cliente com tarefas, a ADESÃO (% de tarefas concluídas) e há quantos
// DIAS o cliente não responde (último feedback dele). Lista só quem precisa de
// atenção (adesão < 100% ou silêncio). Tudo derivado do store — sem schema novo.
import Link from "next/link";
import { useMemo } from "react";

import { useAppStore } from "@/lib/app-store";

const DAY_MS = 86_400_000;

export function ClientFollowup() {
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.portalTasks);
  const feedbacks = useAppStore((s) => s.portalFeedbacks);

  const rows = useMemo(() => {
    const now = Date.now();
    return clients
      .map((c) => {
        const myTasks = tasks.filter((t) => t.clientId === c.id);
        const total = myTasks.length;
        const done = myTasks.filter((t) => t.completed).length;
        const adesao = total > 0 ? Math.round((done / total) * 100) : 0;
        const lastMsg = feedbacks
          .filter((f) => f.clientId === c.id && f.author === "Tutor")
          .map((f) => new Date(f.createdAt).getTime())
          .filter((t) => !Number.isNaN(t))
          .sort((a, b) => b - a)[0];
        const daysSilent = lastMsg ? Math.floor((now - lastMsg) / DAY_MS) : null;
        return { id: c.id, name: c.name, total, done, adesao, daysSilent };
      })
      .filter((r) => r.total > 0) // só clientes com tarefas atribuídas
      .filter((r) => r.adesao < 100 || r.daysSilent === null || r.daysSilent > 7)
      .sort((a, b) => a.adesao - b.adesao)
      .slice(0, 6);
  }, [clients, tasks, feedbacks]);

  function silenceLabel(days: number | null): string {
    if (days === null) return "Sem resposta";
    if (days <= 0) return "Respondeu hoje";
    if (days === 1) return "Resp. há 1 dia";
    return `Resp. há ${days} dias`;
  }

  return (
    <section className="card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[var(--foreground)]">Acompanhamento dos clientes</h2>
          <p className="text-[11.5px] text-[var(--muted)]">Adesão às tarefas e quem está sem responder</p>
        </div>
        {rows.length > 0 ? (
          <span className="text-[11px] font-medium text-[var(--muted)]">
            {rows.length} {rows.length === 1 ? "cliente" : "clientes"}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[var(--success)]">Tudo em dia</span>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Clientes em dia com as tarefas. 🎉
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {rows.map((r) => {
            const danger = r.daysSilent === null || r.daysSilent > 7;
            return (
              <li key={r.id}>
                <Link
                  href="/clientes"
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{r.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${r.adesao}%` }}
                        />
                      </div>
                      <span className="text-[10.5px] text-[var(--muted)]">
                        {r.done}/{r.total} tarefas · {r.adesao}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={`whitespace-nowrap text-[11px] font-medium ${
                      danger ? "text-[var(--danger)]" : "text-[var(--muted-strong)]"
                    }`}
                  >
                    {silenceLabel(r.daysSilent)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
