# Autocadastro de Cliente por Convite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O adestrador gera um link de convite, manda para o tutor, e o tutor se cadastra sozinho — sem ninguém digitar o cliente na mão.

**Architecture:** Um model novo `ClientInvite` guarda o convite (token só como hash, igual ao `PortalAccessLink` que já existe). Duas rotas privadas gerenciam convites e duas rotas públicas consomem o token. Ao enviar o passo 1, uma transação cria `ClientProfile` (status `"Rascunho"`), `Dog` e um `PortalAccessLink`, e redireciona a pessoa para a ficha de onboarding que o projeto já tem.

**Tech Stack:** Next.js 16.2 (App Router), React 19, Prisma 5.22 sobre MySQL/TiDB, NextAuth v5 beta, Tailwind 4, zod 4. Testes com `node:assert/strict` via `node --experimental-strip-types` (o projeto não usa framework de teste).

**Spec:** `docs/superpowers/specs/2026-07-30-autocadastro-cliente-por-convite-design.md`

## Estado da execução (30/07/2026)

Tasks 1 a 8 implementadas, mergeadas na `master` e **em produção** (`a1d519c`).

Verde local: `npm run check:invite`, `npm run check:home`, `npx tsc --noEmit` (exit 0),
`npm run build:local`.

**Sobre o schema em produção:** não é preciso rodar `db push` à mão. O `build` do
`package.json` — que é o que a Vercel executa, já que `vercel.json` só define crons —
é `prisma generate && prisma db push --skip-generate && next build`. O próprio deploy
aplica o schema. Confirmado depois de subir: `GET /api/invite/<token de 44 chars>`
devolve **404**, não 500, provando que a query em `ClientInvite` executou contra uma
tabela existente. (Localmente não há banco algum: o `.env` do repo é dummy de
propósito e a máquina não tem MySQL/Docker/`tiup`.)

### Task 9 — verificado em produção, com uma lacuna

Feito sem credencial, em `https://adestro.vercel.app`:

| Verificação | Resultado |
|---|---|
| `GET /api/invite/<44 chars>` (executa query em `ClientInvite`) | 404 + mensagem correta — tabela existe |
| `POST /api/invite/<44 chars>` | 404 + mensagem correta |
| `GET /convite/<token>` renderiza "Convite indisponível" | 200 |
| `GET /api/client-invites` sem sessão | 401 "Não autenticado" |
| Header não oferece mais "Entrar"/"Criar conta grátis" ao tutor | confirmado |
| Regressão: `/`, `/login`, `/cadastro`, `/tutorial`, `/tutorial/cliente`, `/portal/cliente/*` | todos 200 |

**Lacuna:** o lado do adestrador (gerar convite em `/clientes`, aprovar o rascunho,
grupo em `/pendencias`) **não foi verificado** — exige login, e digitar senha em
formulário é vedado ao agente. Percorrer os passos 1, 6 e 7 da Task 9 continua
pendente e depende de uma pessoa logada.

### Achado fora do escopo: `max-w-*` não funciona em `<main>`

`app/globals.css:239` tem `#__next, main { max-width: 100% }` **fora de `@layer`**. No
Tailwind 4 uma regra sem layer vence as utilities (cascata de layers, não de
especificidade), então todo `max-w-*` aplicado direto num `<main>` é ignorado — são 15
telas, incluindo `/login`, que abre o formulário com 1590px num monitor de 1600px.

A tela de convite foi corrigida localmente (`a1d519c`, largura movida para um filho).
O caso geral **não** foi mexido: seria reposicionar 15 telas de produção de uma vez,
e a maioria não é verificável sem login. Decisão do dono do projeto.

## Global Constraints

- Português do Brasil em toda string visível ao usuário, incluindo mensagens de erro.
- O token em texto puro **nunca** é gravado no banco: só `sha256` em `tokenHash` e os 10 primeiros caracteres em `tokenPrefix`.
- Toda rota privada checa `auth()` + `role === "trainer"`, no mesmo formato de `app/api/portal-links/route.ts`.
- Toda rota pública passa por `rateLimit()` de `lib/rate-limit.ts`.
- Regra de negócio testável mora em `lib/`, nunca dentro de `route.ts`.
- `AGENTS.md` obriga: mudança visível ao usuário atualiza `app/tutorial/page.tsx`, `app/tutorial/cliente/page.tsx` e `components/product-tour.tsx` **no mesmo commit** (Task 8).
- **Não fazer `git push`.** Push na `master` dispara deploy automático na Vercel; a decisão é do usuário.
- Validade do convite: padrão 7 dias, mínimo 1, máximo 30.
- `PortalAccessLink` criado pelo convite usa a validade padrão do portal (`PORTAL_LINK_DEFAULT_DAYS`, 90 dias).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/client-invite.ts` (criar) | Lógica pura: constantes, `normalizeInviteDays`, `getInviteStatus`, `canReenterInvite` |
| `lib/validators.ts` (modificar) | `clientInviteSchema` junto dos schemas existentes |
| `scripts/check-client-invite.mts` (criar) | Testes da lógica pura |
| `prisma/schema.prisma` (modificar) | Model `ClientInvite` + relação inversa em `ClientProfile` e `Trainer` |
| `app/api/client-invites/route.ts` (criar) | GET/POST/PATCH para o adestrador |
| `app/api/invite/[token]/route.ts` (criar) | GET/POST públicos |
| `app/convite/[token]/page.tsx` (criar) | Server component: resolve o token e passa para o client |
| `app/convite/[token]/invite-client.tsx` (criar) | Formulário do passo 1 |
| `components/client-invite-panel.tsx` (criar) | Botão "Convidar cliente", modal e lista de convites |
| `app/clientes/page.tsx` (modificar) | Renderiza `<ClientInvitePanel />` |
| `app/api/clients/route.ts` (modificar) | Contagem do limite ignora `"Rascunho"`; PATCH de aprovação |
| `app/pendencias/pendencias-client.tsx` (modificar) | Grupo "Cadastros aguardando aprovação" |
| `app/tutorial/*`, `components/product-tour.tsx` (modificar) | Documentação obrigatória |

`components/client-invite-panel.tsx` é um arquivo separado de propósito: `app/clientes/page.tsx` já passa de 1300 linhas, e o painel de convites é autocontido (busca seus próprios dados, tem seu próprio estado de modal).

---

### Task 1: Lógica pura do convite e testes

**Files:**
- Create: `lib/client-invite.ts`
- Create: `scripts/check-client-invite.mts`
- Modify: `lib/validators.ts` (adicionar `clientInviteSchema` no fim, antes dos `export type`)
- Modify: `package.json` (script `check:invite`)

**Interfaces:**
- Consumes: nada (primeira task)
- Produces:
  - `INVITE_DEFAULT_DAYS = 7`, `INVITE_MIN_DAYS = 1`, `INVITE_MAX_DAYS = 30`
  - `normalizeInviteDays(value?: number): number`
  - `type InviteStatus = "Revogado" | "Usado" | "Expirado" | "Pendente"`
  - `type InviteLifecycle = { revokedAt: Date | null; expiresAt: Date; clientId: string | null }`
  - `getInviteStatus(invite: InviteLifecycle, nowMs?: number): InviteStatus`
  - `canReenterInvite(invite: InviteLifecycle, nowMs?: number): boolean`
  - `getInviteExpiryDate(days?: number): Date`
  - `clientInviteSchema` (zod) com `{ clientName: string; dogName: string; phone?: string; email?: string; breed?: string }`

- [x] **Step 1: Escrever o teste que falha**

Criar `scripts/check-client-invite.mts`:

```ts
import assert from "node:assert/strict";
import {
  canReenterInvite,
  getInviteExpiryDate,
  getInviteStatus,
  normalizeInviteDays,
  INVITE_DEFAULT_DAYS,
} from "../lib/client-invite.ts";
import { clientInviteSchema } from "../lib/validators.ts";

const NOW = new Date(2026, 6, 30, 12, 0, 0); // quinta, 30/07/2026 12:00
const nowMs = NOW.getTime();
const daysFromNow = (n: number) => new Date(nowMs + n * 86_400_000);

// ── normalizeInviteDays ──────────────────────────────────────────────────────
assert.equal(normalizeInviteDays(undefined), 7, "sem valor usa o padrão");
assert.equal(normalizeInviteDays(Number.NaN), 7, "NaN usa o padrão");
assert.equal(normalizeInviteDays(0), 1, "abaixo do mínimo vira 1");
assert.equal(normalizeInviteDays(-5), 1, "negativo vira 1");
assert.equal(normalizeInviteDays(31), 30, "acima do máximo vira 30");
assert.equal(normalizeInviteDays(7.4), 7, "arredonda para baixo");
assert.equal(normalizeInviteDays(7.6), 8, "arredonda para cima");
assert.equal(INVITE_DEFAULT_DAYS, 7);

// ── getInviteStatus: ordem das regras ────────────────────────────────────────
// A ordem é regra de negócio, não detalhe de implementação.
assert.equal(
  getInviteStatus({ revokedAt: null, expiresAt: daysFromNow(3), clientId: null }, nowMs),
  "Pendente",
  "convite novo e no prazo",
);
assert.equal(
  getInviteStatus({ revokedAt: null, expiresAt: daysFromNow(-1), clientId: null }, nowMs),
  "Expirado",
  "venceu sem ser usado",
);
assert.equal(
  getInviteStatus({ revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1" }, nowMs),
  "Usado",
  "virou cadastro",
);
assert.equal(
  getInviteStatus({ revokedAt: NOW, expiresAt: daysFromNow(3), clientId: null }, nowMs),
  "Revogado",
  "revogado vence pendente",
);
assert.equal(
  getInviteStatus({ revokedAt: NOW, expiresAt: daysFromNow(-1), clientId: null }, nowMs),
  "Revogado",
  "revogado vence expirado — foi decisão do adestrador, não o relógio",
);
assert.equal(
  getInviteStatus({ revokedAt: NOW, expiresAt: daysFromNow(3), clientId: "c1" }, nowMs),
  "Revogado",
  "revogado vence usado",
);
assert.equal(
  getInviteStatus({ revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1" }, nowMs),
  "Usado",
  "usado vence expirado — o convite converteu, mostrar 'Expirado' leria como falha",
);
assert.equal(
  getInviteStatus({ revokedAt: null, expiresAt: new Date(nowMs), clientId: null }, nowMs),
  "Expirado",
  "vencer exatamente agora já conta como expirado",
);

// ── canReenterInvite ─────────────────────────────────────────────────────────
assert.equal(
  canReenterInvite({ revokedAt: null, expiresAt: daysFromNow(3), clientId: "c1" }, nowMs),
  true,
  "usado, no prazo e não revogado: pode reemitir o portal",
);
assert.equal(
  canReenterInvite({ revokedAt: null, expiresAt: daysFromNow(3), clientId: null }, nowMs),
  false,
  "sem cadastro criado não há portal para reemitir",
);
assert.equal(
  canReenterInvite({ revokedAt: null, expiresAt: daysFromNow(-1), clientId: "c1" }, nowMs),
  false,
  "convite vencido não reemite",
);
assert.equal(
  canReenterInvite({ revokedAt: NOW, expiresAt: daysFromNow(3), clientId: "c1" }, nowMs),
  false,
  "revogado não reemite",
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
```

- [x] **Step 2: Rodar para ver falhar**

```bash
node --experimental-strip-types scripts/check-client-invite.mts
```

Esperado: FALHA com `Cannot find module '../lib/client-invite.ts'`.

- [x] **Step 3: Implementar `lib/client-invite.ts`**

```ts
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
```

- [x] **Step 4: Adicionar o schema em `lib/validators.ts`**

Inserir depois de `csvImportRowSchema` e antes do bloco de `export type`:

```ts
export const clientInviteSchema = z.object({
  clientName: z.string().trim().min(1, "Informe seu nome"),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  dogName: z.string().trim().min(1, "Informe o nome do cão"),
  breed: z.string().trim().max(80).optional(),
});
```

E, junto dos demais type exports:

```ts
export type ClientInviteInput = z.infer<typeof clientInviteSchema>;
```

- [x] **Step 5: Adicionar o script no `package.json`**

Em `"scripts"`, depois de `"check:home"`:

```json
"check:invite": "node --experimental-strip-types scripts/check-client-invite.mts"
```

- [x] **Step 6: Rodar e ver passar**

```bash
npm run check:invite
```

Esperado: `check-client-invite: OK`, sem nenhum `AssertionError`.

- [x] **Step 7: Commit**

```bash
git add lib/client-invite.ts lib/validators.ts scripts/check-client-invite.mts package.json
git commit -m "feat(convite): logica pura e validacao do convite de autocadastro"
```

---

### Task 2: Model `ClientInvite` no banco

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nada de Task 1 (independente)
- Produces: `prisma.clientInvite` com campos `id, trainerId, label, tokenHash, tokenPrefix, expiresAt, revokedAt, clientId, createdAt, updatedAt`; `clientProfile.invite`; `trainer.clientInvites`

- [x] **Step 1: Confirmar que o banco é o local**

```bash
grep -o '@[^/]*' .env | head -1
```

Esperado: `@127.0.0.1:4000`. **Se apontar para qualquer host remoto, pare e pergunte** — `db push` altera o schema direto, sem migration versionada.

- [x] **Step 2: Adicionar o model**

No fim de `prisma/schema.prisma`:

```prisma
// ─── Convite de autocadastro ──────────────────────────────────────────────────
// O adestrador gera o link, o tutor se cadastra sozinho. Model separado do
// PortalAccessLink de propósito: aquele é 1 link ↔ 1 cliente que já existe;
// este é 1 link ↔ 0-ou-1 cadastro futuro.
model ClientInvite {
  id          String   @id @default(cuid())
  trainerId   String
  trainer     Trainer  @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  label       String?  // "Maria do Instagram" — só o adestrador vê
  tokenHash   String   @unique
  tokenPrefix String
  expiresAt   DateTime
  revokedAt   DateTime?

  // Nulo = ainda não usado. Marca o estágio do convite, não o tipo da linha.
  clientId    String?        @unique
  client      ClientProfile? @relation(fields: [clientId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([trainerId])
  @@index([expiresAt])
}
```

Em `model Trainer`, junto das demais relations (perto de `portalAccessLinks`):

```prisma
  clientInvites     ClientInvite[]
```

Em `model ClientProfile`, junto de `portalAccessLink`:

```prisma
  invite           ClientInvite?
```

- [x] **Step 3: Aplicar no banco local e gerar o client**

```bash
npx prisma db push && npx prisma generate
```

Esperado: `Your database is now in sync with your Prisma schema.` e `Generated Prisma Client`.

- [x] **Step 4: Verificar que o client TypeScript enxerga o model**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Esperado: nenhum erro novo. (Se o projeto já tiver erros pré-existentes, comparar com a saída antes da mudança.)

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(convite): model ClientInvite"
```

---

### Task 3: API do adestrador — `/api/client-invites`

**Files:**
- Create: `app/api/client-invites/route.ts`

**Interfaces:**
- Consumes: `getInviteStatus`, `getInviteExpiryDate`, `normalizeInviteDays` (Task 1); `prisma.clientInvite` (Task 2); `buildPortalToken`, `hashPortalToken`, `getTokenPrefix` de `lib/portal-access.ts`; `checkLimit` de `lib/plan-limits.ts`
- Produces: `GET /api/client-invites` → `{ invites: InviteItem[] }`; `POST` → `{ invite: InviteItem, shareUrl: string }`; `PATCH` → `{ ok: true }`.
  `InviteItem = { id, label, tokenPrefix, status, expiresAt, clientId, clientName, createdAt }`

- [x] **Step 1: Escrever a rota**

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getInviteExpiryDate, getInviteStatus, normalizeInviteDays } from "@/lib/client-invite";
import { checkLimit } from "@/lib/plan-limits";
import { buildPortalToken, getTokenPrefix, hashPortalToken } from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";

// Mesmo helper das outras rotas: o adestrador pode existir só como User.
async function ensureTrainer(userId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (trainer) return trainer;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return null;

  return prisma.trainer.create({
    data: {
      userId,
      name: user.name?.trim() || user.email?.split("@")[0] || "Adestrador",
    },
  });
}

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function requireTrainer() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) {
    return { error: NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 }) };
  }
  return { trainer };
}

type InviteRow = {
  id: string;
  label: string | null;
  tokenPrefix: string;
  expiresAt: Date;
  revokedAt: Date | null;
  clientId: string | null;
  createdAt: Date;
  client: { name: string } | null;
};

function toItem(invite: InviteRow) {
  return {
    id: invite.id,
    label: invite.label,
    tokenPrefix: invite.tokenPrefix,
    status: getInviteStatus({
      revokedAt: invite.revokedAt,
      expiresAt: invite.expiresAt,
      clientId: invite.clientId,
    }),
    expiresAt: invite.expiresAt,
    clientId: invite.clientId,
    clientName: invite.client?.name ?? null,
    createdAt: invite.createdAt,
  };
}

const SELECT = {
  id: true,
  label: true,
  tokenPrefix: true,
  expiresAt: true,
  revokedAt: true,
  clientId: true,
  createdAt: true,
  client: { select: { name: true } },
} as const;

export async function GET() {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;

  const invites = await prisma.clientInvite.findMany({
    where: { trainerId: guard.trainer.id },
    select: SELECT,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ invites: invites.map(toItem) });
}

export async function POST(request: Request) {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;
  const trainer = guard.trainer;

  // Barrar aqui, e não no envio: melhor não gerar o link do que deixar o tutor
  // preencher a ficha inteira para levar erro no fim.
  // Rascunho não conta — só entra na conta quem o adestrador já aprovou.
  const currentClientCount = await prisma.clientProfile.count({
    where: { trainerId: trainer.id, status: { not: "Rascunho" } },
  });
  const limitCheck = checkLimit({
    plan: trainer.plan,
    resource: "client",
    currentCount: currentClientCount,
  });
  if (!limitCheck.ok) {
    return NextResponse.json(
      { error: limitCheck.reason, code: "PLAN_LIMIT", limit: limitCheck.limit, current: limitCheck.current },
      { status: 402 },
    );
  }

  const body = (await request.json()) as { label?: string; expiresInDays?: number };

  const token = buildPortalToken();
  const invite = await prisma.clientInvite.create({
    data: {
      trainerId: trainer.id,
      label: body.label?.trim() || null,
      tokenHash: hashPortalToken(token),
      tokenPrefix: getTokenPrefix(token),
      expiresAt: getInviteExpiryDate(normalizeInviteDays(body.expiresInDays)),
    },
    select: SELECT,
  });

  await audit({
    trainerId: trainer.id,
    action: "create",
    scope: "client",
    targetId: invite.id,
    summary: `Convite de autocadastro gerado${invite.label ? ` (${invite.label})` : ""}`,
  });

  const baseUrl = await getBaseUrl();

  // Única vez que o token existe em texto puro. Depois daqui, só o hash.
  return NextResponse.json({
    invite: toItem(invite),
    shareUrl: `${baseUrl}/convite/${token}`,
  });
}

export async function PATCH(request: Request) {
  const guard = await requireTrainer();
  if (guard.error) return guard.error;

  const body = (await request.json()) as { id?: string; action?: "revoke" };
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  if (body.action !== "revoke") return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const updated = await prisma.clientInvite.updateMany({
    where: { id: body.id, trainerId: guard.trainer.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Convite não encontrado ou já revogado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [x] **Step 2: Conferir a assinatura de `audit()`**

```bash
sed -n 1,45p lib/audit.ts
```

Ajustar a chamada de `audit({...})` acima para bater exatamente com o type `AuditEntry` (nomes de campo e valores aceitos em `AuditAction`). Se `"create"` não existir no union, usar o valor equivalente que existir.

- [x] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "client-invites" | head
```

Esperado: nenhuma linha.

- [x] **Step 4: Commit**

```bash
git add app/api/client-invites/route.ts
git commit -m "feat(convite): API de convites do adestrador"
```

---

### Task 4: API pública — `/api/invite/[token]`

**Files:**
- Create: `app/api/invite/[token]/route.ts`

**Interfaces:**
- Consumes: `canReenterInvite`, `getInviteStatus` (Task 1); `clientInviteSchema`, `badRequest` (`lib/validators.ts`); `prisma.clientInvite` (Task 2); `PORTAL_LINK_DEFAULT_DAYS`, `buildPortalToken`, `getPortalExpiryDate`, `getTokenPrefix`, `hashPortalToken` (`lib/portal-access.ts`); `getClientKey`, `rateLimit` (`lib/rate-limit.ts`); `sendPush` (`lib/push.ts`)
- Produces: `GET` → `{ trainerName, status, alreadyUsed }`; `POST` → `{ portalUrl }`

- [x] **Step 1: Escrever a rota**

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { canReenterInvite, getInviteStatus } from "@/lib/client-invite";
import {
  PORTAL_LINK_DEFAULT_DAYS,
  buildPortalToken,
  getPortalExpiryDate,
  getTokenPrefix,
  hashPortalToken,
} from "@/lib/portal-access";
import { prisma } from "@/lib/prisma";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { clientInviteSchema } from "@/lib/validators";

type Params = { params: Promise<{ token: string }> };

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

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
      trainer: { select: { id: true, name: true } },
    },
  });
}

// Mensagem específica por motivo: esta tela é vista por um cliente final, que
// não tem como agir sobre "erro genérico".
function messageForStatus(status: string): string {
  if (status === "Revogado") return "Este convite foi cancelado pelo adestrador. Peça um link novo.";
  if (status === "Expirado") return "Este convite venceu. Peça um link novo ao seu adestrador.";
  return "Convite inválido. Confira o link que você recebeu.";
}

export async function GET(request: Request, { params }: Params) {
  const limit = rateLimit(getClientKey(request, "invite-get"));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { token } = await params;
  const invite = await resolveInvite(token);
  if (!invite) {
    return NextResponse.json({ error: messageForStatus("Inexistente") }, { status: 404 });
  }

  const status = getInviteStatus(invite);
  const reentry = canReenterInvite(invite);

  if (status !== "Pendente" && !reentry) {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  // Nunca devolver dados do cliente: a rota é pública.
  return NextResponse.json({
    trainerName: invite.trainer.name,
    status,
    alreadyUsed: reentry,
  });
}

export async function POST(request: Request, { params }: Params) {
  const limit = rateLimit(getClientKey(request, "invite-post"));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { token } = await params;
  const invite = await resolveInvite(token);
  if (!invite) {
    return NextResponse.json({ error: messageForStatus("Inexistente") }, { status: 404 });
  }

  const baseUrl = await getBaseUrl();

  // Reentrada: a pessoa já se cadastrou e perdeu o link do portal. Só temos o
  // hash do token antigo, então o caminho é emitir um novo.
  if (canReenterInvite(invite) && invite.clientId) {
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
    return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
  }

  const status = getInviteStatus(invite);
  if (status !== "Pendente") {
    return NextResponse.json({ error: messageForStatus(status) }, { status: 410 });
  }

  const parsed = clientInviteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const portalToken = buildPortalToken();

  // Transação: sem ela, uma falha ao criar o cão deixa cliente órfão e convite
  // queimado — a pessoa recarrega e não consegue mais entrar.
  await prisma.$transaction(async (tx) => {
    const client = await tx.clientProfile.create({
      data: {
        trainerId: invite.trainerId,
        name: data.clientName,
        phone: data.phone ?? "",
        email: data.email ?? "",
        status: "Rascunho", // aguarda aprovação do adestrador
      },
    });

    await tx.dog.create({
      data: {
        clientId: client.id,
        name: data.dogName,
        breed: data.breed ?? "",
        trainingTypes: "[]",
      },
    });

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

  // Fora da transação de propósito: push é efeito colateral externo. Serviço de
  // push fora do ar não pode derrubar o cadastro do cliente.
  void notifyTrainer(invite.trainerId, data.clientName, data.dogName);

  return NextResponse.json({ portalUrl: `${baseUrl}/portal/cliente/${portalToken}` });
}

async function notifyTrainer(trainerId: string, clientName: string, dogName: string) {
  try {
    const { sendPush } = await import("@/lib/push");
    const subs = await prisma.pushSubscription.findMany({ where: { trainerId } });
    await Promise.all(
      subs.map((sub) =>
        sendPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: "Novo cadastro pelo convite",
            body: `${clientName} cadastrou ${dogName}. Aguardando sua aprovação.`,
            url: "/clientes?status=rascunho",
          },
        ),
      ),
    );
  } catch {
    // Silencioso: o cadastro já foi salvo, notificação é bônus.
  }
}
```

- [x] **Step 2: Conferir os nomes reais de `PushSubscription` e do payload**

```bash
sed -n 207,225p prisma/schema.prisma
sed -n 1,40p lib/push.ts
```

Ajustar `notifyTrainer` para bater com os campos reais do model (`endpoint`, `p256dh`, `auth` podem ter outros nomes) e com o type `WebPushPayload`.

- [x] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "invite" | head
```

Esperado: nenhuma linha.

- [x] **Step 4: Commit**

```bash
git add "app/api/invite/[token]/route.ts"
git commit -m "feat(convite): API publica do convite com transacao e reentrada"
```

---

### Task 5: Tela pública `/convite/[token]`

**Files:**
- Create: `app/convite/[token]/page.tsx`
- Create: `app/convite/[token]/invite-client.tsx`
- Modify: `app/portal/cliente/[token]/onboarding/portal-onboarding-client.tsx` (botão "Deixar para depois")

**Interfaces:**
- Consumes: `GET`/`POST /api/invite/[token]` (Task 4)
- Produces: rota `/convite/<token>` navegável

- [x] **Step 1: Server component `app/convite/[token]/page.tsx`**

```tsx
import { InviteClient } from "./invite-client";

export const metadata = { title: "Cadastro | Adestro" };

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteClient token={token} />;
}
```

- [x] **Step 2: Client component `app/convite/[token]/invite-client.tsx`**

```tsx
"use client";

import { FormEvent, useEffect, useState } from "react";

type InviteInfo = { trainerName: string; alreadyUsed: boolean };

export function InviteClient({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/invite/${token}`);
      const data = await res.json();
      if (!alive) return;
      if (!res.ok) setLoadError(data.error ?? "Convite inválido.");
      else setInfo(data);
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
    // Emenda direto na ficha completa que já existe.
    window.location.href = `${data.portalUrl}/onboarding`;
  }

  async function reenter() {
    setSaving(true);
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) window.location.href = data.portalUrl;
    else {
      setFormError(data.error ?? "Não foi possível abrir seu portal.");
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">Convite indisponível</h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">{loadError}</p>
      </main>
    );
  }

  if (!info) {
    return <main className="mx-auto max-w-md p-6 text-[13px] text-[var(--muted)]">Carregando…</main>;
  }

  if (info.alreadyUsed) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">Você já se cadastrou</h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          Clique abaixo para abrir seu portal com {info.trainerName}.
        </p>
        <button type="button" onClick={reenter} disabled={saving} className="btn-primary mt-4">
          {saving ? "Abrindo…" : "Abrir meu portal"}
        </button>
        {formError && <p className="mt-3 text-[13px] text-[var(--danger)]">{formError}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-lg font-semibold">Cadastro</h1>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        Você foi convidado por <strong>{info.trainerName}</strong>. Leva menos de um minuto.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block text-[13px]">
          Seu nome
          <input name="clientName" required className="input mt-1 w-full" />
        </label>
        <label className="block text-[13px]">
          WhatsApp
          <input name="phone" inputMode="tel" className="input mt-1 w-full" />
        </label>
        <label className="block text-[13px]">
          E-mail
          <input name="email" type="email" className="input mt-1 w-full" />
        </label>
        <label className="block text-[13px]">
          Nome do cão
          <input name="dogName" required className="input mt-1 w-full" />
        </label>
        <label className="block text-[13px]">
          Raça
          <input name="breed" className="input mt-1 w-full" />
        </label>

        {formError && <p className="text-[13px] text-[var(--danger)]">{formError}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Enviando…" : "Continuar"}
        </button>
      </form>
    </main>
  );
}
```

- [x] **Step 3: Conferir as classes utilitárias**

```bash
grep -n "\.input\|\.btn-primary" app/globals.css | head
```

Se `.input` não existir, copiar as classes que `app/cadastro/cadastro-client.tsx` usa nos campos e trocar acima. Não inventar classe nova.

- [x] **Step 4: Botão "Deixar para depois" no onboarding**

Em `portal-onboarding-client.tsx`, ao lado do botão de enviar, um link para o portal sem `/onboarding`:

```tsx
<a href={`/portal/cliente/${token}`} className="btn-secondary">
  Deixar para depois
</a>
```

Usar o mesmo nome de prop do token que o componente já recebe.

- [x] **Step 5: Verificar tipos e build**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "convite|onboarding" | head
```

Esperado: nenhuma linha.

- [x] **Step 6: Commit**

```bash
git add "app/convite" "app/portal/cliente/[token]/onboarding/portal-onboarding-client.tsx"
git commit -m "feat(convite): tela publica de autocadastro"
```

---

### Task 6: Painel de convites em `/clientes`

**Files:**
- Create: `components/client-invite-panel.tsx`
- Modify: `app/clientes/page.tsx` (importar e renderizar; âncora `data-tour`)

**Interfaces:**
- Consumes: `/api/client-invites` (Task 3); `buildWaUrl` de `lib/whatsapp.ts`
- Produces: `<ClientInvitePanel />`, sem props

- [x] **Step 1: Criar o componente**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWaUrl } from "@/lib/whatsapp";

type Invite = {
  id: string;
  label: string | null;
  tokenPrefix: string;
  status: "Revogado" | "Usado" | "Expirado" | "Pendente";
  expiresAt: string;
  clientName: string | null;
};

export function ClientInvitePanel() {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
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
    const res = await fetch("/api/client-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, expiresInDays: days }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Não foi possível gerar o convite.");
    else {
      setShareUrl(data.shareUrl);
      setLabel("");
      await load();
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

  return (
    <>
      <button
        type="button"
        data-tour="client-invite"
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-[12.5px]"
      >
        Convidar cliente
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-[13px] text-[var(--muted)]">
            Gere um link e mande para o tutor. Ele preenche os próprios dados e o cadastro chega
            aqui como rascunho, esperando sua aprovação.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-[12.5px]">
              Para quem é (opcional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Maria do Instagram"
                className="input mt-1 block"
              />
            </label>
            <label className="text-[12.5px]">
              Vale por (dias)
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="input mt-1 block w-24"
              />
            </label>
            <button type="button" onClick={generate} disabled={busy} className="btn-primary">
              {busy ? "Gerando…" : "Gerar link"}
            </button>
          </div>

          {error && <p className="mt-2 text-[13px] text-[var(--danger)]">{error}</p>}

          {shareUrl && (
            <div className="mt-3 rounded-md border border-[var(--border)] p-3">
              <p className="text-[12.5px] font-semibold">
                Copie agora — este link não aparece de novo.
              </p>
              <code className="mt-1 block break-all text-[12px]">{shareUrl}</code>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-[12.5px]"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                  Copiar
                </button>
                <a
                  className="btn-secondary text-[12.5px]"
                  href={buildWaUrl(undefined, `Oi! Faça seu cadastro por aqui: ${shareUrl}`)}
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
              <li key={invite.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span>
                  <strong>{invite.label ?? invite.clientName ?? `Convite ${invite.tokenPrefix}`}</strong>
                  {" · "}
                  {invite.status}
                </span>
                {invite.status === "Pendente" && (
                  <button type="button" onClick={() => revoke(invite.id)} className="btn-secondary">
                    Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
```

- [x] **Step 2: Conferir a assinatura de `buildWaUrl`**

```bash
sed -n 43,53p lib/whatsapp.ts
```

Se `buildWaUrl` não aceitar telefone indefinido, montar a URL do WhatsApp sem número (`https://wa.me/?text=...`) usando o mesmo `encodeURIComponent` que o helper usa.

- [x] **Step 3: Plugar em `app/clientes/page.tsx`**

Importar no topo:

```tsx
import { ClientInvitePanel } from "@/components/client-invite-panel";
```

E renderizar dentro do mesmo `<div>` dos botões do header (por volta da linha 636, imediatamente antes do botão `+ Novo cliente`):

```tsx
<ClientInvitePanel />
```

- [x] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "invite-panel|clientes/page" | head
```

Esperado: nenhuma linha.

- [x] **Step 5: Commit**

```bash
git add components/client-invite-panel.tsx app/clientes/page.tsx
git commit -m "feat(convite): painel de convites na tela de clientes"
```

---

### Task 7: Limite de plano, aprovação e Pendências

**Files:**
- Modify: `app/api/clients/route.ts` (contagem ignora Rascunho; `PATCH` de aprovação, se ainda não existir)
- Modify: `app/api/clients/import-csv/route.ts` (mesma contagem)
- Modify: `app/pendencias/pendencias-client.tsx` (grupo novo)
- Modify: `app/clientes/page.tsx` (botão aprovar no cliente Rascunho)

**Interfaces:**
- Consumes: `checkLimit` (`lib/plan-limits.ts`)
- Produces: `PATCH /api/clients` com `{ id, action: "approve" }` → `{ ok: true }` ou 402 `PLAN_LIMIT`

- [x] **Step 1: Contagem passa a ignorar Rascunho**

Em `app/api/clients/route.ts:154` e no ponto equivalente de `import-csv/route.ts`, trocar:

```ts
const currentClientCount = await prisma.clientProfile.count({ where: { trainerId: trainer.id } });
```

por:

```ts
// Rascunho é cadastro que o tutor preencheu e o adestrador ainda não aprovou.
// Não ocupa vaga no plano: quem barra é a aprovação (ver PATCH abaixo).
const currentClientCount = await prisma.clientProfile.count({
  where: { trainerId: trainer.id, status: { not: "Rascunho" } },
});
```

- [x] **Step 2: Endpoint de aprovação**

Conferir primeiro se `app/api/clients/route.ts` já tem `PATCH`:

```bash
grep -n "export async function PATCH" app/api/clients/route.ts
```

Se não tiver, adicionar no fim do arquivo:

```ts
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = ((session.user as { role?: string }).role ?? "").toLowerCase();
  if (role !== "trainer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const trainer = await ensureTrainer(session.user.id);
  if (!trainer) return NextResponse.json({ error: "Adestrador não encontrado" }, { status: 404 });

  const body = (await request.json()) as { id?: string; action?: "approve" };
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  if (body.action !== "approve") return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  // O limite é checado aqui, e não na chegada: descartar um cadastro que o tutor
  // já preencheu custa o lead. Quem barra é a aprovação.
  const currentClientCount = await prisma.clientProfile.count({
    where: { trainerId: trainer.id, status: { not: "Rascunho" } },
  });
  const limitCheck = checkLimit({
    plan: trainer.plan,
    resource: "client",
    currentCount: currentClientCount,
  });
  if (!limitCheck.ok) {
    return NextResponse.json(
      { error: limitCheck.reason, code: "PLAN_LIMIT", limit: limitCheck.limit, current: limitCheck.current },
      { status: 402 },
    );
  }

  const updated = await prisma.clientProfile.updateMany({
    where: { id: body.id, trainerId: trainer.id, status: "Rascunho" },
    data: { status: "Ativo" },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Cadastro não encontrado ou já aprovado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

Se `PATCH` já existir, acrescentar o ramo `action === "approve"` dentro dele em vez de duplicar a função.

- [x] **Step 3: Grupo em Pendências**

Em `pendencias-client.tsx`, dentro do `useMemo` dos `groups`, depois do bloco `pendingReports`:

```ts
// 5) Cadastros que chegaram por convite e ninguém conferiu ainda.
const pendingClients = clients
  .filter((c) => (c.status ?? "") === "Rascunho")
  .map((c) => ({
    key: `cadastro-${c.id}`,
    title: c.name,
    detail: "Cadastro preenchido pelo tutor. Confira os dados e aprove.",
    actionLabel: "Abrir cadastro",
    href: `/clientes/${c.id}`,
  }));
```

E, no array retornado, um grupo novo no mesmo formato dos existentes:

```ts
{
  key: "cadastros",
  title: "Cadastros aguardando aprovação",
  what: "Tutores que preencheram a ficha pelo link de convite e ainda não foram aprovados.",
  why: "Enquanto não aprovar, o cliente não entra na sua carteira nem aparece nos relatórios.",
  Icon: IconUser,
  tone: "text-[var(--accent)]",
  items: pendingClients,
  emptyLabel: "Nenhum cadastro esperando aprovação.",
},
```

Conferir o nome real do ícone disponível:

```bash
grep -n "export function Icon" components/icons.tsx | head -20
```

Usar um que exista; não inventar.

- [x] **Step 4: Botão aprovar**

Em `app/clientes/page.tsx`, no ponto que já trata `client.status === "Rascunho"` (por volta da linha 378), acrescentar o botão que chama:

```ts
await fetch("/api/clients", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: client.id, action: "approve" }),
});
```

Tratar o 402: mostrar a mensagem de `error` vinda da resposta, que já explica o limite do plano.

- [x] **Step 5: Verificar tipos e testes**

```bash
npm run check:invite && npm run check:home && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Esperado: os dois checks passam, e nenhum erro novo de tipo.

- [x] **Step 6: Commit**

```bash
git add app/api/clients app/pendencias app/clientes
git commit -m "feat(convite): aprovacao do rascunho e limite de plano por cliente ativo"
```

---

### Task 8: Tutorial e tour (obrigatório pelo AGENTS.md)

**Files:**
- Modify: `app/tutorial/page.tsx`
- Modify: `app/tutorial/cliente/page.tsx`
- Modify: `components/product-tour.tsx`

**Interfaces:**
- Consumes: âncora `data-tour="client-invite"` criada na Task 6
- Produces: nada consumido por outras tasks

- [x] **Step 1: Guia do adestrador**

Em `app/tutorial/page.tsx`, na seção de fluxo e no mapa de telas, descrever: gerar convite em Clientes → mandar o link → o tutor preenche → o cadastro chega como rascunho → conferir e aprovar. Seguir a estrutura de seções que o arquivo já usa.

- [x] **Step 2: Guia do cliente**

Em `app/tutorial/cliente/page.tsx`, explicar que o primeiro acesso pode vir por um link de convite, que o cadastro leva menos de um minuto e que a ficha completa pode ser preenchida depois.

- [x] **Step 3: Passo do tour**

Em `components/product-tour.tsx`, acrescentar em `TRAINER_STEPS`, no formato exato dos passos existentes:

```ts
{
  target: '[data-tour="client-invite"]',
  title: "Convide o cliente",
  body: "Gere um link, mande no WhatsApp e o tutor preenche o próprio cadastro.",
},
```

Conferir os nomes de campo reais lendo um passo existente antes de escrever.

- [x] **Step 4: Rodar o build**

```bash
npm run build:local
```

Esperado: build conclui sem erro. (`build` normal roda `prisma db push` — usar `build:local`.)

- [x] **Step 5: Commit**

```bash
git add app/tutorial components/product-tour.tsx
git commit -m "docs(convite): tutorial e tour do convite de autocadastro"
```

---

### Task 9: Verificação ponta a ponta

**Files:** nenhum (verificação)

- [ ] **Step 1: Subir a aplicação**

```bash
npm run dev
```

- [ ] **Step 2: Percorrer o fluxo no navegador**

1. Logar como adestrador, abrir `/clientes`, clicar em "Convidar cliente", gerar o link.
2. Abrir o link numa janela anônima, preencher os cinco campos, enviar.
3. Confirmar o redirecionamento para a ficha completa de onboarding.
4. Clicar em "Deixar para depois" e confirmar que cai no portal.
5. Voltar ao link de convite e confirmar que aparece "Você já se cadastrou" com o botão de reentrada.
6. Como adestrador, confirmar o cliente como **Rascunho** em `/clientes` e o item em `/pendencias`.
7. Aprovar e confirmar que virou **Ativo**.

- [ ] **Step 3: Casos de erro**

- Revogar um convite pendente e abrir o link: deve dizer que foi cancelado.
- Alterar `expiresAt` de um convite no banco para o passado e abrir: deve dizer que venceu.
- Abrir `/convite/token-invalido`: mensagem de convite inválido.

- [ ] **Step 4: Registrar o resultado**

Reportar a saída real de `npm run check:invite`, do `npm run build:local` e o que aconteceu em cada passo do navegador. Falhou, diz que falhou e mostra a saída.

---

## Self-Review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| Model `ClientInvite` | 2 |
| `lib/client-invite.ts` + ordem do status | 1 |
| `clientInviteSchema` | 1 |
| `POST/GET/PATCH /api/client-invites` | 3 |
| `GET/POST /api/invite/[token]` com `alreadyUsed` | 4 |
| Transação criando cliente + cão + portal | 4 |
| Push fora da transação | 4 |
| Reentrada por 7 dias | 1 (lógica) + 4 (rota) + 5 (tela) |
| Tela `/convite/[token]` | 5 |
| "Deixar para depois" no onboarding | 5 |
| Botão e lista em `/clientes` | 6 |
| Rascunho fora da contagem do plano | 7 |
| Limite checado na geração e na aprovação | 3 e 7 |
| Grupo em Pendências | 7 |
| Botão aprovar | 7 |
| Rate limit nas rotas públicas | 4 |
| Mensagens de erro distintas por motivo | 4 |
| Testes `check:invite` | 1 |
| Tutorial e tour | 8 |
| Duplicata fora de escopo | — (deliberado) |

**Placeholders:** nenhum "TBD"/"TODO". Os pontos marcados como "conferir a assinatura real" (audit, push, buildWaUrl, ícones, classes CSS) são passos de verificação com comando exato, não lacunas — existem porque esses arquivos não foram lidos por inteiro durante o planejamento, e inventar assinatura seria pior que mandar conferir.

**Consistência de tipos:** `InviteLifecycle` é o mesmo shape consumido em Tasks 3 e 4. `getInviteStatus` retorna o mesmo union usado no type `Invite` da Task 6. `shareUrl` (Task 3) e `portalUrl` (Task 4) têm nomes distintos de propósito — são coisas diferentes.
