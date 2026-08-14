// Convite de autocadastro: o adestrador gera o link, o cliente se cadastra sozinho.
// Só lógica pura aqui — as rotas dependem disto, e isto não depende de nada.

export const INVITE_DEFAULT_DAYS = 7;
export const INVITE_MIN_DAYS = 1;
export const INVITE_MAX_DAYS = 30;

export const INVITE_SECTION_COUNT = 3;

export type InviteStatus =
  | "Revogado"
  | "Usado"
  | "Em preenchimento"
  | "Expirado"
  | "Pendente";

export type InviteLifecycle = {
  revokedAt: Date | null;
  expiresAt: Date;
  clientId: string | null;
  // Nulo = começou e não terminou. `clientId` sozinho não distingue os dois,
  // porque ele é gravado já ao fim da seção 1 do formulário.
  completedAt: Date | null;
};

export type InviteProgress = {
  clientId: string | null;
  hasDog: boolean;
  completedAt: Date | null;
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
// 3. Em preenchimento vence expirado — quem já começou a responder não pode ser
//    barrado no meio porque o link venceu enquanto ele digitava.
// 4. Expirado vence pendente.
export function getInviteStatus(invite: InviteLifecycle, nowMs: number = Date.now()): InviteStatus {
  if (invite.revokedAt) return "Revogado";
  if (invite.completedAt) return "Usado";
  if (invite.clientId) return "Em preenchimento";
  if (invite.expiresAt.getTime() <= nowMs) return "Expirado";
  return "Pendente";
}

// Pergunta diferente de getInviteStatus, por isso função separada: enquanto o
// convite não vencer, ele reemite o link do portal de quem JÁ TERMINOU.
// Existe porque o token do portal só aparece uma vez — se a pessoa fechar o
// navegador, nem o sistema consegue recuperá-lo (guardamos só o hash).
//
// Exige completedAt: quem parou no meio precisa voltar ao formulário, e não
// receber o portal de um cadastro pela metade.
export function canReenterInvite(invite: InviteLifecycle, nowMs: number = Date.now()): boolean {
  if (invite.revokedAt) return false;
  if (!invite.completedAt) return false;
  return invite.expiresAt.getTime() > nowMs;
}

// Em que seção o cliente volta. Cada seção deixa um rastro no banco, e é ele que
// responde a pergunta — não um contador guardado no navegador, que se perderia
// quando a pessoa troca de aparelho.
export function getInviteResumeStep(progress: InviteProgress): 1 | 2 | 3 {
  if (!progress.clientId) return 1;
  if (!progress.hasDog) return 2;
  return 3;
}
