"use client";

import { useEffect, useState } from "react";

type State = "idle" | "supported" | "granted" | "denied" | "blocked" | "saving";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushPermissionCard() {
  const [state, setState] = useState<State>("idle");
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("blocked");
      return;
    }
    fetch("/api/push/subscribe")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setVapidKey(data?.vapidPublicKey ?? null))
      .catch(() => undefined);

    if (Notification.permission === "granted") setState("granted");
    else if (Notification.permission === "denied") setState("denied");
    else setState("supported");
  }, []);

  async function subscribe() {
    if (!vapidKey) {
      setError("Servidor não tem VAPID configurado. Configure VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.");
      return;
    }
    setState("saving");
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!response.ok) throw new Error("Falha ao registrar subscription");
      setState("granted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar notificações");
      setState("supported");
    }
  }

  if (state === "blocked") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        🔕 Seu navegador não suporta notificações push. Use Chrome, Edge ou Safari (16.4+).
      </div>
    );
  }

  if (state === "granted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        🔔 Notificações ativadas. Você vai receber alertas mesmo com o app fechado.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        🔕 Você bloqueou as notificações. Reative nas configurações do navegador.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
      <p className="font-semibold">🔔 Ativar notificações push</p>
      <p className="mt-0.5 text-[11px] text-sky-800">
        Receba alertas no celular quando tutores confirmarem presença, pagamentos chegarem e cobranças vencerem.
      </p>
      <button
        type="button"
        onClick={subscribe}
        disabled={state === "saving" || !vapidKey}
        className="mt-2 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
      >
        {state === "saving" ? "Configurando…" : "Ativar agora"}
      </button>
      {!vapidKey ? (
        <p className="mt-2 text-[10px] text-sky-700">
          (Servidor ainda sem VAPID_PUBLIC_KEY — configure no .env / Vercel para liberar)
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-rose-700">{error}</p> : null}
    </div>
  );
}
