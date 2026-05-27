"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useAppStore } from "@/lib/app-store";

type PaletteItem = {
  id: string;
  kind: "route" | "client" | "dog" | "session" | "action";
  label: string;
  detail?: string;
  href: string;
  icon: string;
};

const ROUTE_ITEMS: PaletteItem[] = [
  { id: "route-dashboard", kind: "route", label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { id: "route-agenda", kind: "route", label: "Agenda", href: "/agenda", icon: "📅" },
  { id: "route-clientes", kind: "route", label: "Tutores e cães", href: "/clientes", icon: "👥" },
  { id: "route-treinos", kind: "route", label: "Treinos", href: "/treinos", icon: "🎯" },
  { id: "route-registro", kind: "route", label: "Registrar treino", href: "/treinos/registro", icon: "📝" },
  { id: "route-financeiro", kind: "route", label: "Financeiro", href: "/financeiro", icon: "💰" },
  { id: "route-relatorios", kind: "route", label: "Relatórios", href: "/relatorios", icon: "📊" },
  { id: "route-portal", kind: "route", label: "Portal do tutor", href: "/portal", icon: "🔗" },
  { id: "route-config", kind: "route", label: "Configurações", href: "/configuracoes", icon: "⚙️" },
  { id: "route-templates", kind: "route", label: "Templates do sistema", href: "/admin/templates", icon: "📋" },
  { id: "action-new-event", kind: "action", label: "Novo agendamento", href: "/agenda?new=true", icon: "➕" },
  { id: "action-new-client", kind: "action", label: "Novo tutor", href: "/clientes?new=true", icon: "➕" },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function CommandPalette() {
  const router = useRouter();
  const { status } = useSession();
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery("");
        setActiveIndex(0);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const dynamic: PaletteItem[] = [];
    for (const client of clients.slice(0, 40)) {
      dynamic.push({
        id: `client-${client.id}`,
        kind: "client",
        label: client.name,
        detail: `Tutor • ${client.dogs.length} cão${client.dogs.length === 1 ? "" : "s"}`,
        href: `/clientes?clientId=${client.id}`,
        icon: "👤",
      });
      for (const dog of client.dogs.slice(0, 5)) {
        dynamic.push({
          id: `dog-${dog.id}`,
          kind: "dog",
          label: dog.name,
          detail: `${dog.breed || "Cão"} • ${client.name}`,
          href: `/treinos?clientId=${client.id}&dogId=${dog.id}`,
          icon: "🐶",
        });
      }
    }
    for (const session of sessions.slice(0, 30)) {
      dynamic.push({
        id: `session-${session.id}`,
        kind: "session",
        label: session.title,
        detail: `${session.date} • ${session.clientName || ""} ${session.dogName ? `• ${session.dogName}` : ""}`.trim(),
        href: `/treinos?clientId=${session.clientId ?? ""}&dogId=${session.dogId ?? ""}`,
        icon: "📌",
      });
    }
    const all = [...ROUTE_ITEMS, ...dynamic];

    const q = normalize(query.trim());
    if (!q) return all.slice(0, 20);

    return all
      .map((item) => {
        const haystack = normalize(`${item.label} ${item.detail ?? ""}`);
        const idx = haystack.indexOf(q);
        return idx >= 0 ? { item, score: idx } : null;
      })
      .filter((entry): entry is { item: PaletteItem; score: number } => entry !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 25)
      .map((entry) => entry.item);
  }, [clients, sessions, query]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [items.length, activeIndex]);

  if (status !== "authenticated" || !open) return null;

  function go(item: PaletteItem) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-16"
    >
      <button
        type="button"
        aria-label="Fechar busca"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl">
        <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <span className="text-[#145a82]" aria-hidden>🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const target = items[activeIndex];
                if (target) go(target);
              }
            }}
            placeholder="Buscar tutor, cão, sessão ou tela…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">ESC</kbd>
        </header>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-[var(--muted)]">Nenhum resultado.</li>
          ) : (
            items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition ${
                    index === activeIndex ? "bg-sky-50 text-[#145a82]" : "hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    {item.detail ? (
                      <span className="block text-[11px] text-[var(--muted)]">{item.detail}</span>
                    ) : null}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                    {item.kind}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <footer className="border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[10px] text-[var(--muted)]">
          ⌘K / Ctrl+K • Setas para navegar • Enter para abrir
        </footer>
      </div>
    </div>
  );
}
