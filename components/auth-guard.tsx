"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { UserRole } from "@/lib/app-store";

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "trainer" || value === "client";
}

export function AuthGuard({ children, role }: { children: React.ReactNode; role?: UserRole | UserRole[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const rawRole = ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const userRole: UserRole | null = isUserRole(rawRole) ? rawRole : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-white/85 p-8">
          <p className="text-sm text-[var(--muted)]">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  const hasRoleAccess =
    !role || (userRole !== null && (Array.isArray(role) ? role.includes(userRole) : userRole === role));

  if (status !== "authenticated" || !hasRoleAccess) {
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
            href={`/login?next=${encodeURIComponent(pathname)}`}
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