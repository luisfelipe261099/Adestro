"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API — nativa do browser (Chrome, Edge, Safari iOS 14.5+).
// Não usa serviço pago de transcrição. O áudio nunca sai do device.

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
  resultIndex: number;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type AudioTranscriberProps = {
  value: string;
  onAppend: (text: string) => void;
  lang?: string;
  hint?: string;
  className?: string;
};

export function AudioTranscriber({ value, onAppend, lang = "pt-BR", hint, className = "" }: AudioTranscriberProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError("");
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Seu navegador não suporta transcrição. Use Chrome ou Safari iOS.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as unknown as ArrayLike<{ transcript: string }> & { isFinal: boolean };
        const transcript = (result[0] as { transcript: string }).transcript;
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) {
        onAppend(finalText.trim());
        setInterim("");
      } else {
        setInterim(interimText);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error ? `Erro: ${event.error}` : "Erro ao gravar.");
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch {
      setError("Não foi possível iniciar a gravação. Verifique a permissão de microfone.");
    }
  }, [lang, onAppend]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  if (supported === false) {
    return (
      <p className={`text-[11px] text-[var(--muted)] ${className}`}>
        Transcrição não disponível neste navegador. Use Chrome/Edge ou Safari iOS.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={recording ? stop : start}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition ${
            recording
              ? "bg-[var(--danger)] text-white animate-pulse"
              : "btn-secondary"
          }`}
        >
          {recording ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v3" />
            </svg>
          )}
          {recording ? "Parar e inserir" : "Gravar nota por voz"}
        </button>
        {hint ? <span className="text-[11px] text-[var(--muted)]">{hint}</span> : null}
      </div>
      {interim ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11.5px] italic text-[var(--muted-strong)]">
          {interim}…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-2 py-1 text-[11px] text-[var(--danger)]">{error}</p>
      ) : null}
      {value && !recording ? (
        <p className="text-[11px] text-[var(--success)]">Transcrição inserida no campo abaixo.</p>
      ) : null}
    </div>
  );
}
