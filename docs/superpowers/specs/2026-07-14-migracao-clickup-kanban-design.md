# Migração ClickUp → Adestro + Visão Kanban

**Data:** 2026-07-14
**Status:** aprovado em conversa (design); aguardando plano de implementação

## Contexto e objetivo

O adestrador (cliente do projeto) mantém toda a operação dele numa lista "Clientes"
do ClickUp (workspace "Wollner adestramento canino") e resiste a adotar o sistema
por três motivos combinados: os dados já estão lá, hábito de uso, e a visão de
quadro (kanban) que ele gosta. O objetivo acordado é **migrar 100% para o sistema**.

Solução em três fases:

1. **Importação única** dos dados do ClickUp para o banco do sistema.
2. **Visão kanban** na tela de Clientes, replicando o quadro que ele usa hoje.
3. **Virada assistida**: validação, re-importação do delta e desativação do ClickUp.

Fora de escopo (decidido): sincronização contínua com o ClickUp; importação de
pagamentos como faturas (`ClientInvoice`).

## Dados de origem (verificados via API em 2026-07-14)

Lista `Clientes` (id `901321279780`), 50 cards + 706 subtarefas. Estrutura real:

- **Card** = "Nome(s) do dono - Nome(s) do cão (raça/observação)".
  Ex.: `Sara - Shakira`, `Fernando + Ana - Bruce (Pug) / Vito (Shitzu)`.
- **Status do card** (colunas): `fichas` (5), `ativo` (14), `completo` (13),
  `pausado` (18), `cancelado` (0).
- **Descrição** = ficha padronizada em 49/50 cards:
  `📞 Telefone / 🐕 Sexo e condição / 🐕 Raça / 📅 Idade / 💰 Plano / 🎯 Objetivos /
  Análise comportamental inicial`.
- **Subtarefas** por card: ~10 numeradas (`Nome NN` = sessões do pacote),
  `Visita inicial - análise comportamental`, e 0–3 `Pagamento x/y`.
  323/706 subtarefas têm data (sessões agendadas/realizadas).
- **Campo customizado**: `Orientações ao dono` (texto).
- **Peculiaridades críticas:**
  - "Etapas" são **cards separados** do mesmo cliente+cão
    (ex.: `Daniel - Chico - Etapa 01..04`, `Sidneia - Estrela / 02 etapa / 03 etapa`).
  - Cards com **2+ cães** (`Renata - Gigio e Zefa`) e **2+ donos** (`Luisa/Hugo`).
  - Card-modelo `01 Ficha padrão - ...` deve ser **excluído** da importação.

## Fase 1 — Script de importação

`scripts/import-clickup.ts`, executado **localmente** (nunca em produção/build),
lendo `CLICKUP_API_TOKEN` de `.env.local` (gitignorado; token nunca commitado).

### Fluxo em dois passos

1. **`--dry-run` (padrão):** baixa os cards, aplica o mapeamento e gera
   `clickup-import-preview.md` (tabela: card → cliente/cão/status/contratos/sessões
   + lista de exceções). Nada é gravado. O desenvolvedor e o adestrador revisam.
2. **`--commit`:** grava via Prisma, associado ao `Trainer` do adestrador
   (parâmetro `--trainer-email`).

### Regras de mapeamento

| ClickUp | Sistema |
|---|---|
| Nome do dono (antes do `-`) | `ClientProfile.name` |
| `Telefone:` da descrição | `ClientProfile.phone` |
| `Plano:` da descrição | `ClientProfile.plan` |
| Nome do cão (depois do `-`) | `Dog.name` (um `Dog` por cão listado) |
| `Raça:` / raça no título | `Dog.breed` |
| `Sexo e condição:` | `Dog.sex` / `Dog.castrated` |
| `Idade:` | `Dog.age` |
| `Objetivos:` | `Dog.trainingGoals` |
| `Análise comportamental inicial` | `ClientProfile.privateNotes` |
| `Orientações ao dono` (campo custom) | `ClientProfile.privateNotes` (seção própria) |
| Status da coluna | `Dog.trainingStatus` (**campo novo**, ver Fase 2) |
| Cada card "Etapa N" | `ClientContract` (name = etapa, `sessionsCount` = nº de subtarefas de sessão, `startDate` = 1ª data, status Ativo/Encerrado) |
| Subtarefa de sessão **concluída** | `TrainingSession` (status `Realizado`, `number` = NN, `date` = due date da subtarefa ou data de fechamento) + `DogTrainingSession` vinculada |
| Subtarefas `Pagamento x/y` | anotação em `ClientContract.notes` (não vira fatura) |

### Regras de fusão e exceções

- Cards do mesmo cliente+cão ("etapas") são **fundidos**: um `ClientProfile` + um
  `Dog`; cada card vira um `ClientContract` separado. `Dog.trainingStatus` = status
  do card da etapa **mais recente** (maior número de etapa no título; sem número,
  vale a data de criação do card).
- A identidade de fusão vem de um **arquivo de mapeamento manual**
  (`scripts/clickup-map.json`), gerado pelo dry-run com o palpite do parser e
  editável à mão — com só ~50 cards, revisão humana é mais confiável que heurística.
- Casos ambíguos (2+ donos, 2+ cães, sufixos como "(Tobias agregado)") ficam
  marcados como `REVISAR` no preview e só entram no commit depois de resolvidos
  no arquivo de mapeamento.
- **Idempotência:** o script guarda o id do card ClickUp numa linha-marcador no
  fim de `ClientContract.notes` (formato `[clickup:<task_id>]`) e a usa como chave
  para re-rodar no dia da virada importando apenas o que mudou, sem duplicar.

## Fase 2 — Visão kanban

- **Campo novo** `Dog.trainingStatus String @default("Ativo")` com valores
  `Ficha | Ativo | Completo | Pausado | Cancelado` (migração Prisma).
  O cão é a unidade do quadro (não o cliente): um dono pode ter cães em fases
  diferentes.
- Na tela **Clientes** (que já tem o seletor Clientes/Cães), um terceiro modo
  **"Quadro"**: colunas por `trainingStatus`, um card por cão mostrando
  nome do cão + dono, progresso de sessões (X/Y do contrato ativo) e próxima
  sessão agendada.
- **Arrastar o card entre colunas atualiza `trainingStatus`** (o gesto que ele já
  usa no ClickUp). Fallback sem drag: menu no card. Mobile: colunas com scroll
  horizontal.
- A ficha do cão (`/caes/[id]`) exibe e permite editar o mesmo status.

## Fase 3 — Virada

1. Importação com revisão do preview junto com o adestrador.
2. Uma a duas semanas de uso do sistema como fonte primária.
3. Re-execução do script (delta) para capturar o que mudou no período.
4. ClickUp vira somente leitura (arquivo morto).

## Segurança

- Token da API do ClickUp fica **apenas** em `.env.local` (coberto por `.env*` no
  `.gitignore`). Nunca em código, spec, preview ou commit.
- O preview de importação (`clickup-import-preview.md`) contém dados pessoais
  (telefones) — não deve ser commitado; adicionar ao `.gitignore`.

## Testes

- Parser da descrição/título coberto por testes unitários com os formatos reais
  observados (ficha padrão, multi-cão, multi-dono, sufixo de raça, "Etapa N").
- Dry-run contra o dump real salvo em fixture anonimizada.
- Kanban: teste manual guiado (mover card, conferir persistência e ficha do cão).
