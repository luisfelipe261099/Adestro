"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildPublicState,
  emptyRawGamification,
  type ApplyActionInput,
  type Badge,
  type GamificationState,
} from "@/lib/gamification-shared";

export type { GamificationState, Badge };

type EarnedToast = { points: number; reason: string } | null;

type GamificationApiResponse = {
  state: GamificationState;
  earned: EarnedToast;
};

type UseGamificationOptions = {
  pin?: string;
};

export function useGamification(token: string, options: UseGamificationOptions = {}) {
  const pin = options.pin;
  const [state, setState] = useState<GamificationState>(() => buildPublicState(emptyRawGamification()));
  const [hydrated, setHydrated] = useState(false);
  const [lastEarned, setLastEarned] = useState<EarnedToast>(null);
  const inFlightRef = useRef(false);

  const buildUrl = useCallback(
    (suffix = "") => {
      const base = `/api/portal-public/${encodeURIComponent(token)}/gamification${suffix}`;
      if (pin && /^\d{4}$/.test(pin)) {
        return `${base}${suffix.includes("?") ? "&" : "?"}pin=${encodeURIComponent(pin)}`;
      }
      return base;
    },
    [token, pin],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(buildUrl(), { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as GamificationApiResponse;
        if (cancelled) return;
        setState(body.state);
        if (body.earned) setLastEarned(body.earned);
      } catch {
        // silencioso: protótipo offline-tolerante
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, token]);

  const sendAction = useCallback(
    async (input: ApplyActionInput) => {
      if (!token || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await fetch(buildUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) return;
        const body = (await response.json()) as GamificationApiResponse;
        setState(body.state);
        if (body.earned) setLastEarned(body.earned);
      } catch {
        // ignore
      } finally {
        inFlightRef.current = false;
      }
    },
    [buildUrl, token],
  );

  const award = useCallback(
    (action: "task_completed" | "task_uncompleted" | "feedback_sent" | "training_completed" | "feedback_received" | "task_evidence_uploaded", _reason?: string, taskId?: string) => {
      void sendAction({ action, taskId } as ApplyActionInput);
    },
    [sendAction],
  );

  const inviteTutor = useCallback(
    (count?: number) => {
      void sendAction({ action: "invite_tutor", count });
    },
    [sendAction],
  );

  const useTechnique = useCallback(
    (technique: string) => {
      void sendAction({ action: "multiple_techniques", technique });
    },
    [sendAction],
  );

  const watchVideo = useCallback(
    (videoId: string) => {
      void sendAction({ action: "video_watched", videoId });
    },
    [sendAction],
  );

  const rateTrainer = useCallback(
    (rating: number) => {
      void sendAction({ action: "trainer_rated", rating });
    },
    [sendAction],
  );

  const rateSession = useCallback(
    (sessionId: string, rating: number) => {
      void sendAction({ action: "session_rated", sessionId, rating });
    },
    [sendAction],
  );

  const dismissEarned = useCallback(() => setLastEarned(null), []);

  return { state, award, watchVideo, rateTrainer, rateSession, lastEarned, dismissEarned, hydrated, inviteTutor, useTechnique };
}
