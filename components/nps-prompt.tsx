"use client";

import { useState } from "react";

type NpsPromptProps = {
  sessionId: string;
  sessionTitle: string;
  token: string;
  pinQuery: string;
  onSent?: () => void;
};

export function NpsPrompt({ sessionId, sessionTitle, token, pinQuery, onSent }: NpsPromptProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (score === null) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/portal-public/${encodeURIComponent(token)}/nps${pinQuery}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, score, comment: comment.trim() || undefined }),
        },
      );
      if (!response.ok) throw new Error();
      setDone(true);
      onSent?.();
    } catch {
      setError("Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-800">
        ✓ Obrigado pela avaliação!
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-semibold text-amber-950">
        Como foi a aula <span className="italic">{sessionTitle}</span>?
      </p>
      <p className="text-[10px] text-amber-800">De 0 a 10, quão satisfeito você ficou?</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            className={`h-7 w-7 rounded-full text-[11px] font-bold transition ${
              score === n
                ? "bg-amber-600 text-white"
                : "border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {score !== null ? (
        <>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={score >= 9 ? "O que mais te encantou? (opcional)" : "Como podemos melhorar? (opcional)"}
            rows={2}
            maxLength={500}
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none"
          />
          {error ? <p className="mt-1 text-[10px] text-rose-700">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="mt-2 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Enviar avaliação"}
          </button>
        </>
      ) : null}
    </div>
  );
}
