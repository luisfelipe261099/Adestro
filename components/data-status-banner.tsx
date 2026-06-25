"use client";

import { useState } from "react";

import { useAppStore } from "@/lib/app-store";

export function DataStatusBanner() {
  const dataLoadError = useAppStore((state) => state.dataLoadError);
  const loadFromDB = useAppStore((state) => state.loadFromDB);
  const setDataLoadError = useAppStore((state) => state.setDataLoadError);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!dataLoadError) return null;

  async function handleRetry() {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await loadFromDB();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <p className="text-xs font-medium text-amber-900 sm:text-sm">{dataLoadError}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-60"
          >
            {isRetrying ? "Sincronizando..." : "Tentar novamente"}
          </button>
          <button
            type="button"
            onClick={() => setDataLoadError(null)}
            className="rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-amber-900"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
