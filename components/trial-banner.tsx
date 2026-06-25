"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { IconClose } from "@/components/icons";

type TrialInfo = {
  plan: string;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  isTrial: boolean;
};

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

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

  if (status !== "authenticated" || !info || dismissed || !info.isTrial) return null;

  const days = info.daysRemaining ?? 0;
  const urgent = days <= 3;

  return (
    <div
      className={`flex items-center justify-center gap-3 border-b px-4 py-1.5 text-[12px] ${
        urgent
          ? "border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)]"
          : "border-[var(--warning)]/30 bg-[var(--warning-bg)] text-[var(--warning)]"
      }`}
    >
      <span className="font-medium">
        {days > 0
          ? `Seu período de avaliação termina em ${days} ${days === 1 ? "dia" : "dias"}.`
          : "Seu período de avaliação acabou."}
      </span>
      <Link
        href="/planos"
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Fazer upgrade
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="ml-auto flex h-5 w-5 items-center justify-center rounded hover:bg-black/5"
      >
        <IconClose className="h-3 w-3" />
      </button>
    </div>
  );
}
