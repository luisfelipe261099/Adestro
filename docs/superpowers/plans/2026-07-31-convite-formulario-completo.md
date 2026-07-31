# Convite de autocadastro: formulário completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O convite vira o formulário único do autocadastro — as ~40 perguntas do Google Forms do adestrador, em 3 seções, salvando a cada seção para não perder quem abandona no meio.

**Architecture:** `ClientInvite` ganha `completedAt`, que separa "começou" de "terminou" e destrava um status novo, "Em preenchimento". O `POST /api/invite/[token]` passa a receber `{ section, data }`: a seção 1 cria `ClientProfile` + `Address` + `PortalAccessLink` numa transação, a 2 cria o `Dog`, a 3 grava os JSONs de comportamento e marca `completedAt`. As perguntas de comportamento cabem nas colunas JSON que o `Dog` já tem, então só duas colunas novas entram no schema.

**Tech Stack:** Next.js 16.2 (App Router), React 19, Prisma 5.22 sobre MySQL/TiDB, NextAuth v5 beta, Tailwind 4, zod 4. Testes com `node:assert/strict` via `node --experimental-strip-types` (`check:invite`, lógica pura) e `node` puro contra servidor local (`check:invite:e2e`).

**Spec:** `docs/superpowers/specs/2026-07-31-convite-formulario-completo-design.md`

## Global Constraints

- Português do Brasil em toda string visível ao usuário, incluindo mensagens de erro.
- O token em texto puro **nunca** é gravado: só `sha256` em `tokenHash` e os 10 primeiros caracteres em `tokenPrefix`.
- Toda rota pública passa por `rateLimit()` de `lib/rate-limit.ts`.
- Regra de negócio testável mora em `lib/`, nunca dentro de `route.ts`.
- `AGENTS.md` obriga: mudança visível ao usuário atualiza `app/tutorial/page.tsx`, `app/tutorial/cliente/page.tsx` e `components/product-tour.tsx` **no mesmo commit** (Task 9).
- **Não fazer `git push`.** Push na `master` dispara deploy automático na Vercel; a decisão é do usuário.
- Valores gravados nas colunas JSON **não mudam** para as perguntas que já existem. As palavras do Google Forms entram como rótulo visível. Cães já cadastrados continuam legíveis.
- Foto: reduzida no navegador para 1600 px no lado maior, JPEG 0.8, e recusada acima de 2 MB de base64.
- Antes de rodar qualquer coisa contra banco, seguir `docs/desenvolvedor/ambiente-local.md`. `npm run dev` **não funciona** neste projeto (Turbopack não resolve `tailwindcss` pelo symlink); use `npm run build:local && npm start`.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/client-invite.ts` (modificar) | Status com `completedAt`, `getInviteResumeStep` |
| `lib/invite-form.ts` (criar) | Opções de toda pergunta fechada **e** os schemas zod derivados delas |
| `lib/validators.ts` (modificar) | Perde o `clientInviteSchema`, que fica sem consumidor |

> **Correção feita na execução (31/07):** o plano original punha as opções em
> `lib/invite-options.ts` e os schemas em `lib/validators.ts`. Não fecha. O
> `check:invite` roda no Node puro, que não resolve o alias `@/` nem import
> relativo sem extensão; e import com `.ts` explícito quebra o `tsc` (TS5097,
> `moduleResolution: "bundler"` sem `allowImportingTsExtensions`). Com os schemas
> em `validators.ts`, ou eles ficavam sem teste, ou o typecheck quebrava.
> Os dois viraram `lib/invite-form.ts`, que depende só de `zod` — e são a mesma
> coisa de qualquer forma, já que os schemas derivam das listas de opção.
> Onde o plano disser `@/lib/invite-options` ou `@/lib/validators` para os
> schemas do convite, leia `@/lib/invite-form`.
| `prisma/schema.prisma` (modificar) | `ClientInvite.completedAt`, `Dog.preventiveCare` |
| `app/api/invite/[token]/route.ts` (modificar) | `GET` com `resumeStep`/`prefill`; `POST` por seção |
| `app/convite/[token]/invite-client.tsx` (modificar) | Orquestra as seções, retomada e envio |
| `app/convite/[token]/invite-fields.tsx` (criar) | Inputs compartilhados: texto, seleção, múltipla escolha, foto |
| `app/convite/[token]/section-client.tsx` (criar) | Seção 1 |
| `app/convite/[token]/section-dog.tsx` (criar) | Seção 2 |
| `app/convite/[token]/section-behavior.tsx` (criar) | Seção 3 |
| `components/client-invite-panel.tsx` (modificar) | Exibe "Em preenchimento" |
| `components/dog-behavior-card.tsx` (criar) | Renderiza as respostas para o adestrador |
| `app/clientes/[clientId]/page.tsx` (modificar) | Usa `<DogBehaviorCard />` |
| `scripts/check-client-invite.mts` (modificar) | Testes da lógica pura nova |
| `scripts/check-invite-e2e.mjs` (modificar) | Percorre 3 seções, abandona, retoma, conclui |

A tela do convite vira quatro arquivos de propósito. Hoje `invite-client.tsx` tem 189
linhas e um formulário só; com 40 campos viraria um arquivo de mais de mil, que é
exatamente o formato de `portal-onboarding-client.tsx` (1009 linhas) — o arquivo onde seis
campos ficaram declarados, enviados e nunca renderizados sem ninguém notar.

`lib/invite-options.ts` existe pelo mesmo motivo: as opções do onboarding estão inline no
JSX, então a tela do adestrador não tem como saber quais valores existem.

---

### Task 1: Lógica pura do progresso do convite

**Files:**
- Modify: `lib/client-invite.ts`
- Modify: `scripts/check-client-invite.mts`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces:
  - `InviteStatus = "Revogado" | "Usado" | "Em preenchimento" | "Expirado" | "Pendente"`
  - `InviteLifecycle = { revokedAt: Date | null; expiresAt: Date; clientId: string | null; completedAt: Date | null }`
  - `InviteProgress = { clientId: string | null; hasDog: boolean; completedAt: Date | null }`
  - `getInviteStatus(invite: InviteLifecycle, nowMs?: number): InviteStatus`
  - `canReenterInvite(invite: InviteLifecycle, nowMs?: number): boolean`
  - `getInviteResumeStep(progress: InviteProgress): 1 | 2 | 3`
  - `INVITE_SECTION_COUNT = 3`

- [ ] **Step 1: Escrever os testes que falham**

Em `scripts/check-client-invite.mts`, trocar o import por:

```ts
import {
  canReenterInvite,
  getInviteExpiryDate,
  getInviteResumeStep,
  getInviteStatus,
  normalizeInviteDays,
  INVITE_DEFAULT_DAYS,
  INVITE_SECTION_COUNT,
} from "../lib/client-invite.ts";
```

Os casos existentes de `getInviteStatus` e `canReenterInvite` passam objetos sem
`completedAt`. Acrescentar `completedAt: null` em **todos** eles — o tipo passou a exigir.
Depois, no fim do arquivo, antes do `console.log` final:

```ts
// ── getInviteStatus com completedAt ──────────────────────────────────────────
const feito = new Date(nowMs - 1000);

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
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  "Usado",
  "terminou",
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
assert.equal(
  getInviteStatus(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: null, completedAt: null },
    nowMs,
  ),
  "Expirado",
  "sem clientId o vencimento continua valendo",
);

// ── canReenterInvite exige ter terminado ─────────────────────────────────────
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
    { revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  true,
  "quem terminou reemite o portal",
);
assert.equal(
  canReenterInvite(
    { revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1", completedAt: feito },
    nowMs,
  ),
  false,
  "convite vencido não reemite nem para quem terminou",
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
assert.equal(INVITE_SECTION_COUNT, 3);
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npm run check:invite
```

Esperado: FALHA com `getInviteResumeStep is not a function` (ou erro de tipo em
`completedAt`, dependendo de qual estoura primeiro).

- [ ] **Step 3: Implementar**

Em `lib/client-invite.ts`, substituir o tipo, os dois tipos de lifecycle e as duas funções:

```ts
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
  // porque ele é gravado já ao fim da seção 1.
  completedAt: Date | null;
};

export type InviteProgress = {
  clientId: string | null;
  hasDog: boolean;
  completedAt: Date | null;
};

// A ordem abaixo é regra de negócio:
// 1. Revogado vence tudo — foi decisão do adestrador; "expirado" sugeriria que
//    bastaria esperar.
// 2. Usado vence expirado — o convite converteu, que é o desfecho de sucesso;
//    mostrar "Expirado" leria como falha.
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
// Exige completedAt: quem parou no meio precisa voltar ao formulário, e não
// receber um portal de um cadastro pela metade.
export function canReenterInvite(invite: InviteLifecycle, nowMs: number = Date.now()): boolean {
  if (invite.revokedAt) return false;
  if (!invite.completedAt) return false;
  return invite.expiresAt.getTime() > nowMs;
}

// Em que seção o tutor volta. Cada seção deixa um rastro no banco, e é ele que
// responde a pergunta — não um contador guardado no navegador, que se perde
// quando a pessoa troca de aparelho.
export function getInviteResumeStep(progress: InviteProgress): 1 | 2 | 3 {
  if (!progress.clientId) return 1;
  if (!progress.hasDog) return 2;
  return 3;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npm run check:invite
```

Esperado: `check-client-invite: OK`, sem `AssertionError`.

- [ ] **Step 5: Conferir quem quebrou**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "invite|completedAt" | head
```

Esperado: erros em `app/api/invite/[token]/route.ts` e
`app/api/client-invites/route.ts`, porque os `select` do Prisma ainda não trazem
`completedAt`. **Não corrigir agora** — são as Tasks 2 e 5. Só registrar que apareceram.

- [ ] **Step 6: Commit**

```bash
git add lib/client-invite.ts scripts/check-client-invite.mts
git commit -m "feat(convite): status Em preenchimento e retomada por secao"
```

---

### Task 2: Colunas novas no schema

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nada
- Produces: `clientInvite.completedAt: Date | null`, `dog.preventiveCare: string | null`

- [ ] **Step 1: Confirmar que o banco é local**

```bash
grep -o '@[^/]*' .env | head -1
```

Esperado: `@127.0.0.1:4000`. **Se apontar para host remoto, pare e pergunte** — `db push`
altera o schema direto, sem migration versionada.

- [ ] **Step 2: Adicionar os campos**

Em `model ClientInvite`, logo abaixo de `revokedAt`:

```prisma
  // Nulo = o tutor começou o formulário e não terminou. Distingue
  // "Em preenchimento" de "Usado"; clientId sozinho não distingue, porque é
  // gravado já ao fim da seção 1.
  completedAt DateTime?
```

Em `model Dog`, junto dos campos de saúde (perto de `vaccines`):

```prisma
  // Pergunta rápida do formulário: "Em dia" | "Pendente / Incompleto".
  // Coexiste com `vaccines`, que é a lista detalhada com datas e validade.
  preventiveCare         String?
```

- [ ] **Step 3: Aplicar e gerar o client**

```bash
npx prisma db push && npx prisma generate
```

Esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Confirmar no banco**

```bash
D=~/.local/share/mariadb-adestro
"$D/root/usr/bin/mariadb" --defaults-file="$D/my.cnf" -u root -D adestro \
  -e "DESCRIBE ClientInvite; DESCRIBE Dog;" | grep -E "completedAt|preventiveCare"
```

Esperado: duas linhas, ambas `YES` em Null.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(convite): completedAt no convite e preventiveCare no cao"
```

---

### Task 3: Opções das perguntas fechadas

**Files:**
- Create: `lib/invite-options.ts`
- Modify: `scripts/check-client-invite.mts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type InviteOption = { value: string; label: string }`
  - `ENERGY_OPTIONS`, `PEOPLE_OPTIONS`, `DOGS_OPTIONS`, `CHILDREN_OPTIONS`, `NOISE_OPTIONS`, `BITE_HISTORY_OPTIONS`, `RESOURCE_GUARDING_OPTIONS`, `HANDLING_OPTIONS`, `UNWANTED_BEHAVIOR_OPTIONS`, `PREVENTIVE_CARE_OPTIONS`, `SEX_OPTIONS`, `ALONE_TIME_OPTIONS`, `PROPERTY_TYPE_OPTIONS`, `TRAINING_HISTORY_OPTIONS` — todos `readonly InviteOption[]`
  - `isValidOption(options: readonly InviteOption[], value: string): boolean`
  - `optionValues(options: readonly InviteOption[]): string[]`

- [ ] **Step 1: Escrever o teste que falha**

No fim de `scripts/check-client-invite.mts`, antes do `console.log`:

```ts
import {
  DOGS_OPTIONS,
  ENERGY_OPTIONS,
  NOISE_OPTIONS,
  PEOPLE_OPTIONS,
  UNWANTED_BEHAVIOR_OPTIONS,
  isValidOption,
  optionValues,
} from "../lib/invite-options.ts";

// Valores legados continuam ofertáveis: cães já cadastrados os têm gravados, e
// a tela do adestrador renderiza a string crua.
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
  ENERGY_OPTIONS, PEOPLE_OPTIONS, DOGS_OPTIONS, NOISE_OPTIONS, UNWANTED_BEHAVIOR_OPTIONS,
})) {
  const vals = optionValues(lista);
  assert.equal(new Set(vals).size, vals.length, `${nome} tem valor duplicado`);
}
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npm run check:invite
```

Esperado: FALHA com `Cannot find module '../lib/invite-options.ts'`.

- [ ] **Step 3: Implementar `lib/invite-options.ts`**

```ts
// Opções de toda pergunta fechada do formulário de convite.
//
// Existe como arquivo próprio porque as opções são lidas em dois lugares que não
// se enxergam: o formulário do tutor e a tela do adestrador que mostra as
// respostas. No onboarding do portal elas estão inline no JSX, e foi assim que
// seis campos ficaram declarados, enviados e nunca renderizados sem ninguém ver.
//
// `value` é o que vai para o banco. `label` é o que o tutor lê.
// Os dois diferem quando há valor legado a preservar: cães cadastrados antes
// deste formulário já têm o valor antigo gravado, e a tela do adestrador
// renderiza a string crua, sem tabela de/para.

export type InviteOption = { value: string; label: string };

export function optionValues(options: readonly InviteOption[]): string[] {
  return options.map((option) => option.value);
}

export function isValidOption(options: readonly InviteOption[], value: string): boolean {
  return options.some((option) => option.value === value);
}

// ── Cão ──────────────────────────────────────────────────────────────────────

export const SEX_OPTIONS: readonly InviteOption[] = [
  { value: "Macho", label: "Macho" },
  { value: "Fêmea", label: "Fêmea" },
];

export const PREVENTIVE_CARE_OPTIONS: readonly InviteOption[] = [
  { value: "Em dia", label: "Em dia" },
  { value: "Pendente / Incompleto", label: "Pendente / Incompleto" },
];

// ── Temperamento ─────────────────────────────────────────────────────────────

// Rótulos do formulário; valores preservados do onboarding.
export const ENERGY_OPTIONS: readonly InviteOption[] = [
  { value: "Baixa energia", label: "Baixo" },
  { value: "Energia moderada", label: "Médio" },
  { value: "Alta energia", label: "Alto" },
  { value: "Hiperativo", label: "Muito Alto" },
];

export const PEOPLE_OPTIONS: readonly InviteOption[] = [
  { value: "Sociável com pessoas", label: "Dócil / Amigável" },
  { value: "Desconfiado com estranhos", label: "Desconfiado" },
  { value: "Agressivo com estranhos", label: "Reativo" },
  { value: "Muito amedrontado com estranhos", label: "Muito Amedrontado" },
];

export const DOGS_OPTIONS: readonly InviteOption[] = [
  { value: "Amigável com outros cães", label: "Amigável" },
  { value: "Neutro com outros cães", label: "Neutro" },
  { value: "Reativo a outros cães", label: "Reativo / Agressivo" },
  { value: "Medroso com outros cães", label: "Medroso" },
];

export const CHILDREN_OPTIONS: readonly InviteOption[] = [
  { value: "Excelente com crianças", label: "Excelente" },
  { value: "Tolerante com crianças", label: "Tolerante" },
  { value: "Não acostumado com crianças", label: "Não acostumado" },
  { value: "Reativo com crianças", label: "Reativo" },
];

export const NOISE_OPTIONS: readonly InviteOption[] = [
  { value: "Tranquilo com barulhos", label: "Tranquilo / Normal" },
  { value: "Fica ansioso com barulhos", label: "Fica ansioso" },
  { value: "Se esconde com barulhos", label: "Procura se esconder" },
  { value: "Entra em pânico com barulhos", label: "Tenta fugir / Pânico" },
];

export const BITE_HISTORY_OPTIONS: readonly InviteOption[] = [
  { value: "Sem histórico de mordida", label: "Não" },
  { value: "Tem histórico de mordida", label: "Sim (descreva nas observações)" },
];

export const RESOURCE_GUARDING_OPTIONS: readonly InviteOption[] = [
  { value: "Protege recursos", label: "Sim" },
  { value: "Não protege recursos", label: "Não" },
];

export const HANDLING_OPTIONS: readonly InviteOption[] = [
  { value: "Aceita manipulação", label: "Aceita bem" },
  { value: "Aceita manipulação com restrições", label: "Com restrições" },
  { value: "Não aceita manipulação", label: "Não aceita" },
];

export const UNWANTED_BEHAVIOR_OPTIONS: readonly InviteOption[] = [
  { value: "Latidos em excesso", label: "Latidos em excesso" },
  { value: "Destruição de objetos/móveis", label: "Destruição de objetos/móveis" },
  { value: "Ansiedade de separação", label: "Ansiedade de separação" },
  { value: "Necessidades fora do lugar", label: "Necessidades fora do lugar" },
  { value: "Puxa muito a guia", label: "Puxa muito a guia" },
  { value: "Outros", label: "Outros" },
];

// ── Ambiente e histórico ─────────────────────────────────────────────────────

export const ALONE_TIME_OPTIONS: readonly InviteOption[] = [
  { value: "Fica pouco sozinho (menos de 2h)", label: "Menos de 2h" },
  { value: "2–4h", label: "2h a 4h" },
  { value: "4–8h", label: "4h a 8h" },
  { value: "Fica muito sozinho (mais de 8h)", label: "Mais de 8h" },
];

export const PROPERTY_TYPE_OPTIONS: readonly InviteOption[] = [
  { value: "Apartamento", label: "Apartamento" },
  { value: "Casa com quintal livre", label: "Casa com quintal livre" },
  { value: "Casa com acesso restrito ao quintal", label: "Casa sem quintal livre" },
  { value: "Sítio / Chácara", label: "Sítio / Chácara" },
];

// "Nunca foi adestrado" era o valor que o onboarding gravava em TODO cão sem
// nunca perguntar. Vira opção de verdade, escolhida pelo tutor.
export const TRAINING_HISTORY_OPTIONS: readonly InviteOption[] = [
  { value: "Nunca foi adestrado", label: "Nunca foi adestrado" },
  { value: "Já fez adestramento básico", label: "Já fez adestramento básico" },
  { value: "Já fez adestramento avançado", label: "Já fez adestramento avançado" },
  { value: "Está em adestramento com outro profissional", label: "Está com outro profissional" },
];
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npm run check:invite
```

Esperado: `check-client-invite: OK`.

- [ ] **Step 5: Commit**

```bash
git add lib/invite-options.ts scripts/check-client-invite.mts
git commit -m "feat(convite): opcoes das perguntas em um lugar so"
```

---

### Task 4: Schemas de validação por seção

**Files:**
- Modify: `lib/validators.ts`
- Modify: `scripts/check-client-invite.mts`

**Interfaces:**
- Consumes: `lib/invite-options.ts` (Task 3)
- Produces:
  - `inviteClientSchema`, `inviteDogSchema`, `inviteBehaviorSchema` (zod)
  - `InviteClientInput`, `InviteDogInput`, `InviteBehaviorInput`
  - `INVITE_PHOTO_MAX_BYTES = 2_000_000`

O `clientInviteSchema` atual **sai**: nada mais o consome depois da Task 5.

- [ ] **Step 1: Escrever os testes que falham**

No fim de `scripts/check-client-invite.mts`, antes do `console.log`, e trocando o import de
`clientInviteSchema` por:

```ts
import {
  inviteBehaviorSchema,
  inviteClientSchema,
  inviteDogSchema,
} from "../lib/validators.ts";
```

Remover os cinco asserts antigos de `clientInviteSchema` e pôr:

```ts
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
    clientName: "Maria", phone: "41999998888", email: "nao-e-email",
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
    clientName: "Maria", phone: "41999998888",
    address: { zipCode: "80000-000", street: "Rua A", number: "10", city: "Curitiba", state: "PR" },
    emergencyName: "João", emergencyPhone: "41988887777",
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
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npm run check:invite
```

Esperado: FALHA com `inviteClientSchema is not exported`.

- [ ] **Step 3: Implementar**

Em `lib/validators.ts`, **remover** o bloco de `clientInviteSchema` e o
`export type ClientInviteInput`, e pôr no lugar:

```ts
import {
  ALONE_TIME_OPTIONS,
  BITE_HISTORY_OPTIONS,
  CHILDREN_OPTIONS,
  DOGS_OPTIONS,
  ENERGY_OPTIONS,
  HANDLING_OPTIONS,
  NOISE_OPTIONS,
  PEOPLE_OPTIONS,
  PREVENTIVE_CARE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  RESOURCE_GUARDING_OPTIONS,
  SEX_OPTIONS,
  TRAINING_HISTORY_OPTIONS,
  UNWANTED_BEHAVIOR_OPTIONS,
  optionValues,
  type InviteOption,
} from "@/lib/invite-options";

// Base64 de uma foto já reduzida no navegador. O limite existe porque a rota é
// pública e o banco guarda a string inteira num LongText.
export const INVITE_PHOTO_MAX_BYTES = 2_000_000;

const oneOf = (options: readonly InviteOption[]) =>
  z.enum(optionValues(options) as [string, ...string[]]).optional();

const manyOf = (options: readonly InviteOption[]) =>
  z.array(z.enum(optionValues(options) as [string, ...string[]])).optional();

const optionalText = (max: number) => z.string().trim().max(max).optional();

// ── Seção 1: dados do cliente ────────────────────────────────────────────────
export const inviteClientSchema = z.object({
  clientName: z.string().trim().min(1, "Informe seu nome").max(120),
  // Obrigatório: é por ele que o adestrador retoma quem abandona o formulário.
  phone: z.string().trim().min(8, "Informe seu WhatsApp").max(20),
  cpf: optionalText(20),
  email: z
    .string()
    .email("E-mail inválido")
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: z
    .object({
      zipCode: optionalText(12),
      street: optionalText(120),
      number: optionalText(12),
      complement: optionalText(60),
      neighborhood: optionalText(80),
      city: optionalText(80),
      state: optionalText(2),
    })
    .optional(),
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(20),
});

// ── Seção 2: dados do cão ────────────────────────────────────────────────────
export const inviteDogSchema = z.object({
  dogName: z.string().trim().min(1, "Informe o nome do cão").max(80),
  breed: optionalText(80),
  birthDate: optionalText(10),
  age: optionalText(40),
  sex: oneOf(SEX_OPTIONS),
  castrated: z.boolean().optional(),
  weight: optionalText(40),
  microchip: optionalText(60),
  color: optionalText(60),
  preventiveCare: oneOf(PREVENTIVE_CARE_OPTIONS),
  vaccines: z
    .array(
      z.object({
        name: z.string().trim().max(80),
        date: optionalText(10),
        validity: optionalText(10),
        alert: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
  dietRestrictions: optionalText(500),
  healthConditions: optionalText(500),
  veterinarian: optionalText(200),
  photoUrl: z
    .string()
    .max(INVITE_PHOTO_MAX_BYTES, "A foto é grande demais. Tente uma imagem menor.")
    .optional(),
});

// ── Seção 3: comportamento e rotina ──────────────────────────────────────────
// Nada aqui é obrigatório: é a seção mais longa, e barrar o envio por causa dela
// perderia o cadastro inteiro de quem já respondeu as duas primeiras.
export const inviteBehaviorSchema = z.object({
  temperament: z
    .object({
      energy: oneOf(ENERGY_OPTIONS),
      social: oneOf(PEOPLE_OPTIONS),
      dogs: oneOf(DOGS_OPTIONS),
      children: oneOf(CHILDREN_OPTIONS),
      noise: manyOf(NOISE_OPTIONS),
      biteHistory: oneOf(BITE_HISTORY_OPTIONS),
      resourceGuarding: oneOf(RESOURCE_GUARDING_OPTIONS),
      handling: oneOf(HANDLING_OPTIONS),
      unwantedBehaviors: manyOf(UNWANTED_BEHAVIOR_OPTIONS),
      behavior: optionalText(1000),
      positive: optionalText(1000),
    })
    .optional(),
  routine: z
    .object({
      alimentation: optionalText(500),
      walks: optionalText(500),
      plays: optionalText(500),
      sleep: optionalText(500),
    })
    .optional(),
  environmentalAnalysis: z
    .object({
      aloneTime: oneOf(ALONE_TIME_OPTIONS),
      convive: optionalText(300),
      history: oneOf(TRAINING_HISTORY_OPTIONS),
    })
    .optional(),
  trainingGoals: z
    .object({
      obediencia: z.boolean().optional(),
      comportamento: z.boolean().optional(),
      passeio: z.boolean().optional(),
      avancado: z.boolean().optional(),
      reabilitacao: z.boolean().optional(),
    })
    .optional(),
  propertyType: oneOf(PROPERTY_TYPE_OPTIONS),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
export type InviteDogInput = z.infer<typeof inviteDogSchema>;
export type InviteBehaviorInput = z.infer<typeof inviteBehaviorSchema>;
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npm run check:invite && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i validators | head
```

Esperado: `check-client-invite: OK` e nenhuma linha de `validators`.

- [ ] **Step 5: Commit**

```bash
git add lib/validators.ts scripts/check-client-invite.mts
git commit -m "feat(convite): validacao por secao do formulario completo"
```

---

### Task 5: API pública por seção

**Files:**
- Modify: `app/api/invite/[token]/route.ts`

**Interfaces:**
- Consumes: `getInviteStatus`, `canReenterInvite`, `getInviteResumeStep` (Task 1); `completedAt`/`preventiveCare` (Task 2); `inviteClientSchema`, `inviteDogSchema`, `inviteBehaviorSchema` (Task 4)
- Produces:
  - `GET` → `{ trainerName, status, alreadyUsed, resumeStep, prefill }`
  - `POST { section: 1, data }` → `{ ok: true, resumeStep: 2 }`
  - `POST { section: 2, data }` → `{ ok: true, resumeStep: 3 }`
  - `POST { section: 3, data }` → `{ portalUrl }`
  - `POST` sem corpo → `{ portalUrl }` (reentrada de quem terminou)

- [ ] **Step 1: Ampliar `resolveInvite`**

Substituir a função por:

```ts
async function resolveInvite(rawToken: string) {
  const token = (rawToken || "").trim();
  if (!token || token.length < 20) return null;

  return prisma.clientInvite.findUnique({
    where: { tokenHash: hashPortalToken(token) },
    select: {
      id: true,
      trainerId: true,
      expiresAt: true,
      revokedAt: true,
      clientId: true,
      completedAt: true,
      trainer: { select: { id: true, name: true } },
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          cpf: true,
          propertyType: true,
          secondContactName: true,
          secondContactPhone: true,
          addresses: { take: 1, orderBy: { createdAt: "asc" } },
          dogs: { take: 1, orderBy: { id: "asc" } },
        },
      },
    },
  });
}

type ResolvedInvite = NonNullable<Awaited<ReturnType<typeof resolveInvite>>>;

const firstDog = (invite: ResolvedInvite) => invite.client?.dogs?.[0] ?? null;

function progressOf(invite: ResolvedInvite) {
  return {
    clientId: invite.clientId,
    hasDog: !!firstDog(invite),
    completedAt: invite.completedAt,
  };
}
```

- [ ] **Step 2: Reescrever o `GET`**

Substituir o corpo do `GET` a partir de `const status = getInviteStatus(invite);`:

```ts
  const status = getInviteStatus(invite);
  const reentry = canReenterInvite(invite);

  // "Em preenchimento" é atendível: é exatamente quem precisa voltar ao
  // formulário. Só Revogado e Expirado fecham a porta.
  if (status === "Revogado" || status === "Expirado") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const dog = firstDog(invite);
  const address = invite.client?.addresses?.[0] ?? null;

  // Só dados DESTE cadastro, alcançados pelo clientId do próprio convite.
  // A rota é pública: nada de outros clientes do adestrador.
  const prefill = invite.client
    ? {
        clientName: invite.client.name,
        phone: invite.client.phone ?? "",
        email: invite.client.email ?? "",
        cpf: invite.client.cpf ?? "",
        emergencyName: invite.client.secondContactName ?? "",
        emergencyPhone: invite.client.secondContactPhone ?? "",
        propertyType: invite.client.propertyType ?? "",
        address: address
          ? {
              zipCode: address.zipCode ?? "", street: address.street ?? "",
              number: address.number ?? "", complement: address.complement ?? "",
              neighborhood: address.neighborhood ?? "", city: address.city ?? "",
              state: address.state ?? "",
            }
          : null,
        dog: dog
          ? {
              dogName: dog.name, breed: dog.breed ?? "", birthDate: dog.birthDate ?? "",
              age: dog.age ?? "", sex: dog.sex ?? "", castrated: !!dog.castrated,
              weight: dog.weight ?? "", microchip: dog.microchip ?? "",
              color: dog.color ?? "", preventiveCare: dog.preventiveCare ?? "",
              dietRestrictions: dog.dietRestrictions ?? "",
              healthConditions: dog.healthConditions ?? "",
              veterinarian: dog.veterinarian ?? "",
              photoUrl: dog.photoUrl ?? "",
              vaccines: safeJson(dog.vaccines, []),
              temperament: safeJson(dog.temperament, {}),
              routine: safeJson(dog.routine, {}),
              environmentalAnalysis: safeJson(dog.environmentalAnalysis, {}),
              trainingGoals: safeJson(dog.trainingGoals, {}),
            }
          : null,
      }
    : null;

  return NextResponse.json({
    trainerName: invite.trainer.name,
    status,
    alreadyUsed: reentry,
    resumeStep: getInviteResumeStep(progressOf(invite)),
    prefill,
  });
}

// JSON gravado por versões anteriores pode estar malformado; um throw aqui
// derrubaria a tela do tutor por causa de um campo de exibição.
function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
```

- [ ] **Step 3: Reescrever o `POST`**

Trocar todo o trecho a partir de `const status = getInviteStatus(invite);` (linha 115 do
arquivo atual) até o fim da função por:

```ts
  const status = getInviteStatus(invite);
  if (status === "Revogado" || status === "Expirado") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const body = (await request.json().catch(() => ({}))) as { section?: number; data?: unknown };

  // ── Seção 1: cria o cadastro. É aqui que o lead deixa de se perder ─────────
  if (body.section === 1) {
    const parsed = inviteClientSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (invite.clientId) {
      // Voltou e reenviou a seção 1: atualiza, não duplica.
      await prisma.clientProfile.update({
        where: { id: invite.clientId },
        data: {
          name: data.clientName,
          phone: data.phone,
          email: data.email ?? "",
          cpf: data.cpf ?? "",
          secondContactName: data.emergencyName ?? "",
          secondContactPhone: data.emergencyPhone ?? "",
        },
      });
      if (data.address) {
        const existing = await prisma.address.findFirst({
          where: { clientProfileId: invite.clientId },
          orderBy: { createdAt: "asc" },
        });
        const addressData = {
          nickname: "Casa",
          zipCode: data.address.zipCode ?? "", street: data.address.street ?? "",
          number: data.address.number ?? "", complement: data.address.complement ?? "",
          neighborhood: data.address.neighborhood ?? "", city: data.address.city ?? "",
          state: data.address.state ?? "", isDefault: true,
        };
        if (existing) {
          await prisma.address.update({ where: { id: existing.id }, data: addressData });
        } else {
          await prisma.address.create({
            data: { ...addressData, clientProfileId: invite.clientId },
          });
        }
      }
      return NextResponse.json({ ok: true, resumeStep: 2 });
    }

    const portalToken = buildPortalToken();

    // Transação: sem ela, uma falha ao criar o portal deixa cliente órfão e
    // convite queimado — a pessoa recarrega e não consegue mais entrar.
    await prisma.$transaction(async (tx) => {
      const client = await tx.clientProfile.create({
        data: {
          trainerId: invite.trainerId,
          name: data.clientName,
          phone: data.phone,
          email: data.email ?? "",
          cpf: data.cpf ?? "",
          secondContactName: data.emergencyName ?? "",
          secondContactPhone: data.emergencyPhone ?? "",
          status: "Rascunho", // aguarda aprovação do adestrador
        },
      });

      if (data.address) {
        await tx.address.create({
          data: {
            clientProfileId: client.id,
            nickname: "Casa",
            zipCode: data.address.zipCode ?? "", street: data.address.street ?? "",
            number: data.address.number ?? "", complement: data.address.complement ?? "",
            neighborhood: data.address.neighborhood ?? "", city: data.address.city ?? "",
            state: data.address.state ?? "", isDefault: true,
          },
        });
      }

      await tx.portalAccessLink.create({
        data: {
          trainerId: invite.trainerId,
          clientId: client.id,
          tokenHash: hashPortalToken(portalToken),
          tokenPrefix: getTokenPrefix(portalToken),
          expiresAt: getPortalExpiryDate(PORTAL_LINK_DEFAULT_DAYS),
        },
      });

      await tx.clientInvite.update({
        where: { id: invite.id },
        data: { clientId: client.id },
      });
    });

    return NextResponse.json({ ok: true, resumeStep: 2 });
  }

  // Seções 2 e 3 atualizam o que a seção 1 criou. Sem clientId não há o que
  // atualizar, e criar aqui produziria cadastro sem nome nem telefone.
  if (!invite.clientId) {
    return NextResponse.json(
      { error: "Comece pelo primeiro passo do formulário." },
      { status: 409 },
    );
  }

  // ── Seção 2: o cão ─────────────────────────────────────────────────────────
  if (body.section === 2) {
    const parsed = inviteDogSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const dogData = {
      name: data.dogName,
      breed: data.breed ?? "", birthDate: data.birthDate ?? "", age: data.age ?? "",
      sex: data.sex ?? null, castrated: data.castrated ?? false,
      weight: data.weight ?? "", microchip: data.microchip ?? "", color: data.color ?? "",
      preventiveCare: data.preventiveCare ?? null,
      vaccines: data.vaccines ? JSON.stringify(data.vaccines) : null,
      dietRestrictions: data.dietRestrictions ?? "",
      healthConditions: data.healthConditions ?? "",
      veterinarian: data.veterinarian ?? "",
      photoUrl: data.photoUrl || null,
    };

    const existing = firstDog(invite);
    if (existing) {
      await prisma.dog.update({ where: { id: existing.id }, data: dogData });
    } else {
      await prisma.dog.create({
        data: { ...dogData, clientId: invite.clientId, trainingTypes: "[]" },
      });
    }
    return NextResponse.json({ ok: true, resumeStep: 3 });
  }

  // ── Seção 3: comportamento; fecha o convite ────────────────────────────────
  if (body.section === 3) {
    const parsed = inviteBehaviorSchema.safeParse(body.data ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const dog = firstDog(invite);
    if (!dog) {
      return NextResponse.json(
        { error: "Preencha os dados do cão antes de continuar." },
        { status: 409 },
      );
    }

    await prisma.dog.update({
      where: { id: dog.id },
      data: {
        temperament: data.temperament ? JSON.stringify(data.temperament) : dog.temperament,
        routine: data.routine ? JSON.stringify(data.routine) : dog.routine,
        environmentalAnalysis: data.environmentalAnalysis
          ? JSON.stringify(data.environmentalAnalysis)
          : dog.environmentalAnalysis,
        trainingGoals: data.trainingGoals ? JSON.stringify(data.trainingGoals) : dog.trainingGoals,
      },
    });

    if (data.propertyType) {
      await prisma.clientProfile.update({
        where: { id: invite.clientId },
        data: { propertyType: data.propertyType },
      });
    }

    await prisma.clientInvite.update({
      where: { id: invite.id },
      data: { completedAt: new Date() },
    });

    const portalToken = buildPortalToken();
    await prisma.portalAccessLink.upsert({
      where: { clientId: invite.clientId },
      update: {
        trainerId: invite.trainerId,
        tokenHash: hashPortalToken(portalToken),
        tokenPrefix: getTokenPrefix(portalToken),
        expiresAt: getPortalExpiryDate(PORTAL_LINK_DEFAULT_DAYS),
        revokedAt: null,
      },
      create: {
        trainerId: invite.trainerId,
        clientId: invite.clientId,
        tokenHash: hashPortalToken(portalToken),
        tokenPrefix: getTokenPrefix(portalToken),
        expiresAt: getPortalExpiryDate(PORTAL_LINK_DEFAULT_DAYS),
      },
    });

    // Fora da transação de propósito: push é efeito colateral externo. Serviço
    // fora do ar não pode derrubar o cadastro — por isso a função engole os
    // próprios erros. É aguardado, e não disparado solto, porque em serverless
    // o processo morre junto com a resposta.
    await notifyTrainer(
      invite.trainerId,
      invite.client?.name ?? "Novo cliente",
      dog.name,
    );

    return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
  }

  return NextResponse.json({ error: "Passo inválido do formulário." }, { status: 400 });
}
```

Ajustar os imports do topo: trocar `clientInviteSchema` por
`inviteBehaviorSchema, inviteClientSchema, inviteDogSchema` e acrescentar
`getInviteResumeStep` ao import de `@/lib/client-invite`.

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "invite" | head
```

Esperado: nenhuma linha. Se `app/api/client-invites/route.ts` reclamar de `completedAt`
faltando no `select`, acrescentar `completedAt: true` ao `SELECT` de lá — o `toItem` chama
`getInviteStatus`, que agora exige o campo.

- [ ] **Step 5: Commit**

```bash
git add "app/api/invite/[token]/route.ts" app/api/client-invites/route.ts
git commit -m "feat(convite): API publica em tres secoes com salvamento progressivo"
```

---

### Task 6: Formulário em três seções

**Files:**
- Create: `app/convite/[token]/invite-fields.tsx`
- Create: `app/convite/[token]/section-client.tsx`
- Create: `app/convite/[token]/section-dog.tsx`
- Create: `app/convite/[token]/section-behavior.tsx`
- Modify: `app/convite/[token]/invite-client.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/invite/[token]` (Task 5); `lib/invite-options.ts` (Task 3)
- Produces: rota `/convite/<token>` com formulário de 3 seções e retomada

- [ ] **Step 1: Campos compartilhados**

Criar `app/convite/[token]/invite-fields.tsx`. Ler antes as classes que
`invite-client.tsx` já usa e reaproveitá-las; **não inventar classe nova**.

```tsx
"use client";

import { useRef } from "react";
import type { InviteOption } from "@/lib/invite-options";

export function TextField({ label, value, onChange, required, ...rest }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; inputMode?: "tel" | "email" | "text"; placeholder?: string;
}) {
  return (
    <label className="block text-[13px]">
      {label}{required && <span className="text-[var(--danger)]"> *</span>}
      <input
        {...rest}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1 w-full"
      />
    </label>
  );
}

export function TextAreaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block text-[13px]">
      {label}
      <textarea
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1 w-full"
      />
    </label>
  );
}

// Rádio, e não <select>, porque é assim que o formulário original mostrava e
// porque no celular a lista aberta poupa um toque por pergunta.
export function ChoiceField({ label, options, value, onChange }: {
  label: string; options: readonly InviteOption[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <fieldset className="block text-[13px]">
      <legend>{label}</legend>
      <div className="mt-1 grid gap-1">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={label}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MultiChoiceField({ label, options, values, onChange }: {
  label: string; options: readonly InviteOption[]; values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="block text-[13px]">
      <legend>{label}</legend>
      <div className="mt-1 grid gap-1">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...values, option.value]
                    : values.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Reduz antes de enviar: a rota é pública e o banco guarda a string base64
// inteira. Sem isso, uma foto de celular passa fácil de 5 MB.
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_MAX_BYTES = 2_000_000;

export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo não parece ser uma imagem."));
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (dataUrl.length > PHOTO_MAX_BYTES) {
          return reject(new Error("A foto é grande demais. Tente uma imagem menor."));
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoField({ value, onChange, onError }: {
  value: string; onChange: (v: string) => void; onError: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="block text-[13px]">
      Foto do cão
      {value && <img src={value} alt="Prévia da foto" className="mt-1 h-24 w-24 rounded-md object-cover" />}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="mt-1 w-full text-[12px]"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            onChange(await shrinkImage(file));
          } catch (error) {
            onError(error instanceof Error ? error.message : "Não foi possível usar essa foto.");
            if (ref.current) ref.current.value = "";
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Seção 1**

Criar `app/convite/[token]/section-client.tsx`, exportando
`export type ClientSectionValue = { clientName: string; phone: string; cpf: string; email: string; emergencyName: string; emergencyPhone: string; address: { zipCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string } }`
e um componente `SectionClient({ value, onChange })` que renderiza, com `TextField`:
nome completo (obrigatório), CPF ou RG, WhatsApp (obrigatório, `inputMode="tel"`), e-mail
(`type="email"`), CEP, rua, número, complemento, bairro, cidade, UF, e contato de
emergência (nome e telefone). `onChange` recebe o objeto inteiro com o campo trocado.

- [ ] **Step 3: Seção 2**

Criar `app/convite/[token]/section-dog.tsx` com `DogSectionValue` e `SectionDog`.
Campos, nesta ordem: nome do cão (obrigatório), `PhotoField`, raça/SRD, data de nascimento
(`type="date"`), idade aproximada, `ChoiceField` de sexo (`SEX_OPTIONS`), castrado
(checkbox), porte/peso, microchip, cor, `ChoiceField` de vacinação e antipulgas
(`PREVENTIVE_CARE_OPTIONS`), `TextAreaField` de alergias/problemas de saúde/medicamentos
(escreve em `dietRestrictions` e `healthConditions` — dois campos separados), e veterinário.

A lista de vacinas com data e validade fica igual à do onboarding: reaproveitar o padrão de
`portal-onboarding-client.tsx` linhas 773-795, sem copiar o arquivo inteiro.

- [ ] **Step 4: Seção 3**

Criar `app/convite/[token]/section-behavior.tsx` com `BehaviorSectionValue` e
`SectionBehavior`, montando o payload no formato que `inviteBehaviorSchema` espera
(`temperament`, `routine`, `environmentalAnalysis`, `trainingGoals`, `propertyType`).

Perguntas, na ordem do formulário original: energia (`ENERGY_OPTIONS`), convivência com
pessoas (`PEOPLE_OPTIONS`), com outros cães (`DOGS_OPTIONS`), com crianças
(`CHILDREN_OPTIONS`), reação a barulhos (`MultiChoiceField`, `NOISE_OPTIONS`), histórico de
mordidas (`BITE_HISTORY_OPTIONS`), proteção de recursos (`RESOURCE_GUARDING_OPTIONS`),
aceita manipulação (`HANDLING_OPTIONS`), comportamentos indesejados (`MultiChoiceField`,
`UNWANTED_BEHAVIOR_OPTIONS`), rotina de alimentação, de passeios, de brincadeiras e de
sono (`TextAreaField`), tempo sozinho (`ALONE_TIME_OPTIONS`), tipo de imóvel
(`PROPERTY_TYPE_OPTIONS`), já foi adestrado (`TRAINING_HISTORY_OPTIONS`), objetivos de
treino (checkboxes) e observações adicionais (`TextAreaField` → `temperament.behavior`).

- [ ] **Step 5: Orquestrar em `invite-client.tsx`**

Reescrever para: buscar o `GET`, abrir na seção de `resumeStep` com `prefill`, mostrar
"Seção N de 3", botões "Voltar" e "Avançar", e no fim "Concluir". Cada avanço faz
`POST { section, data }` e só passa adiante se a resposta for `ok`. Ao concluir,
`window.location.href = data.portalUrl`.

Regras de tela que **não** podem ser esquecidas:

- `alreadyUsed === true` continua mostrando "Você já se cadastrou" com "Abrir meu portal",
  como hoje. Isso agora só acontece para quem terminou.
- `status === "Em preenchimento"` abre o formulário na seção certa, **não** a tela de
  "já se cadastrou".
- O texto de abertura deixa de prometer "menos de um minuto". Usar:
  *"Você foi convidado por **{trainerName}**. São algumas perguntas sobre você e sobre seu
  cão. Dá para parar e voltar depois pelo mesmo link."*
- Erro de uma seção não pode apagar o que já foi digitado nas outras.

- [ ] **Step 6: Conferir as classes utilitárias**

```bash
grep -n "\.input\|\.btn-primary\|\.btn-secondary" app/globals.css | head
```

Se alguma não existir, usar as que `app/convite/[token]/invite-client.tsx` já usava antes
desta mudança. Não inventar classe nova.

- [ ] **Step 7: Verificar tipos e build**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "convite|section-" | head
npm run build:local
```

Esperado: nenhuma linha do `grep`; build conclui sem erro.

- [ ] **Step 8: Commit**

```bash
git add "app/convite"
git commit -m "feat(convite): formulario em tres secoes com retomada"
```

---

### Task 7: "Em preenchimento" no painel do adestrador

**Files:**
- Modify: `components/client-invite-panel.tsx`

**Interfaces:**
- Consumes: `InviteStatus` (Task 1); `GET /api/client-invites` (já existe)
- Produces: nada consumido por outras tasks

- [ ] **Step 1: Ampliar o type e a lista**

Em `components/client-invite-panel.tsx`, no type `Invite`, trocar:

```ts
  status: "Revogado" | "Usado" | "Expirado" | "Pendente";
```

por:

```ts
  status: "Revogado" | "Usado" | "Em preenchimento" | "Expirado" | "Pendente";
```

O botão "Revogar" hoje aparece só quando `status === "Pendente"`. Passar a aparecer também
em "Em preenchimento": o adestrador precisa poder cancelar um link que alguém começou a
usar indevidamente.

```tsx
{(invite.status === "Pendente" || invite.status === "Em preenchimento") && (
  <button type="button" onClick={() => revoke(invite.id)} className="btn-secondary">
    Revogar
  </button>
)}
```

- [ ] **Step 2: Explicar o status na tela**

Abaixo da lista, acrescentar uma linha de legenda — sem ela "Em preenchimento" não diz ao
adestrador o que fazer:

```tsx
<p className="mt-3 text-[12px] text-[var(--muted)]">
  <strong>Em preenchimento</strong> é quem abriu o link e ainda não terminou. O contato já
  está salvo como rascunho em Clientes — dá para ligar sem esperar ele voltar.
</p>
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "invite-panel" | head
```

Esperado: nenhuma linha.

- [ ] **Step 4: Commit**

```bash
git add components/client-invite-panel.tsx
git commit -m "feat(convite): painel mostra quem comecou e nao terminou"
```

---

### Task 8: O adestrador vê as respostas

**Files:**
- Create: `components/dog-behavior-card.tsx`
- Modify: `app/clientes/[clientId]/page.tsx`

**Interfaces:**
- Consumes: `lib/invite-options.ts` (Task 3)
- Produces: `<DogBehaviorCard dog={dog} />`

Sem esta task o tutor responde 25 perguntas que ninguém lê — que é exatamente o estado de
`routine.sleep` hoje.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

type Json = Record<string, unknown>;

function parse(raw: string | null | undefined): Json {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Json) : {};
  } catch {
    return {};
  }
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const list = (v: unknown) =>
  Array.isArray(v) && v.length ? (v as string[]).join(", ") : null;

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-2 py-1 text-[12.5px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function DogBehaviorCard({ dog }: {
  dog: { temperament?: string | null; routine?: string | null; environmentalAnalysis?: string | null; preventiveCare?: string | null };
}) {
  const temperament = parse(dog.temperament);
  const routine = parse(dog.routine);
  const env = parse(dog.environmentalAnalysis);

  const rows = [
    { label: "Vacinação/antipulgas", value: text(dog.preventiveCare) },
    { label: "Energia", value: text(temperament.energy) },
    { label: "Com pessoas", value: text(temperament.social) },
    { label: "Com outros cães", value: text(temperament.dogs) },
    { label: "Com crianças", value: text(temperament.children) },
    { label: "Barulhos fortes", value: list(temperament.noise) },
    { label: "Histórico de mordida", value: text(temperament.biteHistory) },
    { label: "Proteção de recursos", value: text(temperament.resourceGuarding) },
    { label: "Aceita manipulação", value: text(temperament.handling) },
    { label: "Comportamentos indesejados", value: list(temperament.unwantedBehaviors) },
    { label: "Observações", value: text(temperament.behavior) },
    { label: "Alimentação", value: text(routine.alimentation) },
    { label: "Passeios", value: text(routine.walks) },
    { label: "Brincadeiras", value: text(routine.plays) },
    { label: "Sono", value: text(routine.sleep) },
    { label: "Tempo sozinho", value: text(env.aloneTime) },
    { label: "Já foi adestrado", value: text(env.history) },
  ].filter((row) => row.value);

  if (!rows.length) {
    return (
      <p className="text-[12.5px] text-[var(--muted)]">
        O tutor ainda não respondeu as perguntas de comportamento.
      </p>
    );
  }

  // As de risco vêm primeiro: são as que mudam como o adestrador se aproxima na
  // primeira aula.
  const risco = new Set(["Histórico de mordida", "Proteção de recursos", "Aceita manipulação", "Com crianças"]);
  const ordenadas = [...rows].sort(
    (a, b) => Number(risco.has(b.label)) - Number(risco.has(a.label)),
  );

  return (
    <section className="rounded-lg border border-[var(--border)] p-3">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Comportamento e rotina
      </h3>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {ordenadas.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Plugar na ficha do cliente**

Em `app/clientes/[clientId]/page.tsx`, importar e renderizar um card por cão. Ler o arquivo
antes para descobrir onde os cães já são listados e seguir a estrutura que existe:

```tsx
import { DogBehaviorCard } from "@/components/dog-behavior-card";
// ...
<DogBehaviorCard dog={dog} />
```

Confirmar que a consulta que alimenta a página traz `temperament`, `routine`,
`environmentalAnalysis` e `preventiveCare`. Se o `select` for explícito, acrescentá-los.

- [ ] **Step 3: Verificar tipos e build**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "behavior-card|clientId" | head
npm run build:local
```

Esperado: nenhuma linha do `grep`; build conclui.

- [ ] **Step 4: Commit**

```bash
git add components/dog-behavior-card.tsx "app/clientes/[clientId]/page.tsx"
git commit -m "feat(convite): ficha do cliente mostra as respostas de comportamento"
```

---

### Task 9: Tutorial e tour (obrigatório pelo AGENTS.md)

**Files:**
- Modify: `app/tutorial/page.tsx`
- Modify: `app/tutorial/cliente/page.tsx`
- Modify: `components/product-tour.tsx`

**Interfaces:**
- Consumes: âncora `data-tour="client-invite"` (já existe)
- Produces: nada consumido por outras tasks

- [ ] **Step 1: Guia do adestrador**

Em `app/tutorial/page.tsx`, atualizar a parte do convite: o link agora abre o formulário
completo em 3 seções; o cadastro chega como rascunho já ao fim da primeira seção, então
aparece em Clientes **antes** de o tutor terminar; o status "Em preenchimento" na lista de
convites é quem começou e travou; as respostas de comportamento aparecem na ficha do
cliente. Seguir a estrutura de seções que o arquivo já usa.

- [ ] **Step 2: Guia do cliente**

Em `app/tutorial/cliente/page.tsx`, explicar que o cadastro tem três partes, que dá para
parar e voltar depois pelo mesmo link, e que as perguntas de comportamento servem para o
adestrador preparar a primeira aula com segurança.

- [ ] **Step 3: Passo do tour**

Em `components/product-tour.tsx`, atualizar o passo `client-invite` de `TRAINER_STEPS`.
Ler um passo existente antes para copiar o formato exato dos campos.

```ts
{
  target: '[data-tour="client-invite"]',
  title: "Convide o cliente",
  body: "Gere um link e mande no WhatsApp. O tutor preenche a ficha completa do cão, e o cadastro chega aqui para você aprovar.",
},
```

- [ ] **Step 4: Rodar o build**

```bash
npm run build:local
```

Esperado: build conclui sem erro.

- [ ] **Step 5: Commit**

```bash
git add app/tutorial components/product-tour.tsx
git commit -m "docs(convite): tutorial e tour do formulario completo"
```

---

### Task 10: Verificação ponta a ponta

**Files:**
- Modify: `scripts/check-invite-e2e.mjs`

**Interfaces:**
- Consumes: tudo
- Produces: `npm run check:invite:e2e` verde

- [ ] **Step 1: Subir banco e aplicação**

Seguir `docs/desenvolvedor/ambiente-local.md`, depois:

```bash
npm run build:local && npm start &
```

- [ ] **Step 2: Reescrever o percurso do script**

No `scripts/check-invite-e2e.mjs`, trocar o bloco entre "Passo 2: o tutor abre o link" e
"Passos 6 e 7" por um percurso em três seções. Os `check(...)` de limite de plano,
revogação, expiração e rotas sem sessão **ficam como estão**.

```js
// ── Seção 1: cria o cadastro; a partir daqui o lead está capturado ──────────
const s1 = await anon(`/api/invite/${token}`, post({
  section: 1,
  data: {
    clientName: "Maria Silva", phone: "41999998888", email: "maria@exemplo.com",
    cpf: "000.000.000-00",
    address: { zipCode: "80000-000", street: "Rua das Flores", number: "10",
               neighborhood: "Centro", city: "Curitiba", state: "PR" },
    emergencyName: "João Silva", emergencyPhone: "41988887777",
  },
}));
check("seção 1 responde 200", s1.status === 200, `HTTP ${s1.status}`);

const afterS1 = await prisma.clientInvite.findUnique({
  where: { id: gen.invite.id },
  include: { client: { include: { dogs: true, addresses: true } } },
});
check("seção 1 já cria o cliente como Rascunho", afterS1.client?.status === "Rascunho", afterS1.client?.status);
check("telefone gravado — é por ele que o adestrador retoma", afterS1.client?.phone === "41999998888");
check("endereço gravado", afterS1.client?.addresses?.[0]?.city === "Curitiba");
check("contato de emergência gravado", afterS1.client?.secondContactName === "João Silva");
check("nenhum cão criado ainda", afterS1.client?.dogs?.length === 0, `${afterS1.client?.dogs?.length} cão(es)`);
check("convite ainda não está concluído", afterS1.completedAt === null);

// ── Abandono e retomada: o motivo de existir o status novo ──────────────────
const meio = await (await anon(`/api/invite/${token}`)).json();
check("abandonou na seção 2: status Em preenchimento", meio.status === "Em preenchimento", meio.status);
check("retoma na seção 2", meio.resumeStep === 2, `resumeStep=${meio.resumeStep}`);
check("NÃO mostra 'você já se cadastrou'", meio.alreadyUsed === false, String(meio.alreadyUsed));
check("prefill devolve o que já foi digitado", meio.prefill?.clientName === "Maria Silva", meio.prefill?.clientName);
check("prefill não vaza o cão de ninguém", meio.prefill?.dog === null);

// ── Seção 2: o cão ─────────────────────────────────────────────────────────
const s2 = await anon(`/api/invite/${token}`, post({
  section: 2,
  data: {
    dogName: "Bolt", breed: "Border Collie", sex: "Macho", castrated: true,
    weight: "18 kg", preventiveCare: "Em dia",
    healthConditions: "Nenhuma", veterinarian: "Dra. Ana — 41977776666",
  },
}));
check("seção 2 responde 200", s2.status === 200, `HTTP ${s2.status}`);
const meio2 = await (await anon(`/api/invite/${token}`)).json();
check("retoma na seção 3 depois do cão", meio2.resumeStep === 3, `resumeStep=${meio2.resumeStep}`);
check("prefill traz o cão", meio2.prefill?.dog?.dogName === "Bolt", meio2.prefill?.dog?.dogName);

// ── Seção 3: comportamento; fecha o convite ────────────────────────────────
const s3 = await anon(`/api/invite/${token}`, post({
  section: 3,
  data: {
    temperament: {
      energy: "Alta energia", social: "Sociável com pessoas", dogs: "Reativo a outros cães",
      children: "Tolerante com crianças",
      noise: ["Fica ansioso com barulhos", "Se esconde com barulhos"],
      biteHistory: "Sem histórico de mordida",
      resourceGuarding: "Protege recursos",
      handling: "Aceita manipulação com restrições",
      unwantedBehaviors: ["Puxa muito a guia", "Latidos em excesso"],
      behavior: "Late no portão",
    },
    routine: {
      alimentation: "Ração seca 2x ao dia",
      walks: "Duas voltas no quarteirão",
      plays: "Bolinha e mordedor",
      sleep: "Cama na sala",
    },
    environmentalAnalysis: { aloneTime: "2–4h", history: "Já fez adestramento básico" },
    propertyType: "Apartamento",
  },
}));
const s3body = await s3.json();
check("seção 3 responde 200", s3.status === 200, `HTTP ${s3.status}`);
check("conclusão devolve portalUrl", s3body.portalUrl?.includes("/portal/cliente/"));

const done = await prisma.clientInvite.findUnique({
  where: { id: gen.invite.id },
  include: { client: { include: { dogs: true } } },
});
check("convite marcado como concluído", !!done.completedAt);
const dogRow = done.client.dogs[0];
const temperament = JSON.parse(dogRow.temperament);
const routine = JSON.parse(dogRow.routine);
const env = JSON.parse(dogRow.environmentalAnalysis);

check("convivência com crianças gravada", temperament.children === "Tolerante com crianças");
check("reação a barulhos gravada como lista", Array.isArray(temperament.noise) && temperament.noise.length === 2);
check("histórico de mordida gravado", temperament.biteHistory === "Sem histórico de mordida");
check("proteção de recursos gravada", temperament.resourceGuarding === "Protege recursos");
check("aceita manipulação gravada", temperament.handling === "Aceita manipulação com restrições");
check("comportamentos indesejados gravados como lista", temperament.unwantedBehaviors?.length === 2);
check("vacinação/antipulgas gravada", dogRow.preventiveCare === "Em dia");

// Os três campos que existiam mortos desde sempre.
check("rotina de sono deixou de ser vazia", routine.sleep === "Cama na sala", routine.sleep);
check("rotina de passeios deixou de ser vazia", !!routine.walks, routine.walks);
check("rotina de brincadeiras deixou de ser vazia", !!routine.plays, routine.plays);
// O campo que mentia.
check("histórico de adestramento reflete a resposta", env.history === "Já fez adestramento básico", env.history);

// ── Depois de concluir, aí sim é reentrada ─────────────────────────────────
const fim = await (await anon(`/api/invite/${token}`)).json();
check("convite concluído vira Usado", fim.status === "Usado", fim.status);
check("agora sim alreadyUsed", fim.alreadyUsed === true);
const reenter = await (await anon(`/api/invite/${token}`, { method: "POST" })).json();
check("reentrada emite portal novo", reenter.portalUrl?.includes("/portal/cliente/"));
check("reentrada não duplica cliente", (await prisma.clientProfile.count({ where: { name: "Maria Silva" } })) === 1);

// ── Seção fora de ordem ────────────────────────────────────────────────────
const orfao = await (await req("/api/client-invites", post({ label: "fora de ordem" }))).json();
const orfaoToken = orfao.shareUrl.split("/convite/")[1];
const pulou = await anon(`/api/invite/${orfaoToken}`, post({ section: 2, data: { dogName: "Rex" } }));
check("seção 2 sem seção 1 devolve 409", pulou.status === 409, `HTTP ${pulou.status}`);
```

Ajustar também os `check` do fluxo antigo que faziam `POST` sem `section` — só a reentrada
continua sem corpo.

- [ ] **Step 3: Rodar**

```bash
npm run check:invite && npm run check:invite:e2e
```

Esperado: os dois passam, sem `FALHA` em nenhuma linha.

- [ ] **Step 4: Percorrer no navegador**

Com a app no ar, gerar um convite em `/clientes`, abrir o link numa janela anônima e:

1. Preencher a seção 1 e avançar. Conferir que o cliente já aparece em `/clientes` como
   **Rascunho**, antes de o formulário terminar.
2. Fechar a aba. Reabrir o link. Conferir que volta na **seção 2**, com nome e telefone
   preenchidos, e **não** na tela "Você já se cadastrou".
3. Preencher as seções 2 e 3 e concluir. Conferir o redirecionamento para o portal.
4. Reabrir o link: agora sim "Você já se cadastrou".
5. Como adestrador, abrir a ficha do cliente e conferir que o card "Comportamento e rotina"
   mostra as respostas, com as de risco no topo.
6. Aprovar o rascunho e conferir que virou **Ativo**.

- [ ] **Step 5: Registrar o resultado**

Reportar a saída real de `npm run check:invite`, `npm run check:invite:e2e`,
`npm run build:local` e o que aconteceu em cada passo do navegador. Falhou, diz que falhou
e mostra a saída.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-invite-e2e.mjs
git commit -m "test(convite): e2e percorre as tres secoes, abandono e retomada"
```

---

## Self-Review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| Seção 1 — dados do cliente, telefone obrigatório | 4, 5, 6 |
| Seção 2 — dados do cão, `preventiveCare` | 2, 4, 5, 6 |
| Seção 3 — comportamento nas colunas JSON existentes | 4, 5, 6 |
| Chaves novas em `temperament` | 3, 4, 5 |
| `routine.sleep`/`walks`/`plays` deixam de ser mortos | 6, 10 |
| `environmentalAnalysis.history` para de mentir | 3, 6, 10 |
| Contato de emergência | 4, 5, 6 |
| Endereço estruturado | 4, 5, 6 |
| Salvamento a cada seção | 5, 10 |
| Status "Em preenchimento" | 1, 7 |
| `canReenterInvite` exige `completedAt` | 1 |
| Retomada com `resumeStep` e `prefill` | 1, 5, 6, 10 |
| `409` para seção fora de ordem | 5, 10 |
| Foto reduzida e limitada a 2 MB | 4, 6 |
| Valores gravados preservados | 3 |
| Cópia da tela sem "menos de um minuto" | 6 |
| Adestrador vê as respostas | 8 |
| Tutorial e tour | 9 |
| Testes de lógica pura | 1, 3, 4 |
| Testes ponta a ponta | 10 |

**Placeholders:** nenhum "TBD"/"TODO". Os pontos das Tasks 6 e 8 que mandam "ler o arquivo
antes e seguir a estrutura que existe" são passos de verificação com comando exato, não
lacunas: `app/clientes/[clientId]/page.tsx` e o bloco de vacinas do onboarding não foram
lidos por inteiro ao planejar, e inventar a estrutura deles seria pior que mandar conferir.

**Consistência de tipos:** `InviteLifecycle` ganha `completedAt` na Task 1 e é consumido
com esse campo nas Tasks 5 e 7. `InviteProgress` é o shape que a Task 5 monta em
`progressOf`. As chaves de `temperament`/`routine`/`environmentalAnalysis` são as mesmas
na Task 4 (validação), Task 5 (gravação), Task 6 (formulário), Task 8 (exibição) e Task 10
(asserts). Os valores de `lib/invite-options.ts` (Task 3) são a única fonte dos `z.enum` da
Task 4 e dos asserts da Task 10.

**Risco conhecido:** a Task 6 é a maior do plano — quatro arquivos novos e ~40 campos. Foi
mantida como uma task só porque as quatro partes não são testáveis em separado: uma seção
sem o orquestrador não renderiza. Se ela crescer demais na execução, quebrar em 6a
(campos compartilhados + seção 1) e 6b (seções 2 e 3 + orquestrador), commitando entre as
duas.
