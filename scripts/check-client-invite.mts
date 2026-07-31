import assert from "node:assert/strict";
import {
  canReenterInvite,
  getInviteExpiryDate,
  getInviteResumeStep,
  getInviteStatus,
  normalizeInviteDays,
  INVITE_DEFAULT_DAYS,
  INVITE_SECTION_COUNT,
} from "../lib/client-invite.ts";
import { clientInviteSchema } from "../lib/validators.ts";

const NOW = new Date(2026, 6, 30, 12, 0, 0); // quinta, 30/07/2026 12:00
const nowMs = NOW.getTime();
const daysFromNow = (n: number) => new Date(nowMs + n * 86_400_000);
const feito = new Date(nowMs - 1000); // terminou o formulário há um instante

// ── normalizeInviteDays ──────────────────────────────────────────────────────
assert.equal(normalizeInviteDays(undefined), 7, "sem valor usa o padrão");
assert.equal(normalizeInviteDays(Number.NaN), 7, "NaN usa o padrão");
assert.equal(normalizeInviteDays(0), 1, "abaixo do mínimo vira 1");
assert.equal(normalizeInviteDays(-5), 1, "negativo vira 1");
assert.equal(normalizeInviteDays(31), 30, "acima do máximo vira 30");
assert.equal(normalizeInviteDays(7.4), 7, "arredonda para baixo");
assert.equal(normalizeInviteDays(7.6), 8, "arredonda para cima");
assert.equal(INVITE_DEFAULT_DAYS, 7);
assert.equal(INVITE_SECTION_COUNT, 3);

// ── getInviteStatus: ordem das regras ────────────────────────────────────────
// A ordem é regra de negócio, não detalhe de implementação.
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: null, completedAt: null },
    nowMs,
  ),
  "Pendente",
  "convite novo e no prazo",
);
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: null, completedAt: null },
    nowMs,
  ),
  "Expirado",
  "venceu sem ser aberto",
);
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  "Usado",
  "terminou o formulário",
);
assert.equal(
  getInviteStatus(
    { revokedAt: NOW, expiresAt: daysFromNow(3), clientId: null, completedAt: null },
    nowMs,
  ),
  "Revogado",
  "revogado vence pendente",
);
assert.equal(
  getInviteStatus(
    { revokedAt: NOW, expiresAt: daysFromNow(-1), clientId: null, completedAt: null },
    nowMs,
  ),
  "Revogado",
  "revogado vence expirado — foi decisão do adestrador, não o relógio",
);
assert.equal(
  getInviteStatus(
    { revokedAt: NOW, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  "Revogado",
  "revogado vence usado",
);
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  "Usado",
  "usado vence expirado — o convite converteu, mostrar 'Expirado' leria como falha",
);
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: new Date(nowMs), clientId: null, completedAt: null },
    nowMs,
  ),
  "Expirado",
  "vencer exatamente agora já conta como expirado",
);

// ── getInviteStatus: começou e não terminou ──────────────────────────────────
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: null },
    nowMs,
  ),
  "Em preenchimento",
  "começou mas não terminou",
);
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1", completedAt: null },
    nowMs,
  ),
  "Em preenchimento",
  "quem começou não é barrado pelo vencimento no meio do preenchimento",
);
assert.equal(
  getInviteStatus(
    { revokedAt: NOW, expiresAt: daysFromNow(3), clientId: "c1", completedAt: null },
    nowMs,
  ),
  "Revogado",
  "revogado vence 'em preenchimento'",
);

// ── canReenterInvite ─────────────────────────────────────────────────────────
assert.equal(
  canReenterInvite(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  true,
  "terminou, no prazo e não revogado: pode reemitir o portal",
);
assert.equal(
  canReenterInvite(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: null, completedAt: null },
    nowMs,
  ),
  false,
  "sem cadastro criado não há portal para reemitir",
);
assert.equal(
  canReenterInvite(
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: null },
    nowMs,
  ),
  false,
  "quem parou no meio retoma o formulário, não abre portal",
);
assert.equal(
  canReenterInvite(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  false,
  "convite vencido não reemite nem para quem terminou",
);
assert.equal(
  canReenterInvite(
    { revokedAt: NOW, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  false,
  "revogado não reemite",
);

// ── getInviteResumeStep ──────────────────────────────────────────────────────
assert.equal(
  getInviteResumeStep({ clientId: null, hasDog: false, completedAt: null }),
  1,
  "nada preenchido começa na seção 1",
);
assert.equal(
  getInviteResumeStep({ clientId: "c1", hasDog: false, completedAt: null }),
  2,
  "cliente criado, cão não: retoma na seção 2",
);
assert.equal(
  getInviteResumeStep({ clientId: "c1", hasDog: true, completedAt: null }),
  3,
  "cão criado: retoma na seção 3",
);
assert.equal(
  getInviteResumeStep({ clientId: "c1", hasDog: true, completedAt: feito }),
  3,
  "terminado fica na última seção — quem chama decide mostrar o formulário ou não",
);

// ── getInviteExpiryDate ──────────────────────────────────────────────────────
const expiry = getInviteExpiryDate(INVITE_DEFAULT_DAYS);
assert.ok(expiry.getTime() > Date.now(), "vence no futuro");
assert.ok(
  expiry.getTime() - Date.now() > 6 * 86_400_000,
  "padrão de 7 dias fica acima de 6 dias de folga",
);

// ── clientInviteSchema ───────────────────────────────────────────────────────
const ok = clientInviteSchema.safeParse({
  clientName: "Maria Silva",
  phone: "41999998888",
  email: "maria@exemplo.com",
  dogName: "Bolt",
  breed: "Border Collie",
});
assert.equal(ok.success, true, "payload completo passa");

const minimo = clientInviteSchema.safeParse({ clientName: "Maria", dogName: "Bolt" });
assert.equal(minimo.success, true, "só os obrigatórios passa");

assert.equal(
  clientInviteSchema.safeParse({ dogName: "Bolt" }).success,
  false,
  "sem nome do cliente falha",
);
assert.equal(
  clientInviteSchema.safeParse({ clientName: "Maria" }).success,
  false,
  "sem nome do cão falha",
);
assert.equal(
  clientInviteSchema.safeParse({ clientName: "  ", dogName: "Bolt" }).success,
  false,
  "nome só com espaço falha",
);
assert.equal(
  clientInviteSchema.safeParse({ clientName: "Maria", dogName: "Bolt", email: "nao-e-email" })
    .success,
  false,
  "e-mail inválido falha",
);

console.log("check-client-invite: OK");
