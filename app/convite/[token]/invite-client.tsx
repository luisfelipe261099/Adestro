"use client";

import { FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

type InviteInfo = { trainerName: string; alreadyUsed: boolean };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-2">
        <BrandMark />
        <span className="text-sm font-semibold">Adestro</span>
      </div>
      {children}
    </main>
  );
}

export function InviteClient({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) setLoadError(data.error ?? "Convite inválido.");
        else setInfo(data);
      } catch {
        if (alive) setLoadError("Não foi possível carregar o convite. Verifique sua conexão.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: String(form.get("clientName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        dogName: String(form.get("dogName") ?? ""),
        breed: String(form.get("breed") ?? ""),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFormError(data.error ?? "Não foi possível concluir o cadastro.");
      setSaving(false);
      return;
    }

    // Emenda direto na ficha completa, que já existe no portal.
    window.location.href = `${data.portalUrl}/onboarding`;
  }

  async function reenter() {
    setSaving(true);
    setFormError(null);
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.portalUrl;
      return;
    }
    setFormError(data.error ?? "Não foi possível abrir seu portal.");
    setSaving(false);
  }

  if (loadError) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Convite indisponível</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{loadError}</p>
      </Shell>
    );
  }

  if (!info) {
    return (
      <Shell>
        <p className="text-sm text-[var(--muted)]">Carregando…</p>
      </Shell>
    );
  }

  if (info.alreadyUsed) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Você já se cadastrou</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Abra seu portal para acompanhar os treinos com {info.trainerName}.
        </p>
        <button
          type="button"
          onClick={reenter}
          disabled={saving}
          className="btn-primary mt-5 w-full"
        >
          {saving ? "Abrindo…" : "Abrir meu portal"}
        </button>
        {formError && <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p>}
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold">Vamos começar</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Você foi convidado por <strong>{info.trainerName}</strong>. Leva menos de um minuto — o
        resto da ficha você preenche depois.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">Seu nome</span>
          <input
            name="clientName"
            required
            autoComplete="name"
            autoFocus
            placeholder="Maria Silva"
            className="input-field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">WhatsApp</span>
          <input
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(41) 99999-8888"
            className="input-field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="maria@exemplo.com"
            className="input-field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">Nome do cão</span>
          <input name="dogName" required placeholder="Bolt" className="input-field mt-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">Raça</span>
          <input name="breed" placeholder="Border Collie" className="input-field mt-2" />
        </label>

        {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Enviando…" : "Continuar"}
        </button>
      </form>
    </Shell>
  );
}
