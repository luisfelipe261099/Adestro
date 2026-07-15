"use client";

// Quadro kanban dos cães por fase de trabalho (Dog.trainingStatus) — replica o
// fluxo que o adestrador usava no ClickUp: arrastar o card muda a fase.
// Fallback sem drag (celular): seletor de fase no próprio card.
import Image from "next/image";
import Link from "next/link";
import { DragEvent, useMemo, useState } from "react";

import { computeDogAttention } from "@/lib/home-agenda";
import {
  DOG_TRAINING_STATUSES,
  type DogTrainingStatus,
  useAppStore,
} from "@/lib/app-store";

const DEFAULT_DOG_PHOTO = "/images/dog-default-bolt.svg";

const COLUMN_STYLE: Record<DogTrainingStatus, { dot: string; header: string }> = {
  Ficha: { dot: "bg-slate-400", header: "text-slate-600" },
  Ativo: { dot: "bg-[var(--accent)]", header: "text-[var(--accent)]" },
  Completo: { dot: "bg-emerald-500", header: "text-emerald-700" },
  Pausado: { dot: "bg-amber-500", header: "text-amber-700" },
  Cancelado: { dot: "bg-rose-500", header: "text-rose-700" },
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function DogKanban({ searchTerm }: { searchTerm: string }) {
  const clients = useAppStore((s) => s.clients);
  const events = useAppStore((s) => s.calendarEvents);
  const sessions = useAppStore((s) => s.trainingSessions);
  const setDogTrainingStatus = useAppStore((s) => s.setDogTrainingStatus);

  const [dragging, setDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<DogTrainingStatus | null>(null);
  const [saveError, setSaveError] = useState("");

  const items = useMemo(
    () => computeDogAttention(clients, events, sessions, new Date().getTime()),
    [clients, events, sessions],
  );

  const filtered = useMemo(() => {
    const term = normalizeText(searchTerm.trim());
    if (!term) return items;
    return items.filter(
      (item) =>
        normalizeText(item.dog.name).includes(term) ||
        normalizeText(item.clientName).includes(term) ||
        normalizeText(item.dog.breed ?? "").includes(term),
    );
  }, [items, searchTerm]);

  const byStatus = useMemo(() => {
    const map = new Map<DogTrainingStatus, typeof filtered>();
    for (const status of DOG_TRAINING_STATUSES) map.set(status, []);
    for (const item of filtered) {
      const status = item.dog.trainingStatus ?? "Ativo";
      map.get(status)?.push(item);
    }
    return map;
  }, [filtered]);

  async function moveDog(payload: string, status: DogTrainingStatus) {
    const [clientId, dogId] = payload.split(":");
    if (!clientId || !dogId) return;
    const current = clients
      .find((c) => c.id === clientId)
      ?.dogs.find((d) => d.id === dogId)?.trainingStatus;
    if (current === status) return;
    setSaveError("");
    const ok = await setDogTrainingStatus(clientId, dogId, status);
    if (!ok) setSaveError("Não foi possível mover o cão. Verifique sua conexão e tente de novo.");
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: DogTrainingStatus) {
    event.preventDefault();
    setDropTarget(null);
    setDragging(false);
    void moveDog(event.dataTransfer.getData("text/plain"), status);
  }

  return (
    <div>
      {saveError && (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {saveError}
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-3">
        {DOG_TRAINING_STATUSES.map((status) => {
          const column = byStatus.get(status) ?? [];
          const style = COLUMN_STYLE[status];
          return (
            <section
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(status);
              }}
              onDragLeave={() => setDropTarget((current) => (current === status ? null : current))}
              onDrop={(event) => handleDrop(event, status)}
              className={`w-[248px] shrink-0 rounded-lg border bg-[var(--surface-2)] p-2 transition-colors ${
                dropTarget === status && dragging
                  ? "border-[var(--accent)] bg-sky-50"
                  : "border-[var(--border)]"
              }`}
            >
              <header className="flex items-center gap-2 px-1.5 py-1">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
                <h3 className={`text-[11.5px] font-bold uppercase tracking-[0.08em] ${style.header}`}>
                  {status}
                </h3>
                <span className="ml-auto text-[11px] font-semibold text-[var(--muted)]">
                  {column.length}
                </span>
              </header>

              <div className="mt-1 space-y-2">
                {column.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--border)] px-2 py-4 text-center text-[11px] text-[var(--muted)]">
                    {dragging ? "Solte aqui" : "Nenhum cão"}
                  </p>
                ) : (
                  column.map((item) => (
                    <article
                      key={item.dog.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", `${item.clientId}:${item.dog.id}`);
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(true);
                      }}
                      onDragEnd={() => {
                        setDragging(false);
                        setDropTarget(null);
                      }}
                      className="cursor-grab rounded-md border border-[var(--border)] bg-white p-2.5 shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <Image
                            src={item.dog.photoUrl || DEFAULT_DOG_PHOTO}
                            alt={`Foto de ${item.dog.name}`}
                            fill
                            sizes="32px"
                            unoptimized
                            onError={(event) => {
                              event.currentTarget.src = DEFAULT_DOG_PHOTO;
                            }}
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/caes/${item.dog.id}`}
                            className="block truncate text-[13px] font-semibold text-[var(--foreground)] hover:underline"
                          >
                            {item.dog.name}
                          </Link>
                          <p className="truncate text-[11px] text-[var(--muted)]">
                            {item.clientName}
                            {item.dog.breed ? ` · ${item.dog.breed}` : ""}
                          </p>
                        </div>
                      </div>

                      {item.sessionsTotal > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10.5px] text-[var(--muted)]">
                            <span>
                              Sessão {item.sessionCount}/{item.sessionsTotal}
                            </span>
                            <span>{item.phaseLabel}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${item.progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Fallback sem arrastar (celular): mover pelo seletor */}
                      <select
                        value={status}
                        onChange={(event) =>
                          void moveDog(
                            `${item.clientId}:${item.dog.id}`,
                            event.target.value as DogTrainingStatus,
                          )
                        }
                        aria-label={`Fase de ${item.dog.name}`}
                        className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[11px] text-[var(--muted)]"
                      >
                        {DOG_TRAINING_STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
