# Autocadastro de cliente por convite

**Data:** 2026-07-30
**Status:** aprovado, pronto para plano de implementação

## Problema

Hoje, para colocar um cliente novo no Adestro, o adestrador precisa criar o
`ClientProfile` na mão em `/clientes`. Só depois disso ele consegue gerar um
`PortalAccessLink` e mandar a ficha de onboarding para o tutor preencher.

O pedido do cliente (o adestrador) é eliminar essa digitação inicial: mandar um
link para a pessoa e ela mesma se cadastrar.

## O que já existe e vai ser reaproveitado

Metade do caminho já está construída:

- `PortalAccessLink` — token de 32 bytes guardado só como `sha256`, com
  `tokenPrefix` para identificação na UI, PIN opcional de 4 dígitos, validade e
  revogação.
- `/portal/cliente/[token]/onboarding` — ficha completa preenchida pelo tutor
  (dados dele, endereços, e o cão inteiro: raça, vacinas, temperamento, rotina,
  objetivos, análise ambiental). Ao enviar, o cliente vira `status: "Rascunho"`.
- `/clientes` — já exibe Rascunho de forma distinta e tem filtro "Rascunhos".
- `lib/portal-access.ts` — `buildPortalToken`, `hashPortalToken`,
  `getTokenPrefix`, `getPortalExpiryDate`. Genéricos, não sabem que existe portal.
- `lib/rate-limit.ts`, `lib/push.ts`, `lib/audit.ts`, `lib/whatsapp.ts`.
- `/pendencias` — deriva os grupos no cliente, a partir de dados já carregados.

O bloqueio é um só: `PortalAccessLink.clientId` é `@unique` e obrigatório, ou
seja, o link exige um cliente que já exista. Um convite é 1 link ↔ 0-ou-1
cadastro *futuro* — outra cardinalidade.

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Tipo de link | Convite individual gerado pelo adestrador (não link público fixo) |
| Tamanho da ficha | Passo 1 curto cria o cadastro; emenda na ficha completa existente |
| Acesso do cliente depois | Por link com token, sem senha (como o portal hoje) |
| Chegada do cadastro | `status: "Rascunho"` + push + item em Pendências |
| Modelagem | Model próprio `ClientInvite` |

Alternativas descartadas: afrouxar `PortalAccessLink.clientId` para nulo (faria
um model ter dois significados e obrigaria todo leitor a tratar nulo), e criar
um `ClientProfile` fantasma no momento do convite (ocuparia vaga no limite do
plano e obrigaria toda tela a esconder um status novo).

## Modelo de dados

```prisma
model ClientInvite {
  id          String   @id @default(cuid())
  trainerId   String
  trainer     Trainer  @relation(fields: [trainerId], references: [id], onDelete: Cascade)

  label       String?           // "Maria do Instagram" — só o adestrador vê
  tokenHash   String   @unique  // sha256 do token; o token nunca é salvo
  tokenPrefix String            // 10 primeiros chars, para a UI identificar
  expiresAt   DateTime
  revokedAt   DateTime?

  // Preenchido quando o convite vira cadastro. Nulo = ainda não usado.
  clientId    String?        @unique
  client      ClientProfile? @relation(fields: [clientId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([trainerId])
  @@index([expiresAt])
}
```

`ClientProfile` ganha o lado inverso da relação: `invite ClientInvite?`.

Notas:

- **Sem campo `usedAt`** — seria redundante com `clientId != null`, e dois
  campos que precisam concordar acabam discordando. O instante do uso está em
  `ClientProfile.createdAt`.
- **Validade padrão de 7 dias** (faixa 1–30), contra os 90 do portal. Convite é
  efêmero.
- **Sem PIN.** O PIN existe no portal porque o link dura 90 dias no WhatsApp de
  alguém. Se fizer falta no convite, entra depois.
- O `clientId` nulo aqui marca **estágio do ciclo de vida** do convite, não o
  tipo da linha — diferente do que aconteceria se afrouxássemos o
  `PortalAccessLink`.

## Lógica pura — `lib/client-invite.ts`

Extraída de propósito para fora das rotas, porque `route.ts` só roda dentro de
uma request com sessão e banco.

```ts
INVITE_DEFAULT_DAYS = 7
INVITE_MIN_DAYS = 1
INVITE_MAX_DAYS = 30

normalizeInviteDays(value?: number): number

getInviteStatus({ revokedAt, expiresAt, clientId }, nowMs?):
  "Revogado" | "Usado" | "Expirado" | "Pendente"

canReenterInvite({ revokedAt, expiresAt, clientId }, nowMs?): boolean
```

A **ordem** de `getInviteStatus` é regra de negócio, nesta sequência:

1. `Revogado` vence tudo — foi decisão explícita do adestrador, e dizer
   "expirado" sugeriria que basta esperar ou reabrir.
2. `Usado` vence `Expirado` — o convite converteu em cliente, que é o desfecho
   de sucesso. Mostrar "Expirado" num convite que virou cadastro leria como
   falha.
3. `Expirado` vence `Pendente`.

`canReenterInvite` é outra pergunta e por isso é outra função: exige
`clientId` preenchido, **e** não revogado, **e** não expirado.

Ambas recebem `nowMs` opcional para serem testáveis sem depender do relógio.

`clientInviteSchema` (zod) em `lib/validators.ts`, junto dos demais:
`clientName` e `dogName` obrigatórios; `phone`, `email`, `breed` opcionais.

## Rotas

| Rota | Acesso | Comportamento |
|---|---|---|
| `POST /api/client-invites` | trainer | gera convite; devolve `shareUrl` (única vez que o token existe em texto) |
| `GET /api/client-invites` | trainer | lista com status derivado |
| `PATCH /api/client-invites` | trainer | `{ id, action: "revoke" }` |
| `GET /api/invite/[token]` | público | valida e devolve o nome do adestrador + `alreadyUsed` |
| `POST /api/invite/[token]` | público | cria o cadastro (ou reemite o portal), devolve `portalUrl` |

`GET` devolve `{ trainerName, status, alreadyUsed }` — nunca dados do cliente,
mesmo com o convite já usado, porque a página é pública. Com `alreadyUsed: true`
a tela troca o formulário por um botão "Abrir meu portal", que dispara o `POST`
sem payload (caminho de reentrada).

`POST /api/invite/[token]`, em ordem:

1. Rate limit por IP (`lib/rate-limit.ts`).
2. Resolve `sha256(token)` → convite.
3. Se o convite **já tem `clientId`** e não expirou: rotaciona o
   `PortalAccessLink` daquele cliente e devolve o `portalUrl` novo (reentrada —
   ver abaixo).
4. Valida o payload com `clientInviteSchema`.
5. **Uma transação**: cria `ClientProfile` (`status: "Rascunho"`), `Dog`,
   `PortalAccessLink` de 90 dias, e grava `invite.clientId`.
6. **Fora da transação**: push para o adestrador e `audit()` com escopo `client`.
7. Devolve `portalUrl`.

A transação é obrigatória: sem ela, uma falha ao criar o cão deixa um cliente
órfão e o convite queimado, e a pessoa não consegue mais entrar.

O push fica fora porque é efeito colateral externo — serviço de push fora do ar
não pode derrubar o cadastro do cliente.

## Telas

**Adestrador — `/clientes`:** botão "Convidar cliente" ao lado de "Novo
cliente". Modal com rótulo opcional, validade (padrão 7 dias) e botão gerar. O
link aparece uma única vez, com "Copiar" e "Enviar no WhatsApp" (`buildWaUrl`).
Abaixo, lista dos convites pendentes com status e botão revogar.

Fica em `/clientes` e não em `/portal` porque é ali que nasce a intenção
"preciso de um cliente novo"; `/portal` é a casa do cliente que já existe.

**Cliente — `/convite/[token]`:** página pública, sem sessão. "Você foi
convidado por *Fulano*", cinco campos (nome, WhatsApp, e-mail, nome do cão,
raça), botão continuar. Ao enviar, redireciona para
`/portal/cliente/[novoToken]/onboarding`, que ganha um botão "deixar para
depois" levando ao portal.

**Pendências:** grupo novo "Cadastros aguardando aprovação", filtrando os
clientes já carregados por `status === "Rascunho"`, no mesmo padrão dos quatro
grupos existentes.

**Aprovação:** botão na ficha do cliente Rascunho que muda o status para
`Ativo`, checando o limite do plano antes.

## Limite de plano

Duas mudanças em como `checkLimit` é aplicado:

1. Verificar o limite **ao gerar o convite** — estourado, o botão explica e não
   gera. Melhor barrar aí do que deixar a pessoa preencher a ficha para levar
   erro no fim.
2. Contar para o limite apenas clientes **não-Rascunho**, e verificar de novo na
   **aprovação**.

Motivo: se o teto foi atingido entre gerar e preencher, descartar o cadastro
custa o ativo mais caro do adestrador. O Rascunho entra; quem barra é a
aprovação, com mensagem de upgrade. Na prática isso só altera o
comportamento da importação CSV, e a favor do usuário.

## Reentrada — o problema do link perdido

A pessoa termina o passo 1, é redirecionada ao portal e fecha o navegador. O
token do portal só existiu naquela URL; nem o sistema consegue recuperá-lo,
porque só o hash é guardado.

Solução: **o convite não morre no primeiro uso.** Enquanto não expirar, reabrir
o link de convite que já tem `clientId` rotaciona o `PortalAccessLink` daquele
cliente e redireciona.

Custo aceito: quem tiver o link de convite consegue reemitir acesso ao portal
daquele cliente até o vencimento. O link foi mandado direto para a pessoa e dura
7 dias, e resolve o "perdi o link" que hoje o adestrador atende na mão.

## Erros

- Token inexistente, expirado ou revogado: mensagens distintas. Nada de erro
  genérico numa tela que o cliente final vê.
- Payload inválido: `badRequest()` de `lib/validators.ts`.
- Limite de plano na geração: 402 com `code: "PLAN_LIMIT"`, como o
  `POST /api/clients` já faz.
- Rate limit nas duas rotas públicas.

Adivinhar token não é ameaça: 32 bytes aleatórios.

## Fora de escopo (deliberado)

- **Detecção de cadastro duplicado.** Dois convites preenchidos pela mesma
  pessoa geram dois Rascunhos, e a aprovação já é onde um humano olha. Resolver
  no código um problema que o fluxo resolve seria trabalho perdido.
- **Link público fixo do adestrador** (bio do Instagram). Descartado nesta
  rodada; o model `ClientInvite` não impede que entre depois.
- **Login com senha para o cliente.** O acesso continua por token.

## Testes

O projeto não usa framework de teste. O padrão existente é
`scripts/check-home-agenda.mts`: `node:assert/strict` rodando com
`--experimental-strip-types`, exposto como script no `package.json`.

- `scripts/check-client-invite.mts` + script `check:invite`.
- Cobre a tabela-verdade de `getInviteStatus` — incluindo convite revogado **e**
  expirado, onde a ordem importa — `normalizeInviteDays` nos limites (0, 1, 30,
  31, `NaN`, `undefined`) e `clientInviteSchema` aceitando/rejeitando payload.
- Verificação manual ponta a ponta: subir a app, gerar convite, abrir o link,
  preencher, confirmar o Rascunho chegando em `/clientes` e em `/pendencias`.

## Tutorial (obrigatório pelo AGENTS.md, no mesmo commit)

- `app/tutorial/page.tsx` — fluxo de convite no guia do adestrador.
- `app/tutorial/cliente/page.tsx` — o tutor tem uma porta de entrada nova.
- `components/product-tour.tsx` — passo em `TRAINER_STEPS` e âncora `data-tour`
  no botão "Convidar cliente".
