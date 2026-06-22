# Home "Foco do Dia" + paleta consultório — design

Data: 2026-06-22
Status: aprovado para implementação

## Contexto

O cliente (adestrador profissional) pediu um layout "mais profissional, perfil
de trabalho de verdade, porém TDAH-friendly". O screenshot enviado (`home.jpeg`,
18/jun) está desatualizado: a home no código (22/jun) já tem cards coloridos por
foco, Brief do dia, visão financeira e pendências. O trabalho real é fechar as
lacunas de alto impacto que ainda faltam, sem refazer o que já funciona.

Decisões do usuário:
- **Paleta:** quente medida, via tokens (claro/escuro, reversível).
- **Escopo:** hero "Próxima sessão" + saudação contextual + "Cães em atenção" +
  rebalanceamento da hierarquia.
- Terminologia mantida em **"Cliente"** (decisão do time, não "Tutor").

## Componentes (unidades isoladas)

### 1. `lib/home-agenda.ts` (puro, sem estado)
- `resolveEventDate(day, now?)` → `YYYY-MM-DD`. Espelha `parseEventDate` da
  agenda (data ISO, `dd/mm/yyyy`, ou nome de dia da semana → próxima ocorrência).
  **Não** altera `app/agenda/page.tsx`.
- `eventTimestamp(day, time, now?)` → ms, para "é futuro?" e ordenação.
- `relativeDayLabel(day, now?)` → "Hoje" / "Amanhã" / dia da semana / `dd/mm`.
- `parsePlanTotal(plan)` → nº de aulas se o plano contém "N aulas", senão `null`.

### 2. `components/next-session-card.tsx` (hero)
Lê o store. Escolhe o evento futuro mais próximo (`ts >= agora - 90min`, ordenado).
Mostra: hora + rótulo relativo, avatar do cão (`<Image fill unoptimized onError→
/images/dog-default-bolt.svg>`, padrão de `clientes`), nome · raça · idade,
cliente, "Sessão X/Y" (Y só via `parsePlanTotal`, senão "Sessão X"), tipo de
treino (`dog.trainingTypes[0]` ou `event.plan`), badge de status. Ações:
`Registrar treino` (`/treinos/registro?clientId&dogId`), `Ver ficha` (`/clientes`),
`WhatsApp` (`buildWaUrl` + `waTemplates.lembreteTreino`; secundário se sem telefone),
`Remarcar` (`/agenda`). Estado vazio: CTA "Criar agendamento".

### 3. `components/attention-dogs.tsx` (semáforo, só sinais reais)
Para cada cão de `clients[].dogs`:
- 🔴 **Treino sem registro:** evento "Confirmado" com `dogId` sem sessão registrada.
- 🟡 **Sem próxima aula:** nenhum evento futuro para o cão.
- 🟢 **Em dia:** caso contrário.
Ordena vermelho → amarelo; se nada precisa de ação, mostra estado calmo.
**Não** atribui "pagamento em atraso" por cão (o store não liga `PaymentItem` a
cliente — só existe o agregado `finance.overdue`, que continua no painel financeiro).

### 4. `app/dashboard/page.tsx` (reestrutura)
Ordem: header com saudação contextual ("você tem N sessões hoje · M treino(s) a
registrar · atraso") → hero → faixa compacta de 4 cards-foco (remove "Agenda da
semana", redundante com "Agenda do dia") → `AttentionDogs` → próximos atendimentos
+ Brief → visão financeira + pendências → atalhos. Mantém tudo que já existe.

### 5. `app/globals.css` (paleta)
Troca **valores** de tokens (sem novas classes): `--background` areia `#F4F1EA`,
`--surface` branco quente `#FAFAF7`, `--foreground` grafite `#111827`, `--accent`
petróleo `#1E3A3A`, `--success` sálvia, muted/bordas em stone (cinza quente).
Re-harmoniza as 5 famílias de `stat-card` na paleta quente. Tema escuro recebe as
versões equivalentes.

## Honestidade / fora de escopo
- Sem radar de evolução comportamental (sem dado estruturado por eixo).
- "Sessão X/Y" só quando Y é derivável do plano.

## Risco
Paleta é global (muda todas as telas — desejado). Só valores de cor → baixo risco
técnico. Não há build/deploy local e o ambiente faz auto-push → master + Vercel.
Implementar tudo, mostrar o diff e **só commitar com OK explícito**.

## Atualização (2ª leva — "igual ao documento")

A pedido do cliente, a home foi alinhada item a item ao wireframe do documento:
- Mensagem contextual exata: "Você tem N sessões hoje. A próxima é com X às H".
- Hero com campos "Sessão X de Y" + "Foco:" e ações Iniciar sessão / Ver ficha do
  cão / Enviar WhatsApp / Remarcar.
- 4 métricas do documento: Sessões hoje · Relatórios pendentes · Pagamentos a
  receber · Cães em atenção.
- Bloco "O que precisa da sua atenção" (Relatórios pendentes, Pagamentos em atraso,
  Tutores sem resposta, Planos vencendo — os dois últimos sem fonte de dados ainda,
  exibidos com 0).
- "Agenda de hoje" em timeline Manhã/Tarde/Noite com cor de status
  (`components/today-timeline.tsx`).
- "Checklist de hoje" derivado de tarefas reais (`components/today-checklist.tsx`).
- "Dinheiro a receber" (financeiro compacto) e "Evolução dos cães" (carteira/semáforo).
- Copy: "Brief do dia" → "Prioridades de hoje"; "Próximos atendimentos" → "Agenda
  das próximas sessões"; "Visão financeira" → "Dinheiro a receber".
- Menu: "Início" → "Hoje" (site-header e mobile-navigation).
- Paleta Opção A exata: grafite #111827, petróleo #1E3A3A, sálvia #6B8F71, areia
  #F4F1EA, branco quente #FAFAF7.

Fora de escopo (sem dado estruturado): radar de evolução comportamental por eixo e
"Progresso %" exato na ficha do cão — exigem mudança de modelo de dados.
