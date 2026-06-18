import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homeRouteForRole } from "@/lib/routes";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  // Quem já está logado e abre /login vai direto para a home do próprio perfil
  // — resolvido SERVER-SIDE (auth() lê o cookie), sem corrida de role no cliente.
  const session = await auth();
  if (session?.user) {
    redirect(homeRouteForRole((session.user as { role?: string }).role));
  }

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-8">
            <p className="text-sm text-[var(--muted)]">Carregando login...</p>
          </div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}