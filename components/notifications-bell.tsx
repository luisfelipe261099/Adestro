"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useNotifications, type NotificationType } from "@/lib/notifications";

const TYPE_LABEL: Record<NotificationType | "all", string> = {
  all: "Todas",
  agenda: "Agenda",
  treinos: "Treinos",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  portal: "Tutores",
};

export function NotificationsBell({ compact = false }: { compact?: boolean }) {
  const { total, items, byType } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(ev: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filteredItems = filter === "all" ? items : items.filter((item) => item.type === filter);
  const badgeText = total > 9 ? "9+" : String(total);

  const sizeClass = compact
    ? "h-10 w-10"
    : "h-10 w-10";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex ${sizeClass} items-center justify-center rounded-xl border border-[rgba(20,79,116,0.18)] bg-white text-[#145a82] hover:bg-sky-50`}
        aria-label="Notificações"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path d="M15.5 17h-7a2 2 0 0 1-2-2v-2.2c0-.8.3-1.6.9-2.2l.3-.3V8a4.3 4.3 0 1 1 8.6 0v2.3l.3.3c.6.6.9 1.4.9 2.2V15a2 2 0 0 1-2 2Z" stroke="currentColor" strokeWidth="1.9" />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[92vw] rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_18px_45px_rgba(17,73,110,0.18)]">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2d6f99]">Central de notificações</p>
              <p className="text-[10px] text-[var(--muted)]">
                {total === 0 ? "Tudo em dia 🎉" : `${total} item(s) precisam da sua atenção`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--muted)]"
              aria-label="Fechar"
            >
              ✕
            </button>
          </header>

          {total > 0 ? (
            <div className="mt-2 flex gap-1 overflow-x-auto pb-1.5 text-[10px] font-semibold">
              {(["all", "agenda", "treinos", "financeiro", "relatorios", "portal"] as const).map((opt) => {
                const count = opt === "all" ? total : byType[opt];
                if (opt !== "all" && count === 0) return null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFilter(opt)}
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 transition ${
                      filter === opt
                        ? "bg-[#145a82] text-white"
                        : "border border-[var(--border)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    {TYPE_LABEL[opt]}
                    <span className="ml-1 opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <li className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[11px] text-[var(--muted)]">
                Sem notificações neste filtro.
              </li>
            ) : (
              filteredItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-xl border border-transparent bg-slate-50/60 p-2.5 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <span className="text-lg" aria-hidden>{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="text-[11px] leading-snug text-[var(--muted)]">{item.detail}</p>
                      {item.when ? (
                        <p className="mt-0.5 text-[9px] text-slate-400">{item.when}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
