import { Suspense } from "react";

import RegistroTreinoClientPage from "./registro-client";

export default function RegistroTreinoPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
          <section className="rounded-md border border-[var(--border)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">Carregando registro de treino...</p>
          </section>
        </main>
      }
    >
      <RegistroTreinoClientPage />
    </Suspense>
  );
}
