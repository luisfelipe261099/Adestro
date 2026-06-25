"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { UserRole } from "@/lib/app-store";
import { homeRouteForRoleStrict } from "@/lib/routes";

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "trainer" || value === "client";
}

function GuardCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-[var(--border)] bg-white/85 p-8">
        <p className="text-sm text-[var(--muted)]">{children}</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children, role }: { children: React.ReactNode; role?: UserRole | UserRole[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const rawRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const userRole: UserRole | null = isUserRole(rawRole) ? rawRole : null;

  const hasRoleAccess =
    !role || (userRole !== null && (Array.isArray(role) ? role.includes(userRole) : userRole === role));

  // Home do próprio perfil (null se o role ainda não é confiável).
  const userHome = userRole ? homeRouteForRoleStrict(userRole) : null;

  // AUTO-CURA: autenticado, com role conhecido que NÃO tem acesso a esta página,
  // e cuja home é OUTRA rota → manda para a home dele em vez do beco "sem
  // permissão". Cobre de uma vez: corrida de login, sessão obsoleta
  // (trainer→logout→admin), start_url do PWA, link/atalho velho e fallback do SW.
  // `userHome !== pathname` é a trava anti-loop: se a home dele fosse esta mesma
  // página, não redireciona (degrada para o card, nunca para loop infinito).
  const shouldHeal =
    status === "authenticated" && !hasRoleAccess && userHome !== null && userHome !== pathname;

  // Janela "autenticado mas role ainda não propagou": espera um pouco antes de
  // exibir qualquer bloqueio, para não dar flash de "sem permissão".
  const [waitedForRole, setWaitedForRole] = useState(false);
  useEffect(() => {
    if (status === "authenticated" && userRole === null) {
      const timer = setTimeout(() => setWaitedForRole(true), 2500);
      return () => clearTimeout(timer);
    }
    setWaitedForRole(false);
  }, [status, userRole]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (shouldHeal && userHome) {
      router.replace(userHome);
    }
  }, [status, shouldHeal, userHome, pathname, router]);

  if (status === "loading") {
    return <GuardCard>Carregando sessão...</GuardCard>;
  }

  if (status === "unauthenticated") {
    return <GuardCard>Redirecionando para o login...</GuardCard>;
  }

  if (!hasRoleAccess) {
    // Indo se auto-curar para a home do perfil → spinner neutro, não o beco.
    if (shouldHeal) {
      return <GuardCard>Redirecionando...</GuardCard>;
    }
    // Role ainda chegando (contexto propagando) e sem estourar o timeout → espera.
    if (userRole === null && !waitedForRole) {
      return <GuardCard>Carregando sessão...</GuardCard>;
    }
    // Beco real (raro): sessão sem role identificável ou guard mal configurado.
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-white/85 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Acesso restrito
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {role ? "Perfil sem permissão para esta página." : "Acesso não autorizado."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {role
              ? "Faça login com a conta apropriada para acessar este módulo."
              : "Faça login para acessar os módulos do sistema."}
          </p>
          <Link
            href="/login"
            className="pc-primary-action mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
