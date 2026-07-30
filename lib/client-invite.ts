// Convite de autocadastro: o adestrador gera o link, o tutor se cadastra sozinho.
// Só lógica pura aqui — as rotas dependem disto, e isto não depende de nada.

export const INVITE_DEFAULT_DAYS = 7;
export const INVITE_MIN_DAYS = 1;
export const INVITE_MAX_DAYS = 30;

export type InviteStatus = "Revogado" | "Usado" | "Expirado" | "Pendente";

export type InviteLifecycle = {
  revokedAt: Date | null;
  expiresAt: Date;
  clientId: string | null;
};

export function normalizeInviteDays(value?: number): number {
  if (!Number.isFinite(value)) return INVITE_DEFAULT_DAYS;
  const rounded = Math.round(Number(value));
  return Math.min(INVITE_MAX_DAYS, Math.max(INVITE_MIN_DAYS, rounded));
}

export function getInviteExpiryDate(days?: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + normalizeInviteDays(days));
  return expiresAt;
}

// A ordem abaixo é regra de negócio:
// 1. Revogado vence tudo — foi decisão do adestrador; "expirado" sugeriria que
//    bastaria esperar.
// 2. Usado vence expirado — o convite converteu em cliente, que é o desfecho de
//    sucesso; mostrar "Expirado" leria como falha.
// 3. Expirado vence pendente.
export function getInviteStatus(invite: InviteLifecycle, nowMs: number = Date.now()): InviteStatus {
  if (invite.revokedAt) return "Revogado";
  if (invite.clientId) return "Usado";
  if (invite.expiresAt.getTime() <= nowMs) return "Expirado";
  return "Pendente";
}

// Pergunta diferente de getInviteStatus, por isso função separada: enquanto o
// convite não vencer, ele reemite o link do portal de quem já se cadastrou.
// Existe porque o token do portal só aparece uma vez — se a pessoa fechar o
// navegador, nem o sistema consegue recuperá-lo (guardamos só o hash).
export function canReenterInvite(invite: InviteLifecycle, nowMs: number = Date.now()): boolean {
  if (invite.revokedAt) return false;
  if (!invite.clientId) return false;
  return invite.expiresAt.getTime() > nowMs;
}
