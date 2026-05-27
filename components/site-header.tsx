"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { NotificationsBell } from "@/components/notifications-bell";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const trainerName = session?.user?.name ?? "";

  function setScrollLock(locked: boolean) {
    if (locked) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return;
    }

    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  async function handleLogout() {
    setMenuOpen(false);
    setScrollLock(false);

    await signOut({ redirect: false });
    router.replace("/login");
  }

  const adminNav = [
    { href: "/admin", label: "Dashboard", kicker: "Admin", description: "Visão geral da plataforma" },
    { href: "/admin/adestradores", label: "Adestradores", kicker: "Gestão", description: "Gerenciar adestradores" },
    { href: "/admin/planos", label: "Planos", kicker: "Preços", description: "Configurar planos" },
    { href: "/admin/faturamento", label: "Faturamento", kicker: "Financeiro", description: "Receitas e pagamentos" },
    { href: "/admin/relatorios", label: "Relatórios", kicker: "Analytics", description: "Análises da plataforma" },
    { href: "/tutorial", label: "Tutorial", kicker: "Ajuda", description: "Passo a passo para administradores" },
  ];

  const trainerNav = [
    { href: "/dashboard", label: "Início", kicker: "Home", description: "Comece por aqui" },
    { href: "/clientes", label: "Tutores e cães", kicker: "Carteira", description: "Cadastros e histórico" },
    { href: "/agenda", label: "Agenda", kicker: "Hoje", description: "Próximos atendimentos" },
    { href: "/treinos", label: "Treinos", kicker: "Histórico", description: "Sessões registradas" },
    { href: "/portal", label: "Portal do Tutor", kicker: "Externo", description: "Link compartilhado com o tutor" },
    { href: "/ia", label: "Assistente IA", kicker: "Apoio", description: "Sugestões para casos complexos" },
    { href: "/configuracoes", label: "Configurações", kicker: "Conta", description: "Preferências da conta" },
  ];

  const trainerMoreNav = [
    { href: "/planos", label: "Meu Plano", kicker: "Assinatura", description: "Plano e pagamento" },
    { href: "/tutorial", label: "Tutorial", kicker: "Ajuda", description: "Passo a passo da plataforma" },
    { href: "/tutorial/cliente", label: "Tutorial para Clientes", kicker: "Ajuda", description: "Guia para os tutores de cães" },
  ];

  const clientNav = [
    { href: "/portal/cliente", label: "Meu Portal", kicker: "Cliente", description: "Visão do cliente" },
  ];

  const visibleNav = isAuthenticated
    ? userRole === "admin"
      ? adminNav
      : userRole === "trainer"
        ? trainerNav
        : clientNav
    : [];
  const secondaryNav = isAuthenticated && userRole === "trainer" ? trainerMoreNav : [];
  const secondaryActive = secondaryNav.some((item) => pathname === item.href);

  const roleLabel = userRole === "admin" ? "Administrador" : userRole === "client" ? "Cliente" : "Adestrador";

  useEffect(() => {
    setScrollLock(false);
  }, [pathname]);

  useEffect(() => {
    setScrollLock(menuOpen);

    return () => {
      setScrollLock(false);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,253,255,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(145deg,_#145a82,_#1f8e80)] font-display text-base font-semibold text-white shadow-[0_10px_30px_rgba(16,89,131,0.24)] sm:h-12 sm:w-12 sm:text-lg">
              AD
            </div>
            <div>
              <p className="font-display text-lg font-semibold sm:text-xl">Adestro</p>
              <p className="hidden text-xs text-[var(--muted)] sm:block">Operacao para adestradores</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  pathname === item.href
                    ? "border-[#145a82] bg-[#145a82] text-white shadow-[0_12px_24px_rgba(20,90,130,0.24)]"
                    : "border-[rgba(20,79,116,0.18)] bg-[rgba(250,255,255,0.94)] text-[var(--foreground)] hover:border-[rgba(20,90,130,0.34)] hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {secondaryNav.length ? (
              <details className="group relative">
                <summary
                  className={`list-none whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition marker:hidden ${
                    secondaryActive
                      ? "border-[#145a82] bg-[#145a82] text-white shadow-[0_12px_24px_rgba(20,90,130,0.24)]"
                      : "border-[rgba(20,79,116,0.18)] bg-[rgba(250,255,255,0.94)] text-[var(--foreground)] hover:border-[rgba(20,90,130,0.34)] hover:bg-white"
                  }`}
                >
                  Mais
                </summary>
                <div className="absolute right-0 top-12 z-50 grid min-w-52 gap-2 rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[0_18px_45px_rgba(17,73,110,0.18)]">
                  {secondaryNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        pathname === item.href
                          ? "bg-[#145a82] text-white"
                          : "text-[var(--foreground)] hover:bg-sky-50"
                      }`}
                    >
                      <span className="block">{item.label}</span>
                      <span className="block text-[11px] font-normal opacity-75">{item.description}</span>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {isAuthenticated && userRole === "trainer" && (
              <>
                <NotificationsBell />

                {/* Engrenagem ⚙️ */}
                <Link
                  href="/configuracoes"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(20,79,116,0.18)] bg-white text-[#145a82] hover:bg-sky-50"
                  aria-label="Configurações"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.9" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.9" />
                  </svg>
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="whitespace-nowrap rounded-xl border border-[rgba(176,116,32,0.28)] bg-[rgba(245,186,86,0.14)] px-4 py-2 text-sm font-semibold text-[#8a5b1a] transition hover:bg-[rgba(245,186,86,0.22)]"
              >
                Sair{trainerName ? ` (${trainerName})` : ""}
              </button>
            ) : (
              !isLoginPage ? (
                <Link
                  href="/login"
                  className="pc-primary-action whitespace-nowrap rounded-xl border border-[#145a82] px-4 py-2 text-sm font-semibold"
                >
                  Entrar
                </Link>
              ) : null
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated ? (
              userRole === "trainer" ? (
                <>
                  <NotificationsBell compact />

                  {/* Engrenagem ⚙️ */}
                  <Link
                    href="/configuracoes"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(20,79,116,0.18)] bg-white text-[#145a82]"
                    aria-label="Configurações"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.9" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.9" />
                    </svg>
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="pc-primary-action rounded-xl border border-[#145a82] px-4 py-2.5 text-sm font-semibold"
                >
                  Menu
                </button>
              )
            ) : (
              !isLoginPage ? (
                <Link
                  href="/login"
                  className="pc-primary-action rounded-full border border-[#145a82] px-4 py-2 text-sm font-semibold"
                >
                  Entrar
                </Link>
              ) : null
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && menuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-[rgba(35,24,20,0.58)]"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[92%] max-w-sm flex-col overflow-y-auto border-l border-[var(--border)] bg-[rgba(246,253,255,0.98)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(20,90,130,0.74)]">Navegacao</p>
                <p className="mt-1 truncate font-display text-lg font-semibold text-[var(--foreground)]">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex-shrink-0 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-2xl border px-5 py-4 text-base font-semibold transition break-words ${
                    pathname === item.href
                      ? "border-[#1b719d] bg-[rgba(36,140,196,0.14)] text-[var(--foreground)]"
                      : "border-[var(--border)] bg-white text-[var(--foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {secondaryNav.length ? (
                <div className="mt-2 border-t border-[var(--border)] pt-3">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Mais</p>
                  <div className="grid gap-3">
                    {secondaryNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`rounded-2xl border px-5 py-4 text-base font-semibold transition break-words ${
                          pathname === item.href
                            ? "border-[#1b719d] bg-[rgba(36,140,196,0.14)] text-[var(--foreground)]"
                            : "border-[var(--border)] bg-white text-[var(--foreground)]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 w-full rounded-2xl border border-[rgba(176,116,32,0.22)] bg-[rgba(245,186,86,0.16)] px-5 py-4 text-left text-base font-semibold text-[#8a5b1a]"
            >
              Sair
            </button>
          </aside>
        </div>
      ) : null}
    </>
  );
}