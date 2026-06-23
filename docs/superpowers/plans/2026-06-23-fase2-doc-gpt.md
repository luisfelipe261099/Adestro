# Fase 2 — Itens da análise visual do GPT · Plano de Implementação

> **Para quem executa:** plano por sub-projetos independentes. Cada sub-projeto é
> entregável sozinho. Recomendado executar um sub-projeto por vez, numa branch com
> preview, revisando antes do merge.

**Goal:** Implementar os itens do 2º documento do chefe (análise visual/UX do GPT) que
ficaram como Fase 2, sem quebrar a produção.

**Architecture:** App Next.js 16 (App Router) + Prisma (MySQL) + Zustand (store no
cliente). A home hidrata dados via APIs e o store. Mudanças de banco são ADITIVAS e a
Vercel roda `prisma db push` no build.

**Tech Stack:** Next.js 16, React 19, Prisma 5, TailwindCSS 4, Zustand.

## Global Constraints (valem para TODAS as tarefas)
- **Workflow:** trabalhar numa branch `fase2/<sub-projeto>` → abrir PR → testar no
  **deploy de preview da Vercel** → só então merge na `master`. NÃO commitar direto na
  master (ao contrário da Fase 1, estas são features novas e com schema).
- **Schema só ADITIVO:** apenas colunas nuláveis novas ou tabelas novas. `db push` no
  build falha (fail-safe) em mudança destrutiva — então nunca renomear/remover coluna.
- **Não há test runner no projeto.** O gate de verificação de cada tarefa é:
  `npx prisma generate && npx tsc --noEmit` (precisa sair **limpo, exit 0**) +
  **conferência manual no preview**. Não inventar testes unitários.
- **Verificação de tipo exige `prisma generate` antes do `tsc`** (senão dá falso erro
  em campos novos do Prisma).
- Commits pequenos e descritivos.

---

## Decisões a tomar antes (decision gates)

Responder antes de iniciar o sub-projeto correspondente:

- **A1 — "fase do treino":** derivar do progresso (Inicial / Intermediário / Avançado /
  Formado) **[recomendado, sem campo novo]** ou criar campo `trainingPhase` no `Dog`?
- **A2 — total de sessões (o "Y" de "Sessão X/Y"):** somar `sessionsCount` dos
  `ClientContract` **ativos** do cão **[recomendado]**; se não houver contrato, esconder "/Y".
- **B1 — categorias comportamentais:** usar as 7 do documento (obediência, reatividade,
  socialização, ansiedade, passeio, recall, controle de impulsos)?
- **B2 — origem das notas:** o adestrador avalia (0–5) por sessão no registro
  **[recomendado]** ou a IA infere?
- **C1 — "não visualizado":** adicionar `viewedAt` na `PortalTask` e marcar quando o
  cliente abre o portal **[recomendado]**, ou pular esse indicador nesta fase?
- **D1 — rota de "Planos de treino":** usar `/planos-treino` (porque `/planos` já é a
  assinatura do adestrador).
- **D2 — conteúdo das telas:** "Planos de treino" lista pacotes/contratos por cliente;
  "Evolução" = visão por cão (gráfico de progresso + histórico de relatórios).

---

## Sub-projeto A — Card do cão completo (Sessão X/Y · fase · progresso %)
**Risco:** baixo · **Esforço:** ~meio dia · **Depende de:** nada

**Objetivo:** o card do cão ("Cães em atenção" e "Próxima sessão") mostrar plano (já
feito), barra de progresso, "Sessão X de Y" e a fase do treino.

**Files:**
- Modify: `app/api/clients/route.ts` — incluir, por cão, `sessionsTotal` (soma de
  `sessionsCount` dos `ClientContract` com status "Ativo" daquele cão).
- Modify: `lib/app-store.ts` — adicionar `sessionsTotal?: number` ao tipo `DogProfile`.
- Modify: `lib/home-agenda.ts` — em `DogAttention` adicionar `sessionsTotal`,
  `progressPct` (= `sessionCount / sessionsTotal`, 0–100, 0 se sem total) e `phaseLabel`
  (derivado de `progressPct`: <34 "Inicial", <67 "Intermediário", <100 "Avançado",
  =100 "Formado").
- Modify: `components/attention-dogs.tsx` e `components/next-session-card.tsx` —
  renderizar barra de progresso + "Sessão {sessionCount}/{sessionsTotal}" + chip de fase.

**Passos:**
1. Estender `app/api/clients/route.ts`: ao montar cada dog, consultar contratos ativos
   (ver padrão em `app/api/finance/contracts/route.ts`) e somar `sessionsCount` →
   `sessionsTotal`. Gate: `prisma generate && tsc`.
2. Adicionar `sessionsTotal?: number` em `DogProfile` (`lib/app-store.ts`) e propagar na
   hidratação. Gate: `tsc`.
3. Estender `DogAttention` + `computeDogAttention` (`lib/home-agenda.ts`) com
   `sessionsTotal`, `progressPct`, `phaseLabel` (derivados). Gate: `tsc`.
4. Renderizar no `attention-dogs.tsx` (barra + X/Y + fase) e no `next-session-card.tsx`
   (chip "Sessão X/Y · fase"). Gate: `tsc`.
5. Commit + PR + conferir no preview (abrir dashboard, ver barra/fase corretas).

---

## Sub-projeto B — Evolução comportamental por categoria
**Risco:** médio · **Esforço:** 1–2 dias · **Depende de:** decisões B1/B2

**Objetivo:** registrar e visualizar a evolução do cão nas categorias comportamentais
(não só "treinos concluídos").

**Files:**
- Modify: `prisma/schema.prisma` — em `DogTrainingSession` adicionar
  `behaviorScores String? @db.Text` (JSON `{categoria: nota 0-5}`, **nullable**, aditivo).
- Modify: `app/api/sessions/route.ts` — POST e PATCH gravam `behaviorScores`
  (`JSON.stringify(ds.behaviorScores ?? {})`).
- Modify: `app/treinos/registro/registro-client.tsx` — nova mini-seção (ou dentro da
  Seção 1) com as 7 categorias e estrelas (0–5); estado `behaviorScores` + envio no
  payload (mesmo padrão de `nextTaskOptions`).
- Modify: `components/progress-chart.tsx` — aceitar as categorias dinâmicas (hoje são 4
  fixas) a partir das notas agregadas.
- Modify: `app/api/relatorios/generate/route.ts` — agregar `behaviorScores` por mês para
  alimentar o gráfico/relatório.

**Passos:**
1. Schema: adicionar `behaviorScores` (nullable). `prisma generate && tsc`.
2. Persistência no `app/api/sessions/route.ts` (POST+PATCH). `tsc`.
3. UI de avaliação no registro (7 estrelas-categoria) + estado + payload. `tsc`.
4. Agregação no `relatorios/generate` + consumo no `progress-chart`. `tsc`.
5. Commit + PR + preview (registrar uma sessão com notas e ver o gráfico).

---

## Sub-projeto C — Painel "Cliente precisa fazer"
**Risco:** médio · **Esforço:** ~1 dia · **Depende de:** decisão C1

**Objetivo:** painel na home com, por cliente: **adesão %** (tarefas concluídas/total),
**tarefas não visualizadas** e **dias sem resposta** (último feedback).

**Files:**
- Modify: `prisma/schema.prisma` — `PortalTask.viewedAt DateTime?` (**nullable**, aditivo).
- Modify: `app/api/portal-public/[token]/route.ts` — ao listar tarefas do portal, marcar
  `viewedAt` (set se nulo) — significa "cliente viu".
- Modify: `app/portal/cliente/portal-public-client.tsx` — garantir a chamada que marca
  visto ao abrir.
- Create: `components/client-followup.tsx` — usa `portalTasks` + `portalFeedbacks` do
  store: adesão % (`completed/total`), nº de tarefas com `viewedAt` nulo, dias desde o
  último feedback do cliente.
- Modify: `app/dashboard/page.tsx` — incluir `<ClientFollowup />` (nova seção).

**Passos:**
1. Schema: `viewedAt` (nullable). `prisma generate && tsc`.
2. Marcar `viewedAt` no endpoint do portal + no client do portal. `tsc`.
3. `components/client-followup.tsx` (derivar adesão/sem-resposta do store; não-visto via
   viewedAt). `tsc`.
4. Incluir na dashboard. `tsc`.
5. Commit + PR + preview.

> **Nota:** "adesão %" e "dias sem resposta" derivam do store (já carregado) e dão pra
> entregar mesmo sem o `viewedAt`. Se a decisão C1 for "pular não-visto", entregar só
> esses dois e remover a coluna de viewedAt do escopo.

---

## Sub-projeto D — Telas "Planos de treino" e "Evolução"
**Risco:** médio · **Esforço:** 1–2 dias · **Depende de:** D1/D2 (e B p/ "Evolução" rica)

**Objetivo:** novas telas no menu: gestão de planos de treino e visão de evolução por cão.

**Files:**
- Create: `app/planos-treino/page.tsx` — lista de pacotes/contratos por cliente (reusar
  `app/api/finance/contracts/route.ts` e `ServicePackage`).
- Create: `app/evolucao/page.tsx` — seletor de cão + `progress-chart` + histórico de
  relatórios (`/api/relatorios`).
- Modify: `components/site-header.tsx` — adicionar `{ href: "/planos-treino", label:
  "Planos de treino" }` e `{ href: "/evolucao", label: "Evolução" }` (em `TRAINER_NAV`
  ou `TRAINER_SECONDARY`; avaliar lotação do menu).

**Passos:**
1. `app/evolucao/page.tsx` reaproveitando `progress-chart` + `/api/relatorios`. `tsc`.
2. `app/planos-treino/page.tsx` listando contratos/pacotes. `tsc`.
3. Adicionar itens no menu (`site-header.tsx`). `tsc`.
4. Commit + PR + preview (navegar pelas duas telas).

> **Ordem interna:** fazer "Evolução" depois do Sub-projeto B deixa o gráfico rico (7
> categorias). Dá pra entregar antes com as 4 dimensões atuais e enriquecer depois.

---

## Sub-projeto E — Timeline da agenda (OPCIONAL)
**Risco:** baixo · **Esforço:** ~meio dia · **Prioridade:** baixa

**Objetivo:** visão do dia em timeline (manhã/tarde/noite) com cor por status.

**Nota:** o "Quadro do dia" (Kanban) já cobre essa necessidade. Só fazer se o chefe
pedir explicitamente a timeline. Seria um novo componente em `app/agenda/page.tsx` ou na
home, agrupando eventos por período do dia.

---

## Ordem recomendada
1. **A** (rápido, alto impacto visual, sem schema).
2. **C** (valor operacional alto; entregar adesão/sem-resposta primeiro, viewedAt depois).
3. **B** (base de dados da evolução comportamental).
4. **D** (telas; "Evolução" fica melhor após B).
5. **E** (opcional).

**Esforço total estimado:** ~4–6 dias de desenvolvimento.

---

## Self-review (cobertura vs. pendências da Parte 2 do relatório)
- Card do cão (Sessão X/Y, fase, progresso) → **Sub-projeto A** ✔
- Evolução comportamental por categoria → **Sub-projeto B** ✔
- "Cliente precisa fazer" (adesão / não visto / sem resposta) → **Sub-projeto C** ✔
- Menu "Planos de treino" + "Evolução" (telas novas) → **Sub-projeto D** ✔
- Timeline manhã/tarde/noite → **Sub-projeto E** (opcional) ✔
- Sem placeholders pendentes; mudanças de schema todas aditivas; verificação = `prisma
  generate && tsc` + preview (projeto não tem test runner).
