"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";

// Data dos treinos vem no formato "DD/MM/YYYY" — converte para ordenar.
function parseBrazilianDate(date: string): number {
  const [day, month, year] = (date ?? "").split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

// Nota (0-10) renderizada como estrelas (0-5).
function StarRating({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(score / 2)));
  return (
    <span aria-label={`Nota ${score.toFixed(1)} de 10`}>
      <span className="text-amber-500">{"★".repeat(filled)}</span>
      <span className="text-[var(--border)]">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

export default function DogProfilePage() {
  const params = useParams();
  const dogId = (params?.dogId as string) ?? "";

  const hydrated = useAppStore((s) => s.hydrated);
  const clients = useAppStore((s) => s.clients);
  const trainingSessions = useAppStore((s) => s.trainingSessions);
  const updateClient = useAppStore((s) => s.updateClient);

  // Acha o cão (e o cliente dono) na carteira.
  const found = useMemo(() => {
    for (const client of clients) {
      const dog = client.dogs.find((d) => d.id === dogId);
      if (dog) return { client, dog };
    }
    return null;
  }, [clients, dogId]);

  // Histórico: sessões deste cão (campo direto ou dentro de dogSessions), mais recentes primeiro.
  const history = useMemo(
    () =>
      trainingSessions
        .filter((s) => s.dogId === dogId || (s.dogSessions ?? []).some((ds) => ds.dogId === dogId))
        .sort((a, b) => parseBrazilianDate(b.date) - parseBrazilianDate(a.date)),
    [trainingSessions, dogId],
  );

  // Edição dos dados cadastrais (nome/raça/idade) via a ação updateClient.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", breed: "", age: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit() {
    if (!found) return;
    setError("");
    setDraft({ name: found.dog.name, breed: found.dog.breed ?? "", age: found.dog.age ?? "" });
    setEditing(true);
  }

  async function save() {
    if (!found) return;
    if (!draft.name.trim()) {
      setError("O nome do cão é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    const r = await updateClient({
      clientId: found.client.id,
      dog: { id: found.dog.id, name: draft.name.trim(), breed: draft.breed.trim(), age: draft.age.trim() },
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setEditing(false);
  }

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <div className="mb-4">
          <Link href="/clientes" className="text-[12.5px] text-[var(--muted)] hover:text-[var(--foreground)]">
            ‹ Voltar para clientes
          </Link>
        </div>

        {!hydrated ? (
          <p className="text-sm text-[var(--muted)]">Carregando ficha…</p>
        ) : !found ? (
          <div className="rounded-lg border border-[var(--border)] bg-white p-6">
            <p className="text-sm text-[var(--foreground)]">Cão não encontrado.</p>
            <Link href="/clientes" className="mt-2 inline-block text-[12.5px] font-medium text-[var(--foreground)] underline">
              Ver clientes
            </Link>
          </div>
        ) : (
          <>
            {/* Dados cadastrais */}
            <header className="rounded-lg border border-[var(--border)] bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <Image
                    src={found.dog.photoUrl || "/images/dog-default-bolt.svg"}
                    alt={`Foto de ${found.dog.name}`}
                    fill
                    sizes="80px"
                    unoptimized
                    onError={(event) => {
                      event.currentTarget.src = "/images/dog-default-bolt.svg";
                    }}
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  {!editing ? (
                    <>
                      <h1 className="text-display">{found.dog.name}</h1>
                      <p className="mt-1 text-subtitle">
                        {found.dog.breed || "Raça não informada"}
                        {found.dog.age ? ` · ${found.dog.age}` : ""}
                        {found.dog.weight ? ` · ${found.dog.weight}` : ""}
                      </p>
                      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                        Cliente:{" "}
                        <Link href="/clientes" className="font-medium text-[var(--foreground)] hover:underline">
                          {found.client.name}
                        </Link>
                        {found.client.phone ? ` · ${found.client.phone}` : ""}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="input-field"
                        placeholder="Nome do cão"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={draft.breed}
                          onChange={(e) => setDraft({ ...draft, breed: e.target.value })}
                          className="input-field"
                          placeholder="Raça"
                        />
                        <input
                          value={draft.age}
                          onChange={(e) => setDraft({ ...draft, age: e.target.value })}
                          className="input-field"
                          placeholder="Idade"
                        />
                      </div>
                      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={save} disabled={saving} className="btn-primary text-[12.5px] disabled:opacity-60">
                          {saving ? "Salvando…" : "Salvar"}
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-[12.5px]">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!editing && (
                  <button type="button" onClick={startEdit} className="btn-secondary text-[12.5px]">
                    Editar
                  </button>
                )}
              </div>

              {found.dog.trainingTypes?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {found.dog.trainingTypes.map((t) => (
                    <span key={t} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] text-[var(--foreground)]">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                <Link href={`/treinos/registro?clientId=${found.client.id}&dogId=${found.dog.id}`} className="btn-primary text-[12.5px]">
                  Registrar treino
                </Link>
                <Link href={`/treinos?clientId=${found.client.id}&dogId=${found.dog.id}`} className="btn-secondary text-[12.5px]">
                  Ver todos os treinos
                </Link>
              </div>
            </header>

            {/* Histórico de treinos */}
            <section className="mt-5">
              <h2 className="text-base font-semibold text-[var(--foreground)]">Histórico de treinos</h2>
              <p className="text-[12.5px] text-[var(--muted)]">
                {history.length} treino{history.length === 1 ? "" : "s"} registrado{history.length === 1 ? "" : "s"}
              </p>

              <div className="mt-3 space-y-2.5">
                {history.length === 0 ? (
                  <div className="rounded-md border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
                    Nenhum treino registrado ainda para {found.dog.name}.
                  </div>
                ) : (
                  history.map((session) => {
                    const score = session.notes.length
                      ? session.notes.reduce((t, n) => t + n.score, 0) / session.notes.length
                      : 0;
                    const ds = (session.dogSessions ?? []).find((x) => x.dogId === dogId) ?? session.dogSessions?.[0];
                    const summary = ds?.description || session.notes[0]?.comment || "";
                    return (
                      <Link
                        key={session.id}
                        href={`/treinos/registro?sessionId=${session.id}`}
                        className="block rounded-md border border-[var(--border)] bg-white p-3 transition hover:border-[var(--border-strong)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <StarRating score={score} />
                            <span className="text-[11px] text-[var(--muted)]">{score.toFixed(1)}/10</span>
                          </div>
                          <span className="text-[11px] text-[var(--muted)]">{session.date}</span>
                        </div>
                        {summary && <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--muted-strong)]">{summary}</p>}
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
