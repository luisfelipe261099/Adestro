"use client";

import { useEffect, useState } from "react";

type Participant = {
  id: string;
  dogId: string | null;
  clientId: string | null;
  dogName: string;
  clientName: string;
  status: "Pendente" | "Confirmado" | "Recusado";
};

type ClientLite = {
  id: string;
  name: string;
  dogs: Array<{ id: string; name: string; breed?: string }>;
};

const STATUS_STYLE: Record<Participant["status"], string> = {
  Confirmado: "bg-emerald-100 text-emerald-800",
  Pendente: "bg-amber-100 text-amber-800",
  Recusado: "bg-rose-100 text-rose-800",
};

const STATUS_ICON: Record<Participant["status"], string> = {
  Confirmado: "✓",
  Pendente: "•",
  Recusado: "✕",
};

/**
 * Gestão de participantes de uma turma (módulo 5.5). Lado adestrador: adiciona
 * cães reais à turma e confirma/recusa cada um individualmente. Autocontido —
 * busca os dados sob demanda, sem acoplar ao store da agenda.
 */
export function EventParticipants({ eventId, clients }: { eventId: string; clients: ClientLite[] }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addDogId, setAddDogId] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/events/participants?eventId=${eventId}`, { cache: "no-store" });
      if (res.ok) setParticipants((await res.json()) as Participant[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addDog() {
    if (!addDogId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/events/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, dogId: addDogId }),
      });
      if (res.ok) {
        setAddDogId("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: Participant["status"]) {
    if (busy) return;
    setBusy(true);
    // Otimista
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      await fetch("/api/events/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeDog(id: string) {
    if (busy) return;
    setBusy(true);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch("/api/events/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } finally {
      setBusy(false);
    }
  }

  const usedDogIds = new Set(participants.map((p) => p.dogId).filter(Boolean));
  const confirmed = participants.filter((p) => p.status === "Confirmado").length;

  return (
    <div className="mt-2 rounded-md border border-dashed border-[var(--border)] bg-white/70 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Participantes da turma</p>
        {!loading && participants.length > 0 ? (
          <span className="text-[10px] text-[var(--muted)]">{confirmed}/{participants.length} confirmados</span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-2 text-[11px] text-[var(--muted)]">Carregando...</p>
      ) : (
        <>
          {participants.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--muted)]">Nenhum cão adicionado ainda.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-white px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{p.dogName}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">{p.clientName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_STYLE[p.status]}`}>
                      {STATUS_ICON[p.status]} {p.status}
                    </span>
                    <button type="button" onClick={() => setStatus(p.id, "Confirmado")} disabled={busy} className="rounded border border-emerald-300 px-1 text-[10px] text-emerald-700 disabled:opacity-50" title="Confirmar">Sim</button>
                    <button type="button" onClick={() => setStatus(p.id, "Recusado")} disabled={busy} className="rounded border border-rose-300 px-1 text-[10px] text-rose-700 disabled:opacity-50" title="Recusar">Não</button>
                    <button type="button" onClick={() => removeDog(p.id)} disabled={busy} className="rounded border border-slate-300 px-1 text-[10px] text-slate-500 disabled:opacity-50" title="Remover">Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex items-center gap-1.5">
            <select
              value={addDogId}
              onChange={(e) => setAddDogId(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] outline-none"
            >
              <option value="">Adicionar cão à turma...</option>
              {clients.flatMap((c) =>
                c.dogs
                  .filter((d) => !usedDogIds.has(d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {c.name}
                    </option>
                  )),
              )}
            </select>
            <button
              type="button"
              onClick={addDog}
              disabled={!addDogId || busy}
              className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
