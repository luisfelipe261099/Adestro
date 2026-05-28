"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  IconCalendar,
  IconChevronDown,
  IconDog,
  IconDollar,
  IconHome,
  IconPlus,
  IconReport,
  IconUsers,
} from "@/components/icons";

const PRIMARY = [
  { href: "/dashboard", label: "Início", Icon: IconHome },
  { href: "/agenda", label: "Agenda", Icon: IconCalendar },
  { href: "/clientes", label: "Clientes", Icon: IconUsers },
  { href: "/financeiro", label: "Financeiro", Icon: IconDollar },
];

const MORE_LINKS = [
  { href: "/treinos", label: "Treinos", Icon: IconDog },
  { href: "/relatorios", label: "Relatórios", Icon: IconReport },
];

const QUICK_ACTIONS = [
  { href: "/agenda?new=true", label: "Novo agendamento" },
  { href: "/treinos/registro?new=true", label: "Novo treino" },
  { href: "/clientes?new=true", label: "Novo cliente" },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  if (status !== "authenticated") return null;
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  if (userRole !== "trainer") return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/90 px-1 pb-safe backdrop-blur lg:hidden">
        {PRIMARY.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors ${
                active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setMoreOpen((v) => !v);
            setActionsOpen(false);
          }}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors ${
            moreOpen ? "text-[var(--foreground)]" : "text-[var(--muted)]"
          }`}
        >
          <IconChevronDown className={`h-[18px] w-[18px] transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          <span className="font-medium">Mais</span>
        </button>
      </nav>

      {/* Floating action button (FAB) discreto, com escolha */}
      <button
        type="button"
        onClick={() => {
          setActionsOpen((v) => !v);
          setMoreOpen(false);
        }}
        className="fixed bottom-16 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)] text-white shadow-md lg:hidden"
        aria-label="Ações rápidas"
      >
        <IconPlus className={`h-4 w-4 transition-transform ${actionsOpen ? "rotate-45" : ""}`} />
      </button>

      {actionsOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setActionsOpen(false)}
          />
          <div className="absolute bottom-32 right-4 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setActionsOpen(false)}
                className="block px-3 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {moreOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-16 left-3 right-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {MORE_LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                <Icon className="h-4 w-4 text-[var(--muted)]" />
                {label}
              </Link>
            ))}
            <Link
              href="/configuracoes"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            >
              Configurações
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
