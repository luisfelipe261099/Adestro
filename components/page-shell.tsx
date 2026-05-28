"use client";

import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth-guard";
import type { UserRole } from "@/lib/app-store";

type PageShellProps = {
  kicker?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  requireAuth?: boolean | UserRole | UserRole[];
  narrow?: boolean;
  children: ReactNode;
};

export function PageShell({
  kicker,
  title = "Painel",
  description,
  actions,
  requireAuth = false,
  narrow = false,
  children,
}: PageShellProps) {
  const content = (
    <main className={narrow ? "page-narrow" : "page"}>
      <header className="page-header">
        <div className="page-header-actions">
          <div className="min-w-0">
            {kicker ? <p className="text-eyebrow mb-1.5">{kicker}</p> : null}
            <h1 className="text-display">{title}</h1>
            {description ? <p className="mt-1 text-subtitle">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </main>
  );

  if (requireAuth) {
    const role = Array.isArray(requireAuth) || typeof requireAuth === "string" ? requireAuth : undefined;
    return <AuthGuard role={role}>{content}</AuthGuard>;
  }

  return content;
}
