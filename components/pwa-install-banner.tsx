"use client";

import { useEffect, useMemo, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type MobilePlatform = "ios" | "android" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const HIDE_KEY = "adestro-pwa-install-hidden";

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getMobilePlatform(): MobilePlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [closedByUser, setClosedByUser] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<MobilePlatform>("other");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.localStorage.getItem(HIDE_KEY) === "1") {
      setClosedByUser(true);
      return;
    }

    setPlatform(getMobilePlatform());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowGuide(false);
      setClosedByUser(true);
      window.localStorage.setItem(HIDE_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const mode = useMemo(() => {
    if (closedByUser || isStandaloneMode()) return "hidden" as const;
    if (platform === "ios") return "ios" as const;
    if (deferredPrompt) return "install" as const;
    if (platform === "android") return "android" as const;
    return "hidden" as const;
  }, [closedByUser, deferredPrompt, platform]);

  async function handleInstall() {
    if (!deferredPrompt || isInstalling) return;

    setIsInstalling(true);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setShowGuide(false);
      setClosedByUser(true);
      window.localStorage.setItem(HIDE_KEY, "1");
    }

    setIsInstalling(false);
  }

  function handleClose() {
    setClosedByUser(true);
    setDeferredPrompt(null);
    setShowGuide(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HIDE_KEY, "1");
    }
  }

  if (mode === "hidden") return null;

  const bannerText =
    mode === "install"
      ? "Quer abrir igual aplicativo? Toque em Instalar app."
      : mode === "android"
        ? "Voce pode colocar o Adestro na tela inicial para abrir como app."
        : "No iPhone, instale pela opcao Adicionar a Tela de Inicio.";

  return (
    <>
      <div className="border-b border-[var(--border-strong)] bg-[#e7f4fd]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-[#0f4361] sm:text-sm">{bannerText}</p>
          <div className="flex items-center gap-2">
            {mode === "install" ? (
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className="rounded-lg border border-[#1b719d] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f4361] disabled:opacity-60"
              >
                {isInstalling ? "Instalando..." : "Instalar app"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="rounded-lg border border-[#a8d1ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f4361]"
            >
              Passo a passo
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-[#0f4361]"
            >
              Agora nao
            </button>
          </div>
        </div>
      </div>

      {showGuide ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(9,38,56,0.48)] p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-md border border-[var(--border)] bg-white p-4 shadow-[0_24px_48px_rgba(13,64,95,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Instalar no celular</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Siga estes 3 passos</h2>

            {platform === "ios" ? (
              <ol className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                <li>1. No Safari, toque no botao Compartilhar.</li>
                <li>2. Toque em Adicionar a Tela de Inicio.</li>
                <li>3. Toque em Adicionar para criar o icone do Adestro.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                <li>1. Toque no menu do navegador no canto superior.</li>
                <li>2. Toque em Instalar app ou Adicionar a tela inicial.</li>
                <li>3. Confirme em Instalar ou Adicionar.</li>
              </ol>
            )}

            <p className="mt-3 rounded-md bg-[#f2f8fc] px-3 py-2 text-xs text-[#33566f]">
              Dica: depois de instalado, abra pelo icone Adestro na tela inicial.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              {mode === "install" ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isInstalling ? "Instalando..." : "Instalar agora"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
