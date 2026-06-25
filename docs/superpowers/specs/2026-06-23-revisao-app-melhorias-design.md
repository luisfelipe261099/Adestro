# Revisão do app Adestro — melhorias do documento do cliente

Data: 2026-06-23
Fonte: documento de "Revisão Inicial novo APP" (feedback do cliente).

## Contexto

A maior parte dos bugs concretos do documento já foi resolvida em commits recentes
(link errado do treino, registro duplicado, contador removido, letras→números,
botão INCLUIR, paleta, 5 cards do dashboard). A Home do adestrador **é** o `/dashboard`
(`app/page.tsx` redireciona via `homeRouteForRole`), e o "Foco do dia" existe como
`NextSessionCard`. Este spec cobre o que ainda falta.

## Decisões do usuário

- "Tutor" → **"Cliente"** na interface.
- Escopo: **só textos visíveis** (sem migração de banco / sem renomear campos/enums).
- Workflow: **commit direto na master** (cada commit = deploy de produção via Vercel).
  Não é possível buildar localmente; rodar `tsc` antes de cada commit e manter commits
  pequenos e auto-contidos. (2 erros falsos de Prisma no tsc local são esperados.)
- Kanban: **por último**, como sub-spec separado.

Ordem de entrega: **1 → 4 → 3 → 2 → 5**.

## Frente 1 — "Tutor" → "Cliente" (texto visível)

**Objetivo:** remover a palavra "Tutor" da interface, trocando por "Cliente".

**Abordagem:**
- Substituir copy puro de UI: labels, placeholders, títulos, passos de tour
  (`DEFAULT_STEPS`/`TUTOR_STEPS` em `components/product-tour.tsx`), título do push do
  cron, textos do tutorial. `Tutor`→`Cliente`, `tutores`→`clientes`, etc.
- **Não** alterar identificadores: `defaultTutorTasks`, nome da const `TUTOR_STEPS`,
  campo `summary_for_tutor`, `tutorsInvited`, valores enum `"Tutor"`.
- Onde `"Tutor"` é **valor de dado exibido** (ex.: `author: "Tutor"` em
  `app/chat/chat-client.tsx`, feedbacks do portal): manter o valor gravado e mapear
  para "Cliente" só na renderização (camada de exibição), preservando registros antigos.

**Critério de sucesso:** nenhuma string "Tutor"/"tutor" visível na navegação do app
e do portal; dados antigos com `author:"Tutor"` continuam exibindo corretamente como
"Cliente"; nada quebra no schema/API.

## Frente 4 — Dúvida "Brief do dia"

**Objetivo:** eliminar a confusão do cliente com o termo "Brief".

**Abordagem:** renomear ocorrências visíveis de "Brief do dia" para "Resumo do dia"
(UI + título do push em `app/api/cron/daily-brief/route.ts`), mantendo o card
"Prioridades de hoje" (`components/daily-brief-card.tsx`) como está. Nome de arquivo/rota
do cron permanece.

**Critério de sucesso:** usuário não vê mais a palavra "Brief"; comportamento idêntico.

## Frente 3 — Date picker unificado

**Objetivo:** entrada de data consistente em todo o app ("selecionador de datas em
todos os lugares").

**Abordagem:** criar `components/date-field.tsx` — wrapper leve do
`<input type="date">` com o estilo do design system (sem lib nova). Trocar os inputs de
data soltos (registro de treino, agenda, financeiro, tarefas) por esse componente e
adicionar onde a entrada de data hoje falta.

**Critério de sucesso:** todos os campos de data usam `DateField`; visual consistente;
sem regressão de formato (mantém conversão `yyyy-mm-dd` ↔ `dd/mm/yyyy` onde já existe).

## Frente 2 — Frequência das tarefas de casa no fluxo do adestrador

**Objetivo:** o adestrador define se a tarefa é **uma vez / diária / dias da semana** no
momento do registro, em vez de só no portal. Resolve também a dúvida "como melhorar as
tarefas de casa" (cliente marcava só uma vez).

**Abordagem:** na Seção 8 (`registro-client.tsx` e `treinos-client.tsx`), cada item de
tarefa passa a carregar `{ text, recurrence, weekdays }` com um seletor compacto
(Uma vez / Diária / Dias da semana + chips de dia). No save, propagar `recurrence` e
`weekdays` para `addPortalTask` (que já aceita `options`). Os campos `recurrence` e
`weekdays` já existem em `PortalTask` (schema).

**Ponto de atenção:** hoje `nextTasks` é `string[]`. Esta frente muda o formato
persistido para objetos — confirmar e ajustar o caminho de save da sessão antes de
implementar. Manter compatibilidade de leitura com tarefas antigas (string → `once`).

**Critério de sucesso:** ao registrar, dá pra escolher a frequência por tarefa; a tarefa
chega no portal do cliente com a recorrência certa; tarefas antigas seguem funcionando.

## Frente 5 — Kanban (sub-spec separado, por último)

**Objetivo:** sugestão "Visual GPT" de misturar o "foco do dia" com uma visualização
kanban.

**Abordagem:** desenhar em spec próprio depois das frentes 1–4 entregues
(provavelmente com o companion visual). Esboço: board com colunas alimentadas pelos
mesmos dados de próxima sessão + prioridades. Não detalhado aqui.

## Fora de escopo

- Renomear campos/enums/identificadores internos relacionados a "Tutor".
- Reescrever o fluxo de registro como wizard sequencial (segue accordion).
- Refatorações não relacionadas.
