"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

type MobileNavProps = {
  // Permite sincronizar estados se necessário
};

export function MobileNavigation({}: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isAuthenticated = status === "authenticated";
  const userRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();

  // Exibe o menu inferior apenas se o usuário estiver autenticado e for do papel TRAINER
  if (!isAuthenticated || userRole !== "trainer") return null;

  async function handleLogout() {
    setMoreOpen(false);
    await signOut({ redirect: false });
    router.replace("/login");
  }

  const navItems = [
    { href: "/dashboard", label: "Início", icon: "home" },
    { href: "/agenda", label: "Agenda", icon: "calendar" },
    { href: "/clientes", label: "Clientes", icon: "users" },
  ];

  const activeClass = "text-[#145a82] scale-105 font-bold";
  const inactiveClass = "text-[var(--muted)] hover:text-[#145a82]";

  return (
    <>
      {/* ─── BARRA DE NAVEGAÇÃO INFERIOR FIXA ────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-t border-[var(--border)] bg-[rgba(247,253,255,0.95)] px-4 pb-safe shadow-[0_-8px_30px_rgba(15,72,106,0.06)] backdrop-blur-lg lg:hidden">
        
        {/* Início */}
        <Link
          href="/dashboard"
          className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-all ${
            pathname === "/dashboard" ? activeClass : inactiveClass
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
            <path d="m4 11 8-6 8 6v8a1 1 0 0 1-1 1h-4.5v-5h-5V20H5a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          </svg>
          <span className="mt-1 text-[9px] font-medium">Início</span>
        </Link>

        {/* Agenda */}
        <Link
          href="/agenda"
          className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-all ${
            pathname === "/agenda" ? activeClass : inactiveClass
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
            <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="M8 3.8v3.5M16 3.8v3.5M4 9h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <span className="mt-1 text-[9px] font-medium">Agenda</span>
        </Link>

        {/* Botão Central de Ações Rápidas */}
        <div className="relative flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setActionsOpen(!actionsOpen);
              setMoreOpen(false);
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,_#145a82,_#247eb2)] text-white shadow-[0_8px_20px_rgba(20,90,130,0.4)] transition-all ${
              actionsOpen ? "rotate-45 bg-[#bf3b3b] shadow-[0_8px_20px_rgba(191,59,59,0.3)]" : ""
            }`}
            aria-label="Ações rápidas"
            aria-expanded={actionsOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Clientes */}
        <Link
          href="/clientes"
          className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-all ${
            pathname === "/clientes" ? activeClass : inactiveClass
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.9" />
            <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.9" />
            <path d="M4.5 18a4.5 4.5 0 0 1 9 0M13.5 18a3.5 3.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <span className="mt-1 text-[9px] font-medium">Clientes</span>
        </Link>

        {/* Mais */}
        <button
          type="button"
          onClick={() => {
            setMoreOpen(!moreOpen);
            setActionsOpen(false);
          }}
          className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-all ${
            moreOpen ? activeClass : inactiveClass
          }`}
          aria-expanded={moreOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5.5 w-5.5" aria-hidden>
            <circle cx="6" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="18" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <span className="mt-1 text-[9px] font-medium">Mais</span>
        </button>
      </nav>

      {/* ─── MODAL/MENUS DE AÇÕES RÁPIDAS ───────────────────────────────────── */}
      {actionsOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setActionsOpen(false)}
            aria-label="Fechar ações"
          />
          <div className="absolute bottom-20 left-4 right-4 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_rgba(15,72,106,0.15)] animate-in fade-in slide-in-from-bottom-5 duration-200">
            <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Ações rápidas</h3>
            <div className="grid gap-2">
              <Link
                href="/agenda?new=true"
                onClick={() => setActionsOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[#f7fbff] p-3 text-sm font-semibold text-[#145a82] hover:bg-sky-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-[#145a82]">📅</span>
                <div>
                  <p>Novo agendamento</p>
                  <p className="text-[10px] font-normal text-[var(--muted)]">Reservar dia e horário</p>
                </div>
              </Link>
              <Link
                href="/treinos/registro?new=true"
                onClick={() => setActionsOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[#f7fbff] p-3 text-sm font-semibold text-[#145a82] hover:bg-sky-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-[#145a82]">🐾</span>
                <div>
                  <p>Novo treino</p>
                  <p className="text-[10px] font-normal text-[var(--muted)]">Lançar evolução da aula</p>
                </div>
              </Link>
              <Link
                href="/clientes?new=true"
                onClick={() => setActionsOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[#f7fbff] p-3 text-sm font-semibold text-[#145a82] hover:bg-sky-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-[#145a82]">👤</span>
                <div>
                  <p>Novo cliente</p>
                  <p className="text-[10px] font-normal text-[var(--muted)]">Ficha de tutor e cão</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL/MENUS DE 'MAIS' OPÇÕES (BOTTOM SHEET) ────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreOpen(false)}
            aria-label="Fechar mais"
          />
          <div className="absolute bottom-20 left-4 right-4 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_rgba(15,72,106,0.15)] animate-in fade-in slide-in-from-bottom-5 duration-200">
            <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Outros Módulos</h3>
            <div className="grid grid-cols-2 gap-2">
              
              {/* Financeiro */}
              <Link
                href="/financeiro"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Financeiro</p>
                  <p className="text-[9px] text-[var(--muted)]">Pacotes e cobranças</p>
                </div>
              </Link>

              {/* Meu Plano */}
              <Link
                href="/planos"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">📦</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Meu Plano</p>
                  <p className="text-[9px] text-[var(--muted)]">Assinatura SaaS</p>
                </div>
              </Link>

              {/* Tutorial */}
              <Link
                href="/tutorial"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">📖</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Tutorial</p>
                  <p className="text-[9px] text-[var(--muted)]">Manuais de ajuda</p>
                </div>
              </Link>

              {/* Configurações */}
              <Link
                href="/configuracoes"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Ajustes</p>
                  <p className="text-[9px] text-[var(--muted)]">Opções operacionais</p>
                </div>
              </Link>

              {/* Chat Integrado */}
              <Link
                href="/chat"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Chat Integrado</p>
                  <p className="text-[9px] text-[var(--muted)]">Conversar com tutores</p>
                </div>
              </Link>

              {/* Relatórios de Evolução */}
              <Link
                href="/relatorios"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-slate-50/50 p-3 hover:bg-sky-50/40"
              >
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground)]">Relatórios</p>
                  <p className="text-[9px] text-[var(--muted)]">Evolução dos cães</p>
                </div>
              </Link>

              {/* Sair */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex flex-col items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50/30 p-3 text-left hover:bg-rose-50"
              >
                <span className="text-xl">🚪</span>
                <div>
                  <p className="text-xs font-semibold text-rose-800">Sair</p>
                  <p className="text-[9px] text-[var(--muted)]">Encerrar sessão</p>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
