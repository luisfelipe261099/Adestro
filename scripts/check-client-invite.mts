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
import {
  DOGS_OPTIONS,
  ENERGY_OPTIONS,
  NOISE_OPTIONS,
  PEOPLE_OPTIONS,
  UNWANTED_BEHAVIOR_OPTIONS,
  inviteBehaviorSchema,
  inviteClientSchema,
  inviteDogSchema,
  isValidOption,
  optionValues,
} from "../lib/invite-form.ts";

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

// ── Seção 1: cliente ─────────────────────────────────────────────────────────
assert.equal(
  inviteClientSchema.safeParse({ clientName: "Maria Silva", phone: "41999998888" }).success,
  true,
  "nome e telefone bastam",
);
assert.equal(
  inviteClientSchema.safeParse({ clientName: "Maria Silva" }).success,
  false,
  "sem telefone falha — é por ele que o adestrador retoma o lead",
);
assert.equal(
  inviteClientSchema.safeParse({ clientName: "  ", phone: "41999998888" }).success,
  false,
  "nome só com espaço falha",
);
assert.equal(
  inviteClientSchema.safeParse({
    clientName: "Maria",
    phone: "41999998888",
    email: "nao-e-email",
  }).success,
  false,
  "e-mail inválido falha",
);
assert.equal(
  inviteClientSchema.safeParse({ clientName: "Maria", phone: "41999998888", email: "" }).success,
  true,
  "e-mail em branco é ausência, não erro",
);
assert.equal(
  inviteClientSchema.safeParse({
    clientName: "Maria",
    phone: "41999998888",
    address: {
      zipCode: "80000-000",
      street: "Rua A",
      number: "10",
      city: "Curitiba",
      state: "PR",
    },
    emergencyName: "João",
    emergencyPhone: "41988887777",
  }).success,
  true,
  "endereço e contato de emergência passam",
);

// ── Seção 2: cão ─────────────────────────────────────────────────────────────
assert.equal(inviteDogSchema.safeParse({ dogName: "Bolt" }).success, true, "só o nome basta");
assert.equal(inviteDogSchema.safeParse({ dogName: "  " }).success, false, "nome em branco falha");
assert.equal(
  inviteDogSchema.safeParse({ dogName: "Bolt", sex: "Hermafrodita" }).success,
  false,
  "sexo fora da lista falha",
);
assert.equal(
  inviteDogSchema.safeParse({ dogName: "Bolt", preventiveCare: "Em dia", castrated: true }).success,
  true,
  "vacinação e castração passam",
);
assert.equal(
  inviteDogSchema.safeParse({ dogName: "Bolt", photoUrl: "x".repeat(2_000_001) }).success,
  false,
  "foto acima de 2 MB é recusada — a rota é pública",
);

// ── Seção 3: comportamento ───────────────────────────────────────────────────
assert.equal(
  inviteBehaviorSchema.safeParse({
    temperament: {
      energy: "Alta energia",
      children: "Tolerante com crianças",
      noise: ["Fica ansioso com barulhos", "Se esconde com barulhos"],
      biteHistory: "Sem histórico de mordida",
      unwantedBehaviors: ["Puxa muito a guia"],
    },
    routine: { alimentation: "2x ao dia", sleep: "Cama na sala", walks: "1x", plays: "Bolinha" },
    environmentalAnalysis: { history: "Nunca foi adestrado" },
  }).success,
  true,
  "payload completo de comportamento passa",
);
assert.equal(
  inviteBehaviorSchema.safeParse({}).success,
  true,
  "seção 3 inteira é opcional: nenhuma pergunta de comportamento é obrigatória",
);
assert.equal(
  inviteBehaviorSchema.safeParse({ temperament: { energy: "Altíssima" } }).success,
  false,
  "valor fora da lista falha",
);
assert.equal(
  inviteBehaviorSchema.safeParse({ temperament: { noise: ["Barulho inventado"] } }).success,
  false,
  "item inválido na múltipla escolha falha",
);

// ── invite-options ───────────────────────────────────────────────────────────
// Valores legados continuam ofertáveis: cães já cadastrados os têm gravados, e
// a tela do adestrador renderiza a string crua, sem tabela de/para.
assert.ok(isValidOption(ENERGY_OPTIONS, "Alta energia"), "valor legado de energia");
assert.ok(isValidOption(ENERGY_OPTIONS, "Hiperativo"), "legado 'Hiperativo' = rótulo 'Muito Alto'");
assert.ok(isValidOption(PEOPLE_OPTIONS, "Sociável com pessoas"), "valor legado com pessoas");
assert.ok(isValidOption(DOGS_OPTIONS, "Reativo a outros cães"), "valor legado com cães");

assert.equal(isValidOption(ENERGY_OPTIONS, "Altíssima"), false, "valor inventado é recusado");

// Rótulos vêm do Google Forms do adestrador.
assert.deepEqual(
  ENERGY_OPTIONS.map((o) => o.label),
  ["Baixo", "Médio", "Alto", "Muito Alto"],
  "escala de energia com as palavras do formulário",
);

// Múltipla escolha: as duas listas do formulário.
assert.equal(NOISE_OPTIONS.length, 4, "reação a barulhos tem 4 opções");
assert.equal(UNWANTED_BEHAVIOR_OPTIONS.length, 6, "comportamentos indesejados tem 6 opções");

// Nenhuma lista pode ter valor repetido: valor é o que vai para o banco.
for (const [nome, lista] of Object.entries({
  ENERGY_OPTIONS,
  PEOPLE_OPTIONS,
  DOGS_OPTIONS,
  NOISE_OPTIONS,
  UNWANTED_BEHAVIOR_OPTIONS,
})) {
  const vals = optionValues(lista);
  assert.equal(new Set(vals).size, vals.length, `${nome} tem valor duplicado`);
}

console.log("check-client-invite: OK");
