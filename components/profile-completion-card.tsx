"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getProfileStatus, type ProfileStatus } from "@/lib/trainer-profile";

// Aviso de "complete seu cadastro" na home.
//
// Some sozinho quando o cadastro fica completo — e some também enquanto
// carrega, para não piscar um alerta em cima de quem já preencheu tudo.
// Quem dispensa o aviso não é incomodado de novo na mesma sessão, mas o item
// continua na lista de pendências e em Configurações.

const DISMISS_KEY = "adestro-cadastro-aviso-oculto";

export function ProfileCompletionCard() {
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const resposta = await fetch("/api/trainer/settings", { cache: "no-store" });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (cancelado) return;
        setStatus(getProfileStatus(dados));
        setOculto(window.sessionStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        // sem conexão: não mostra nada em vez de mostrar alerta errado
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (!status || status.complete || oculto) return null;

  const prioritarios = status.missingPriority;
  const urgente = prioritarios.length > 0;

  return (
    <section
      data-tour="profile-completion"
      className={`rounded-lg border p-4 ${
        urgente
          ? "border-[var(--card-orange-border)] bg-[var(--card-orange-bg)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[12px] font-bold uppercase tracking-wider ${
              urgente ? "text-[var(--card-orange)]" : "text-[var(--muted)]"
            }`}
          >
            Complete seu cadastro
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
            {urgente
              ? `Faltam ${prioritarios.length} ${prioritarios.length === 1 ? "dado essencial" : "dados essenciais"} para o sistema funcionar bem`
              : `Seu cadastro está ${status.percent}% completo`}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted-strong)]">
            {urgente
              ? "Sem e-mail e WhatsApp não conseguimos falar com você, e o cliente não recebe seu contato nas mensagens."
              : "Os itens que faltam aparecem no recibo, no contrato e no portal do cliente."}
          </p>
        </div>

        <div className="flex flex-none items-center gap-2">
          <Link
            href="/configuracoes#cadastro"
            className="pc-primary-action rounded-full px-4 py-2 text-[13px] font-semibold"
          >
            Completar agora
          </Link>
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.setItem(DISMISS_KEY, "1");
              setOculto(true);
            }}
            className="rounded-full border border-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Agora não
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {status.missing.map((item) => (
          <span
            key={item.key}
            title={item.hint}
            className={`rounded-full border px-2.5 py-1 text-[12px] ${
              item.priority
                ? "border-[var(--card-orange-border)] bg-[var(--surface)] font-semibold text-[var(--card-orange)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            {item.label}
          </span>
        ))}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${status.percent}%` }} />
      </div>
    </section>
  );
}
