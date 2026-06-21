"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { IconSearch } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";

type PaletteItem = {
  id: string;
  kind: "route" | "client" | "dog" | "session" | "action";
  label: string;
  detail?: string;
  href: string;
};

const ROUTE_ITEMS: PaletteItem[] = [
  { id: "route-dashboard", kind: "route", label: "Início", href: "/dashboard" },
  { id: "route-agenda", kind: "route", label: "Agenda", href: "/agenda" },
  { id: "route-clientes", kind: "route", label: "Clientes", href: "/clientes" },
  { id: "route-treinos", kind: "route", label: "Treinos", href: "/treinos" },
  { id: "route-registro", kind: "route", label: "Registrar treino", href: "/treinos/registro" },
  { id: "route-financeiro", kind: "route", label: "Financeiro", href: "/financeiro" },
  { id: "route-relatorios", kind: "route", label: "Relatórios", href: "/relatorios" },
  { id: "route-portal", kind: "route", label: "Portal do cliente", href: "/portal" },
  { id: "route-config", kind: "route", label: "Configurações", href: "/configuracoes" },
  { id: "route-templates", kind: "route", label: "Templates do sistema", href: "/admin/templates" },
  { id: "route-audit", kind: "route", label: "Atividade", href: "/admin/audit" },
  { id: "action-new-event", kind: "action", label: "Novo agendamento", href: "/agenda?new=true" },
  { id: "action-new-client", kind: "action", label: "Novo cliente", href: "/clientes?new=true" },
];

const KIND_LABEL: Record<PaletteItem["kind"], string> = {
  route: "Página",
  client: "Cliente",
  dog: "Cão",
  session: "Sessão",
  action: "Ação",
};

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
        detail: `${client.dogs.length} ${client.dogs.length === 1 ? "cão" : "cães"}`,
        href: `/clientes?clientId=${client.id}`,
      });
      for (const dog of client.dogs.slice(0, 5)) {
        dynamic.push({
          id: `dog-${dog.id}`,
          kind: "dog",
          label: dog.name,
          detail: `${dog.breed || "Sem raça"} · ${client.name}`,
          href: `/treinos?clientId=${client.id}&dogId=${dog.id}`,
        });
      }
    }
    for (const session of sessions.slice(0, 30)) {
      dynamic.push({
        id: `session-${session.id}`,
        kind: "session",
        label: session.title,
        detail: `${session.date}${session.clientName ? ` · ${session.clientName}` : ""}`,
        href: `/treinos?clientId=${session.clientId ?? ""}&dogId=${session.dogId ?? ""}`,
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
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-20"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <IconSearch className="h-4 w-4 text-[var(--muted)]" />
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
            placeholder="Buscar cliente, cão, sessão ou tela…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="kbd">ESC</kbd>
        </header>
        <ul className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <li className="px-4 py-10 text-center text-[12px] text-[var(--muted)]">
              Nenhum resultado.
            </li>
          ) : (
            items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? "bg-[var(--surface-2)]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--foreground)]">{item.label}</span>
                    {item.detail ? (
                      <span className="block text-[11px] text-[var(--muted)]">{item.detail}</span>
                    ) : null}
                  </div>
                  <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    {KIND_LABEL[item.kind]}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-1.5 text-[11px] text-[var(--muted)]">
          <span><kbd className="kbd">↑↓</kbd> navegar · <kbd className="kbd">↵</kbd> abrir</span>
          <span><kbd className="kbd">⌘K</kbd> alternar</span>
        </footer>
      </div>
    </div>
  );
}
