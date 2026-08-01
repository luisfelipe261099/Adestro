"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWaUrl } from "@/lib/whatsapp";

// Painel de convites de autocadastro. Vive fora de app/clientes/page.tsx (que já
// passa de 1300 linhas) porque é autocontido: busca os próprios dados e tem o
// próprio estado de abertura.

type Invite = {
  id: string;
  label: string | null;
  tokenPrefix: string;
  status: "Revogado" | "Usado" | "Em preenchimento" | "Expirado" | "Pendente";
  expiresAt: string;
  clientName: string | null;
};

const STATUS_TONE: Record<Invite["status"], string> = {
  Pendente: "text-[var(--accent)]",
  "Em preenchimento": "text-[var(--accent)]",
  Usado: "text-[var(--success,var(--accent))]",
  Expirado: "text-[var(--muted)]",
  Revogado: "text-[var(--muted)]",
};

export function ClientInvitePanel() {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/client-invites");
    if (res.ok) setInvites((await res.json()).invites);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function generate() {
    setBusy(true);
    setError(null);
    setShareUrl(null);
    setCopied(false);
    try {
      const res = await fetch("/api/client-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, expiresInDays: days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar o convite.");
      } else {
        setShareUrl(data.shareUrl);
        setLabel("");
        await load();
      }
    } catch {
      setError("Falha de conexão ao gerar o convite.");
    }
    setBusy(false);
  }

  async function revoke(id: string) {
    const res = await fetch("/api/client-invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "revoke" }),
    });
    if (res.ok) await load();
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <>
      <button
        type="button"
        data-tour="client-invite"
        onClick={() => setOpen((value) => !value)}
        className="btn-secondary text-[12.5px]"
      >
        Convidar cliente
      </button>

      {/* Modal por cima da tela: antes o painel abria inline dentro do header
          (w-full num flex-wrap), empurrando a página inteira para baixo — era a
          "tela confusa" relatada ao clicar em Convidar cliente. */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl sm:rounded-2xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="Convidar cliente"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--foreground)]">Convidar cliente</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Gere um link e mande para o tutor. Ele preenche os próprios dados e o cadastro chega
            aqui como rascunho, esperando sua aprovação.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[12.5px] font-medium text-[var(--muted)]">
                Para quem é (opcional)
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Maria do Instagram"
                className="input-field mt-1 w-56"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-[var(--muted)]">Vale por (dias)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="input-field mt-1 w-24"
              />
            </label>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="btn-primary text-[12.5px]"
            >
              {busy ? "Gerando…" : "Gerar link"}
            </button>
          </div>

          {error && <p className="mt-2 text-[13px] text-[var(--danger)]">{error}</p>}

          {shareUrl && (
            <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-[12.5px] font-semibold">
                Copie agora — este link não aparece de novo.
              </p>
              <code className="mt-1 block break-all text-[12px] text-[var(--muted)]">
                {shareUrl}
              </code>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="btn-secondary text-[12.5px]">
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <a
                  className="btn-secondary text-[12.5px]"
                  href={buildWaUrl(
                    undefined,
                    `Oi! Faça seu cadastro por aqui, leva menos de um minuto: ${shareUrl}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar no WhatsApp
                </a>
              </div>
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {invites.length === 0 && (
              <li className="text-[12.5px] text-[var(--muted)]">Nenhum convite gerado ainda.</li>
            )}
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2 text-[12.5px]"
              >
                <span>
                  <strong>
                    {invite.label ?? invite.clientName ?? `Convite ${invite.tokenPrefix}`}
                  </strong>
                  <span className={`ml-2 ${STATUS_TONE[invite.status]}`}>{invite.status}</span>
                  {invite.status === "Usado" && invite.clientName && (
                    <span className="ml-2 text-[var(--muted)]">virou {invite.clientName}</span>
                  )}
                </span>
                {/* Também em preenchimento: o adestrador precisa poder cancelar
                    um link que alguém começou a usar indevidamente. */}
                {(invite.status === "Pendente" || invite.status === "Em preenchimento") && (
                  <button
                    type="button"
                    onClick={() => revoke(invite.id)}
                    className="btn-secondary text-[12px]"
                  >
                    Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12px] text-[var(--muted)]">
            <strong>Em preenchimento</strong> é quem abriu o link e ainda não terminou. O contato já
            está salvo como rascunho em Clientes — dá para ligar sem esperar ele voltar.
          </p>
        </div>
        </div>
      )}
    </>
  );
}
