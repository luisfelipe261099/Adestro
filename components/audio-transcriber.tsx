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
        🎙️ Transcrição não disponível neste navegador. Use Chrome/Edge desktop ou Safari iOS.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={recording ? stop : start}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition ${
            recording
              ? "bg-rose-600 text-white animate-pulse"
              : "border border-[var(--border)] bg-white text-[#145a82] hover:bg-sky-50"
          }`}
        >
          <span aria-hidden>{recording ? "⏹" : "🎙️"}</span>
          {recording ? "Parar e usar transcrição" : "Gravar nota por voz"}
        </button>
        {hint ? <span className="text-[10px] text-[var(--muted)]">{hint}</span> : null}
      </div>
      {interim ? (
        <p className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] italic text-amber-800">
          {interim}…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{error}</p>
      ) : null}
      {value && !recording ? (
        <p className="text-[10px] text-emerald-700">✓ Transcrição inserida no campo abaixo.</p>
      ) : null}
    </div>
  );
}
