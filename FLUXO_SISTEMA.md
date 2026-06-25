# Fluxo e Logica do Sistema — Documento Tecnico-Funcional

Data: 15/04/2026
Projeto: Plataforma SaaS para adestradores

---

## 1. Tipos de usuario e nivel de acesso

O sistema possui tres perfis de usuario com permissoes completamente distintas.
Cada perfil ve uma navegacao diferente e acessa apenas suas rotas autorizadas.

```
+------------------+      +------------------+      +------------------+
|      ADMIN       |      |   ADESTRADOR     |      |    CLIENTE       |
|                  |      |                  |      |   (Tutor)        |
| Gestao da        |      | Operacao diaria  |      | Acompanhamento   |
| plataforma       |      | com seus clientes|      | do seu cao       |
+------------------+      +------------------+      +------------------+
| /admin           |      | /dashboard       |      | /portal/cliente  |
| /admin/adestr.   |      | /clientes        |      |                  |
| /admin/planos    |      | /treinos         |      |                  |
| /admin/faturamento      | /agenda          |      |                  |
| /admin/relatorios|      | /portal          |      |                  |
+------------------+      | /financeiro      |      +------------------+
                          | /ia              |
                          | /planos          |
                          +------------------+
```

---

## 2. Fluxo de entrada no sistema

```
USUARIO ACESSA O SISTEMA
        |
        v
   [ /login ]
   Insere email + senha
        |
        v
   Autenticacao (NextAuth v5)
   Valida credenciais no banco
        |
   +----+-----------------------------+
   |                                  |
   | Credenciais invalidas            | Credenciais validas
   v                                  v
Mensagem de erro             Carrega perfil do usuario
Permanece no login                    |
                          +-----------+-----------+
                          |           |           |
                          v           v           v
                       ADMIN     ADESTRADOR    CLIENTE
                          |           |           |
                          v           v           v
                      /admin     /dashboard  /portal/cliente
```

Observacao:
- O sistema redireciona automaticamente para a pagina certa apos login
- Acesso direto a rota de outro perfil e bloqueado e redireciona para login
- Nao ha autenticacao anonima no sistema

---

## 3. Fluxo de cadastro (entrada de novo adestrador)

```
ADESTRADOR POTENCIAL
        |
        v
   [ /cadastro ]
   Preenche nome, email, senha
        |
        v
   Conta criada no banco
        |
        v
   Redireciona para /login
        |
        v
   Login com nova conta
        |
        v
   Acessa /dashboard
   (conta inicia em periodo de avaliacao)
```

---

## 4. Fluxo operacional do adestrador (dia a dia)

### 4.1 Visao macro do ciclo semanal

```
INICIO DO DIA
     |
     v
[ /dashboard ]
Ver agenda do dia
Ver cobrancas pendentes
Ver proximos atendimentos
     |
     +---> Atendimento hoje? ----NAO----> Fim do dia
     |
    SIM
     |
     v
[ /treinos ]
Seleciona cliente e cao
Registra sessao tecnica
(blocos, notas, pontuacao)
     |
     v
[ /portal ]
Publica tarefa para o tutor
com instrucoes pos-sessao
     |
     v
[ /agenda ]
Confirma ou reagenda
proximo atendimento
     |
     v
[ /financeiro ]
Verifica se pagamento
do cliente esta em dia
     |
     v
FIM DO CICLO DA SESSAO
```

---

## 5. Modulo: Dashboard (/dashboard)

Perfil: Adestrador

Funcionalidades:
- Exibe numero de clientes ativos na carteira
- Exibe total de caes em acompanhamento
- Exibe total de sessoes registradas
- Exibe valor total de cobrancas pendentes
- Lista os proximos 4 atendimentos da agenda
- Lista os ultimos 2 registros financeiros

Logica de dados:
- Metricas calculadas em tempo real a partir da base de clientes, sessoes e pagamentos
- Agenda do dia filtra eventos com status "Confirmado"
- Financeiro rapido usa soma dos pagamentos com status "Pendente"

Fluxo de interacao:
```
Adestrador abre /dashboard
         |
         v
Sistema carrega dados do estado global
         |
    +----+----+----+----+
    |    |    |    |    |
metricas agenda financeiro passos
                          |
                          v
                 Clicar em um passo
                 leva para a rota
                 correspondente
```

---

## 6. Modulo: Clientes (/clientes)

Perfil: Adestrador

Funcionalidades:
- Listagem de todos os tutores da carteira
- Exibicao do cao associado a cada tutor
- Dados do contrato: valor, dia de vencimento, forma de pagamento
- Acesso direto ao treino de cada cao (link para /treinos)
- Formulario de cadastro rapido de novo cliente + cao

Logica do cadastro:
```
Adestrador preenche formulario
         |
         v
Sistema valida:
- Nome do dono (obrigatorio)
- Nome do cao (obrigatorio)
- Valor do contrato (obrigatorio, maior que zero)
         |
    +----+----+
    |         |
  ERRO      OK
    |         |
Nao salva  Cria cliente
           Cria perfil do cao
           Cria cobranca inicial
           Limpa formulario
```

Campos do cadastro:
- Nome do dono, telefone
- Nome do cao, raca, idade, peso
- Focos de treino (lista separada por virgula)
- Tipo de imovel (Apartamento, Casa, Casa com quintal, Condominio, Outro)
- Plano/contrato (texto livre)
- Valor cobrado (R$)
- Dia do vencimento (1 a 28)
- Forma de pagamento (Pix, Cartao, Boleto, Dinheiro)

---

## 7. Modulo: Treinos (/treinos)

Perfil: Adestrador

Funcionalidades:
- Selecao de cliente e cao para a sessao
- Visualizacao de historico de sessoes por cao
- Indicadores de evolucao por bloco tecnico
- Registro de nova sessao com notas tecnicas
- Filtro de historico por periodo (todos, 30 dias, 90 dias)

Logica de registro de sessao:
```
Adestrador seleciona cliente e cao
         |
         v
Sistema carrega historico daquele cao
         |
         v
Adestrador define:
- Titulo da sessao
- Blocos de trabalho (ex: Guia, Place, Distracao)
- Pontuacao de 1 a 10 por bloco
- Comentario tecnico por bloco
         |
         v
Sistema valida:
- Titulo preenchido
- Pelo menos 1 bloco com comentario
         |
         v
Sessao salva com:
- Numero sequencial automatico
- Data atual
- Vinculo com cliente e cao
         |
         v
Historico atualizado na tela
Medias recalculadas automaticamente
```

Logica dos indicadores:
- Media geral: soma de todas as notas / total de notas
- Melhor bloco: bloco com maior media historica
- Atenção imediata: bloco com menor media historica
- Tendencia por bloco: comparacao ultima nota vs penultima nota

---

## 8. Modulo: Agenda (/agenda)

Perfil: Adestrador

Funcionalidades:
- Visualizacao semanal de atendimentos agendados
- Status de cada evento (Confirmado, Pendente, Aguardando, Recorrente)
- Alternancia de status com um clique
- Formulario para criar novo agendamento

Logica de status:
```
Evento criado
     |
     v
Status inicial: PENDENTE
     |
     v
Adestrador clica no status
     |
     v
Alterna para CONFIRMADO
     |
     v
Clica novamente
     |
     v
Alterna para PENDENTE
(ciclo continuo)
```

Campos do agendamento:
- Nome do cliente (texto)
- Nome do cao (texto)
- Dia da semana (texto livre, ex: Terca)
- Horario (texto, ex: 19:00)

---

## 9. Modulo: Portal do Tutor (/portal)

Perfil: Adestrador

Funcionalidades:
- Exibe link externo do portal de acesso do tutor
- Painel de tarefas atribuidas ao tutor
- Controle de conclusao das tarefas (checklist)
- Formulario para criar nova tarefa

Logica de gestao de tarefas:
```
Adestrador cria tarefa:
- Titulo (obrigatorio)
- Descricao (opcional)
         |
         v
Tarefa salva como NAO CONCLUIDA
         |
         v
Tutor acessa /portal/cliente
e ve a tarefa
         |
         v
Tutor (ou adestrador) clica
no checkbox
         |
         v
Tarefa marcada como CONCLUIDA
         |
         v
Contador de concluidas atualiza
```

---

## 10. Modulo: Financeiro (/financeiro)

Perfil: Adestrador

Funcionalidades:
- Visao de clientes com contrato ativo
- Total recebido no periodo
- Total em aberto
- Detalhe da assinatura da plataforma (plano do adestrador)
- Listagem de cobrancas por cliente com status
- Botao para marcar cobranca como paga
- Botao para gerar proxima cobranca de um cliente
- Visao separada: cobarcas de clientes x cobarcas de assinatura

Logica de cobranca do cliente:
```
Cliente cadastrado em /clientes
         |
         v
Sistema gera cobranca automatica
com: valor, vencimento, metodo de pagamento
Status inicial: PENDENTE
         |
         v
Adestrador recebe pagamento
         |
         v
Clica em "Marcar como pago"
         |
         v
Status muda para PAGO
         |
         v
Adestrador clica em
"Gerar proxima cobranca"
         |
         v
Nova cobranca gerada para
o proximo ciclo
```

---

## 11. Modulo: Assistente IA (/ia)

Perfil: Adestrador

Funcionalidades:
- Selecao de cliente da carteira
- Entrada de raca do animal
- Selecao de objetivo da sessao (Guia, Reatividade, Obediencia, Filhotes)
- Selecao de contexto de treino (Rua, Condominio, Casa, Parque)
- Geracao de protocolo de sessao sugerido

Logica de geracao do protocolo:
```
Adestrador preenche:
- Cliente
- Raca
- Objetivo
- Contexto
         |
         v
Clica em "Gerar protocolo com IA"
         |
         v
Sistema verifica se existe
historico de sessoes para
aquele cliente
         |
    +----+----+
    |         |
  SEM       COM
historico  historico
    |         |
    v         v
Guardrail: Guardrail:
validar    usar o que
linha de   funcionou
base
    |         |
    +----+----+
         |
         v
Sistema monta protocolo com:
- Descricao do contexto
- 3 passos tecnicos recomendados
- Guardrail especifico
- Resumo de risco ambiental
- Mensagem para o tutor praticar em casa
```

---

## 12. Modulo: Planos e pagamento do adestrador (/planos)

Perfil: Adestrador

Funcionalidades:
- Visualizacao dos 3 planos disponiveis (Starter, Pro, Business)
- Troca de plano
- Selecao de forma de pagamento (Pix, Cartao, Boleto)
- Selecao de pacote de atendimentos (4 aulas, 8 aulas, 12 aulas)
- Ativacao/desativacao de renovacao automatica
- Cadastro de dados de pagamento (chave Pix, dados do cartao, email do boleto)
- Botao de renovacao manual
- Historico de renovacoes

Observacao:
- Esse controle de quantidade de aulas vale apenas para a visao do adestrador

Logica de pacote:
```
Pacote 4 aulas   -> Sem desconto
Pacote 8 aulas   -> Melhor equilibrio operacional
Pacote 12 aulas  -> Melhor custo por aula
```

---

## 13. Modulo: Portal do Cliente (/portal/cliente)

Perfil: Cliente (Tutor)

Funcionalidades:
- Exibicao do perfil do cao (foto, raca, idade)
- Resumo do dia (proximo encontro, tarefas pendentes, novos relatorios)
- Agenda da semana com datas e horarios das sessoes
- Checklist de tarefas deixadas pelo adestrador
- Campo de texto para feedback e comentarios do tutor
- Galeria de midia compartilhada
- Secao de relatorios de evolucao

Logica de navegacao interna:
```
Tutor abre /portal/cliente
         |
         v
Ve painel inicial (Resumo)
         |
         v
Seleciona aba na barra inferior:
+----------+--------+---------+---------+----------+
| Resumo   | Agenda | Tarefas | Galeria | Relat.  |
+----------+--------+---------+---------+----------+
         |
         v
Conteudo da aba selecionada
carrega na mesma pagina
(sem reload de pagina)
```

---

## 14. Fluxo administrativo (Admin)

### 14.1 Dashboard Admin (/admin)

Perfil: Admin

Metricas exibidas:
- Total de adestradores ativos e em trial
- Total de caes em gestao na plataforma
- MRR (receita mensal recorrente)
- Crescimento percentual de novos adestradores
- Simulacao de trial ativo

Logica da simulacao de trial:
```
Admin acessa /admin
         |
         v
Sistema exibe:
- Dia atual do trial (ex: Dia 14)
- Total de dias configurados
- Status: em andamento / concluido
```

### 14.2 Gestao de Adestradores (/admin/adestradores)

Funcionalidades:
- Lista completa de adestradores cadastrados
- Status: Ativo ou Trial
- Plano contratado: Essencial, Pro, Premium
- Data de entrada
- Valor mensal gerado

### 14.3 Configuracao de Planos (/admin/planos)

Funcionalidades:
- Visualizacao dos 3 planos (Essencial, Pro, Premium)
- Edicao de preco e beneficios sem sair da tela (editor ao lado)
- Salvar alteracoes imediatamente

Logica de edicao:
```
Admin clica em Editar no plano
         |
         v
Editor carrega preco e beneficios atuais
         |
         v
Admin altera campos
         |
         v
Clica em Salvar plano
         |
         v
Lista de planos atualizada
```

### 14.4 Faturamento (/admin/faturamento)

Metricas exibidas:
- MRR total da plataforma
- Total confirmado no periodo
- Total pendente
- ARR estimado (MRR x 12)

Funcionalidades:
- Listagem de transacoes recentes de assinaturas
- Status: Pago / Pendente

### 14.5 Relatorios (/admin/relatorios)

Indicadores exibidos:
- Crescimento de adestradores por mes
- Taxa de retencao por plano (Essencial, Pro, Premium)
- Media de caes por adestrador
- Sessoes realizadas no mes
- Tabela de performance individual por adestrador

---

## 15. Logica de permissoes por rota

```
ROTA                    ADMIN   ADESTRADOR   CLIENTE
/login                    X         X           X
/cadastro                 X         X           X
/dashboard               ---        X          ---
/clientes                ---        X          ---
/treinos                 ---        X          ---
/agenda                  ---        X          ---
/portal                  ---        X          ---
/financeiro              ---        X          ---
/ia                      ---        X          ---
/planos                  ---        X          ---
/portal/cliente          ---       ---          X
/admin                    X        ---         ---
/admin/adestradores       X        ---         ---
/admin/planos             X        ---         ---
/admin/faturamento        X        ---         ---
/admin/relatorios         X        ---         ---

X   = acesso permitido
--- = acesso negado (redireciona para login)
```

---

## 16. Logica de estado global (store)

O sistema usa um estado global persistido localmente (Zustand com persist).
Todos os modulos consomem e atualizam este estado de forma reativa.

Entidades principais:
```
+-------------+
|   CLIENTE   |
| id          |
| nome        |
| telefone    |
| plano       |
| valor       |
| vencimento  |
| pagamento   |
+------+------+
       |
       | 1 para N
       v
  +----------+
  |   CAO    |
  | id       |
  | nome     |
  | raca     |
  | idade    |
  | peso     |
  | treinos  |
  +-----+----+
        |
        | referenciado em
        |
+-------+--------+   +----------+
| SESSAO TREINO  |   |  EVENTO  |
| id             |   | AGENDA   |
| numero         |   | id       |
| data           |   | dia      |
| titulo         |   | hora     |
| notas tecnicas |   | cliente  |
+----------------+   | cao      |
                     | status   |
                     +----------+

+----------+   +----------+   +----------+
| TAREFA   |   | PAGAMENTO|   | ASSINATURA|
| PORTAL   |   | id       |   | ADESTRADOR|
| id       |   | cliente  |   | plano    |
| titulo   |   | valor    |   | metodo   |
| desc.    |   | status   |   | pacote   |
| concluido|   | metodo   |   | valor    |
+----------+   | vencim.  |   | proxima  |
               +----------+   +----------+
```

Adicao no portal do cliente:
```
+------------------+
| FEEDBACK TUTOR   |
| id               |
| autor            |
| mensagem         |
| dataHora         |
+------------------+
```

---

## 17. Sumario dos fluxos criticos

| Fluxo                       | Pagina inicial | Pagina final       | Perfil       |
|-----------------------------|----------------|--------------------|--------------|
| Novo adestrador              | /cadastro      | /dashboard         | Adestrador   |
| Login do adestrador          | /login         | /dashboard         | Adestrador   |
| Login do cliente             | /login         | /portal/cliente    | Cliente      |
| Login do admin               | /login         | /admin             | Admin        |
| Cadastro de novo cliente     | /clientes      | /clientes          | Adestrador   |
| Registro de sessao tecnica   | /treinos       | /treinos           | Adestrador   |
| Agendamento de atendimento   | /agenda        | /agenda            | Adestrador   |
| Publicar tarefa para tutor   | /portal        | /portal            | Adestrador   |
| Tutor ver sua tarefa         | /portal/cliente| /portal/cliente    | Cliente      |
| Marcar pagamento como pago   | /financeiro    | /financeiro        | Adestrador   |
| Gerar protocolo com IA       | /ia            | /ia                | Adestrador   |
| Ajustar plano e pacote de aulas | /planos     | /planos            | Adestrador   |
| Admin ver receita da base    | /admin/faturamento | /admin/faturamento | Admin    |
