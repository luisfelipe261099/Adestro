import { Suspense } from "react";

import AgendaClientPage from "./agenda-client";

// A agenda lê `?view=` e `?new=true` via useSearchParams, que exige uma
// fronteira de Suspense: sem ela o build de produção falha com
// "Missing Suspense boundary with useSearchParams".
export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8">
            <p className="text-sm text-[var(--muted)]">Carregando agenda...</p>
          </div>
        </main>
      }
    >
      <AgendaClientPage />
    </Suspense>
  );
}
