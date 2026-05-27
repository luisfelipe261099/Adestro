"use client";

import { useState } from "react";

import type { GamificationState } from "@/lib/gamification";

type Props = {
  state: GamificationState;
  trainerName: string;
  onRateTrainer: (rating: number) => void;
  lastEarned: { points: number; reason: string } | null;
  onDismissEarned: () => void;
};

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Avaliação">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = (hover || value) >= star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={`text-2xl leading-none transition ${active ? "text-amber-400" : "text-slate-300"}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function GamificationPanel({ state, trainerName, onRateTrainer, lastEarned, onDismissEarned }: Props) {
  const xpPercent = Math.min(100, Math.round((state.xpInLevel / (state.xpInLevel + state.xpToNext)) * 100));
  const earnedBadges = state.badges.filter((badge) => badge.unlocked);
  const lockedBadges = state.badges.filter((badge) => !badge.unlocked);

  return (
    <article className="rounded-[1.5rem] border border-[var(--border)] bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6f99]">Jornada de Treino</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Nível e Patente do Cão</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Seu cão está progredindo! Complete tarefas com fotos/vídeos de prova, assista aos vídeos de aula e interaja para subir de nível e desbloquear novas patentes.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-white px-3.5 py-2 text-center min-w-[70px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2d6f99]">Nível</p>
          <p className="text-2xl font-bold text-[#145a82]">{state.level}</p>
        </div>
      </div>

      <div className="mt-3.5 rounded-xl bg-[#145a82]/5 border border-[#145a82]/10 p-3.5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-[#145a82]">Patente Canina Atual</p>
          <p className="text-base font-bold text-slate-800 mt-0.5">{state.dogRank}</p>
        </div>
        <div className="text-3xl">
          {state.level >= 10 ? "🏆" : state.level >= 7 ? "🎓" : state.level >= 5 ? "🎖️" : state.level >= 3 ? "🎒" : "🐾"}
        </div>
      </div>

      {lastEarned ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>
            <strong>+{lastEarned.points} pts</strong> • {lastEarned.reason}
          </span>
          <button type="button" onClick={onDismissEarned} className="font-semibold text-amber-900">×</button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Pontos totais</p>
          <p className="mt-1 text-2xl font-semibold text-[#145a82]">{state.points}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Sequência diária</p>
          <p className="mt-1 text-2xl font-semibold text-[#145a82]">🔥 {state.streakDays}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Conquistas</p>
          <p className="mt-1 text-2xl font-semibold text-[#145a82]">{earnedBadges.length}/{state.badges.length}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Nível {state.level}</span>
          <span>{state.xpInLevel} / {state.xpInLevel + state.xpToNext} XP</span>
          <span>Nível {state.level + 1}</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full border border-sky-100 bg-white">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Avalie seu adestrador</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--foreground)]">{trainerName || "Seu adestrador"}</p>
          <StarPicker value={state.trainerRating} onChange={onRateTrainer} />
        </div>
        {state.trainerRating > 0 ? (
          <p className="mt-1 text-[11px] text-emerald-700">Obrigado pela avaliação! Ela ajuda a melhorar o serviço.</p>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--muted)]">+25 pts ao avaliar pela primeira vez.</p>
        )}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Conquistas</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {earnedBadges.map((badge) => (
            <div
              key={badge.id}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center"
              title={badge.description}
            >
              <p className="text-2xl">{badge.icon}</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-900">{badge.label}</p>
            </div>
          ))}
          {lockedBadges.slice(0, 6).map((badge) => (
            <div
              key={badge.id}
              className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-3 text-center opacity-70"
              title={badge.description}
            >
              <p className="text-2xl grayscale">{badge.icon}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-sky-100 bg-white/80 px-3 py-2 text-[11px] text-[#245d84]">
        <strong>Como pontuar:</strong> concluir tarefa (+20) • enviar evidência de tarefa (+15) • assistir vídeo do treino (+15) • avaliar aula (+15) • avaliar adestrador (+25) • enviar comentário (+10) • visita diária (+5).
      </div>
    </article>
  );
}
