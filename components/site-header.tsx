"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { homeRouteForRole } from "@/lib/routes";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  IconCalendar,
  IconChat,
  IconChevronDown,
  IconClose,
  IconDog,
  IconDollar,
  IconHome,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconReport,
  IconSettings,
  IconSparkle,
  IconUsers,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
};

const TRAINER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/treinos", label: "Treinos", icon: IconDog },
  { href: "/financeiro", label: "Financeiro", icon: IconDollar },
  { href: "/relatorios", label: "Relatórios", icon: IconReport },
];

const TRAINER_SECONDARY: NavItem[] = [
  { href: "/portal", label: "Portal do tutor", icon: IconLink, description: "Link compartilhado" },
  { href: "/ia", label: "Assistente IA", icon: IconSparkle, description: "Sugestões para casos complexos" },
  { href: "/planos", label: "Meu plano", icon: IconReceipt, description: "Assinatura" },
  { href: "/tutorial", label: "Tutorial", icon: IconChat, description: "Manuais e guia rápido" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Visão geral", icon: IconHome, description: "Resumo da operação" },
  { href: "/admin/adestradores", label: "Adestradores", icon: IconUsers, description: "Contas, senha e permissões" },
  { href: "/admin/planos", label: "Planos", icon: IconDollar, description: "Plano de cada conta" },
  { href: "/admin/faturamento", label: "Faturamento", icon: IconReceipt, description: "Pagos e pendentes" },
  { href: "/admin/relatorios", label: "Relatórios", icon: IconReport, description: "Uso e desempenho" },
  { href: "/admin/templates", label: "Templates", icon: IconChat, description: "Atividades, comandos, tarefas" },
  { href: "/admin/audit", label: "Auditoria", icon: IconReport, description: "Histórico de atividade" },
];

const CLIENT_NAV: NavItem[] = [{ href: "/portal/cliente", label: "Meu portal" }];

// Re-export iconlink local
function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-4 w-4"}>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.5" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </svg>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors ${
        active
          ? "bg-[var(--surface-2)] text-[var(--foreground)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{item.label}</span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isPublicPage = pathname === "/" || pathname === "/cadastro" || isLoginPage;

  const [menuOpen, setMenuOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const trainerName = session?.user?.name ?? "";
  const trainerEmail = session?.user?.email ?? "";

  function setScrollLock(locked: boolean) {
    if (typeof document === "undefined") return;
    document.body.style.overflow = locked ? "hidden" : "";
  }

  async function handleLogout() {
    setMenuOpen(false);
    setScrollLock(false);
    await signOut({ redirect: false });
    // Reload "duro" para limpar TODO o estado de sessão no cliente (contexto do
    // SessionProvider, cache de getSession, store) — senão o role do perfil
    // anterior pode vazar para o próximo login (trainer→logout→admin).
    window.location.assign("/login");
  }

  useEffect(() => setScrollLock(false), [pathname]);
  useEffect(() => {
    setScrollLock(menuOpen);
    return () => setScrollLock(false);
  }, [menuOpen]);

  const primaryNav =
    !isAuthenticated || isPublicPage
      ? []
      : userRole === "admin"
        ? ADMIN_NAV
        : userRole === "trainer"
          ? TRAINER_NAV
          : CLIENT_NAV;

  const secondaryNav = isAuthenticated && userRole === "trainer" ? TRAINER_SECONDARY : [];

  const initial = (trainerName || trainerEmail).trim().charAt(0).toUpperCase() || "A";
  const displayName = trainerName || trainerEmail.split("@")[0] || "Conta";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href={isAuthenticated ? homeRouteForRole(userRole) : "/"} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">Adestro</span>
          </Link>

          {/* Desktop nav (admin usa o botão "Menu" que abre o painel) */}
          {primaryNav.length > 0 && userRole !== "admin" ? (
            <nav className="hidden items-center gap-0.5 lg:flex">
              {primaryNav.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} />
              ))}

              {secondaryNav.length ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSecondaryOpen((v) => !v)}
                    onBlur={() => setTimeout(() => setSecondaryOpen(false), 150)}
                    className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${
                      secondaryOpen
                        ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Mais
                    <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${secondaryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {secondaryOpen ? (
                    <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                      {secondaryNav.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onMouseDown={(e) => e.preventDefault()}
                            className="flex items-start gap-3 px-3 py-2.5 text-[13px] hover:bg-[var(--surface-2)]"
                          >
                            {Icon ? (
                              <span className="mt-0.5 text-[var(--muted)]">
                                <Icon className="h-4 w-4" />
                              </span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[var(--foreground)]">{item.label}</div>
                              {item.description ? (
                                <div className="text-[11.5px] text-[var(--muted)]">{item.description}</div>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </nav>
          ) : null}

          {/* Right side actions */}
          <div className="flex items-center gap-1.5">
            {isAuthenticated && userRole === "trainer" ? (
              <>
                <NotificationsBell />
                <Link
                  href="/configuracoes"
                  className="hidden h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] lg:flex"
                  aria-label="Configurações"
                >
                  <IconSettings className="h-4 w-4" />
                </Link>
                <div className="relative ml-1 hidden lg:block">
                  <details className="group">
                    <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 hover:bg-[var(--surface-2)] marker:hidden">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
                        {initial}
                      </span>
                      <span className="max-w-[120px] truncate text-[12.5px] font-medium text-[var(--foreground)]">{displayName}</span>
                      <IconChevronDown className="h-3.5 w-3.5 text-[var(--muted)] group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                      <div className="border-b border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">{trainerEmail}</div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                      >
                        <IconLogout className="h-4 w-4 text-[var(--muted)]" />
                        Sair
                      </button>
                    </div>
                  </details>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] lg:hidden"
                  aria-label="Abrir menu"
                >
                  <IconMenu className="h-4 w-4" />
                </button>
              </>
            ) : isAuthenticated && userRole === "admin" ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
                aria-label="Abrir menu"
              >
                <IconMenu className="h-4 w-4" />
                <span>Menu</span>
              </button>
            ) : isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary text-[12.5px]"
              >
                Sair
              </button>
            ) : !isLoginPage ? (
              <>
                <Link href="/login" className="btn-secondary text-[12.5px]">
                  Entrar
                </Link>
                {pathname !== "/cadastro" ? (
                  <Link href="/cadastro" className="btn-primary">
                    Criar conta grátis
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Drawer de navegação (mobile para trainer; qualquer tela para admin) */}
      {isAuthenticated && menuOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)]">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                  {initial}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[var(--foreground)]">{displayName}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">{trainerEmail}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
                aria-label="Fechar"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </header>

            <nav className="flex-1 overflow-y-auto p-2">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {userRole === "admin" ? "Páginas do administrativo" : "Principal"}
              </div>
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition ${
                      active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {Icon ? (
                      <span className="mt-0.5 text-[var(--muted)]">
                        <Icon className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--foreground)]">{item.label}</div>
                      {item.description ? <div className="text-[11px] text-[var(--muted)]">{item.description}</div> : null}
                    </div>
                  </Link>
                );
              })}

              {secondaryNav.length ? (
                <>
                  <div className="mt-3 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Mais
                  </div>
                  {secondaryNav.map((item) => (
                    <NavLink key={item.href} item={item} active={pathname === item.href} onClick={() => setMenuOpen(false)} />
                  ))}
                </>
              ) : null}

              {userRole === "trainer" ? (
                <>
                  <div className="mt-3 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Conta
                  </div>
                  <NavLink
                    item={{ href: "/configuracoes", label: "Configurações", icon: IconSettings }}
                    active={pathname === "/configuracoes"}
                    onClick={() => setMenuOpen(false)}
                  />
                </>
              ) : null}
            </nav>

            <footer className="border-t border-[var(--border)] p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                <IconLogout className="h-4 w-4 text-[var(--muted)]" />
                Sair
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
