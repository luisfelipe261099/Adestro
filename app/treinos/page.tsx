import { Suspense } from "react";

import TreinosClientPage from "./treinos-client";

export default function TreinosPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--border)] bg-white/90 p-8">
            <p className="text-sm text-[var(--muted)]">Carregando treinos...</p>
          </div>
        </main>
      }
    >
      <TreinosClientPage />
    </Suspense>
  );
}
