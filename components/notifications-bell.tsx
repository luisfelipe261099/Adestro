"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { IconBell, IconClose } from "@/components/icons";
import { useNotifications, type NotificationType } from "@/lib/notifications";

const TYPE_LABEL: Record<NotificationType | "all", string> = {
  all: "Todas",
  agenda: "Agenda",
  treinos: "Treinos",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  portal: "Clientes",
};

export function NotificationsBell() {
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
  const badgeText = total > 99 ? "99+" : String(total);

  return (
    <div className="relative" ref={panelRef} data-tour="bell">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        aria-label="Notificações"
        aria-expanded={open}
      >
        <IconBell className="h-4 w-4" />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-semibold text-white">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-2 top-14 z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[22rem]">
          <header className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-[var(--foreground)]">Notificações</p>
              <p className="text-[11px] text-[var(--muted)]">
                {total === 0 ? "Tudo em dia" : `${total} ${total === 1 ? "item pendente" : "itens pendentes"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
              aria-label="Fechar"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </header>

          {total > 0 ? (
            <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-2 py-2">
              {(["all", "agenda", "treinos", "financeiro", "relatorios", "portal"] as const).map((opt) => {
                const count = opt === "all" ? total : byType[opt];
                if (opt !== "all" && count === 0) return null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFilter(opt)}
                    className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      filter === opt
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {TYPE_LABEL[opt]} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <ul className="max-h-[24rem] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <li className="px-3 py-10 text-center text-[12px] text-[var(--muted)]">
                Nada para revisar aqui.
              </li>
            ) : (
              filteredItems.map((item) => (
                <li key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{item.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--muted)]">{item.detail}</p>
                    {item.when ? (
                      <p className="mt-0.5 text-[10px] text-[var(--muted)] opacity-70">{item.when}</p>
                    ) : null}
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
