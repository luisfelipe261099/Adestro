import { Suspense } from "react";
import RelatoriosClientPage from "./relatorios-client";

export default function RelatoriosPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">Carregando painel de relatórios...</p>
          </section>
        </main>
      }
    >
      <RelatoriosClientPage />
    </Suspense>
  );
}
