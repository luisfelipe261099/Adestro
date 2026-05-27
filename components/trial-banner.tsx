"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type TrialInfo = {
  plan: string;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  isTrial: boolean;
};

export function TrialBanner() {
  const { status } = useSession();
  const [info, setInfo] = useState<TrialInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("adestro-trial-banner-dismissed-today") === todayKey()) {
      setDismissed(true);
      return;
    }
    fetch("/api/trainer/plan-status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfo(data))
      .catch(() => undefined);
  }, [status]);

  function dismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("adestro-trial-banner-dismissed-today", todayKey());
    }
  }

  if (status !== "authenticated" || !info || dismissed) return null;
  if (!info.isTrial) return null;

  const days = info.daysRemaining ?? 0;
  const urgent = days <= 3;

  return (
    <div className={`relative isolate w-full px-4 py-2 text-center text-xs font-semibold ${urgent ? "bg-rose-600 text-white" : "bg-amber-500 text-amber-950"}`}>
      <span aria-hidden className="mr-1.5">{urgent ? "⏰" : "✨"}</span>
      {days > 0
        ? `Seu trial termina em ${days} dia${days === 1 ? "" : "s"} — `
        : "Seu trial acabou. "}
      <Link href="/planos" className="underline underline-offset-2 font-bold">
        Ative o Pro
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] hover:bg-black/10"
      >
        ✕
      </button>
    </div>
  );
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
