"use client";

// Tela "Evolução" (Fase 2 — análise GPT): últimas notas comportamentais de cada
// cão, alimentadas pela Seção 8 do registro de treino.
import { useMemo } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { BEHAVIOR_CATEGORIES } from "@/lib/behavior";

type DogRow = {
  id: string;
  name: string;
  breed: string;
  clientName: string;
  scores: Record<string, number> | null;
};

export default function EvolucaoPage() {
  const clients = useAppStore((s) => s.clients);
  const sessions = useAppStore((s) => s.trainingSessions);

  const dogs = useMemo<DogRow[]>(() => {
    // Sessions vêm em ordem desc por data → 1ª nota encontrada por cão é a mais recente.
    const latest = new Map<string, Record<string, number>>();
    for (const s of sessions) {
      for (const ds of s.dogSessions ?? []) {
        if (ds.behaviorScores && Object.keys(ds.behaviorScores).length > 0 && !latest.has(ds.dogId)) {
          latest.set(ds.dogId, ds.behaviorScores);
        }
      }
    }
    const rows: DogRow[] = [];
    for (const c of clients) {
      for (const d of c.dogs) {
        rows.push({
          id: d.id,
          name: d.name,
          breed: d.breed,
          clientName: c.name,
          scores: latest.get(d.id) ?? null,
        });
      }
    }
    return rows;
  }, [clients, sessions]);

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Evolução comportamental</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Últimas notas de cada cão por área. Avalie ao registrar um treino (Seção 8).
          </p>
        </header>

        {dogs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Cadastre clientes e cães para acompanhar a evolução.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dogs.map((dog) => (
              <section key={dog.id} className="card p-4">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">🐕 {dog.name}</h2>
                <p className="text-[11.5px] text-[var(--muted)]">
                  {dog.clientName}
                  {dog.breed ? ` · ${dog.breed}` : ""}
                </p>
                {dog.scores ? (
                  <div className="mt-3 space-y-2">
                    {BEHAVIOR_CATEGORIES.map((cat) => {
                      const v = dog.scores?.[cat.key] ?? 0;
                      return (
                        <div key={cat.key}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[var(--muted-strong)]">{cat.label}</span>
                            <span className="font-semibold text-[var(--foreground)]">{v}/5</span>
                          </div>
                          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${(v / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] text-[var(--muted)]">Sem avaliação ainda.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
