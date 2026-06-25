# Manual do Adestrador - Adestro

Este manual foi escrito para o adestrador que vai usar o sistema no dia a dia.
O foco aqui e mostrar o fluxo pratico de uso da plataforma, o que cada modulo faz hoje e como operar a demo sem se perder.

## 1. Objetivo do sistema

O Adestro organiza a operacao do adestrador em um fluxo unico:

1. cadastrar clientes e caes
2. registrar treinos e evolucao tecnica
3. montar agenda de aulas
4. acompanhar tarefas do portal do tutor
5. controlar cobrancas e assinatura

Nesta fase do projeto, a plataforma e uma versao funcional para validacao comercial.
Alguns pontos ainda sao de prototipo guiado, entao o ideal e usar o sistema com foco em demonstracao, organizacao e teste de fluxo.

## 2. Perfis de acesso

O sistema trabalha com tres perfis:

- adestrador: operacao principal do produto
- cliente: visualiza o portal do tutor
- admin: visao de administracao da plataforma

Este manual cobre o uso do perfil de adestrador.

## 3. Fluxo recomendado de uso

Para usar o sistema sem confusao, siga esta ordem:

1. entrar no Dashboard para entender o panorama
2. cadastrar cliente e cao em Clientes
3. registrar uma sessao em Treinos
4. criar ou ajustar agendamentos em Agenda
5. publicar tarefas no Portal
6. acompanhar cobrancas em Financeiro
7. revisar pacote e assinatura em Planos

Se for apresentar a plataforma para um possivel cliente, esse e o fluxo mais claro.

## 4. Dashboard

Rota: `/dashboard`

O Dashboard funciona como ponto de partida.
Ele mostra o estado geral da operacao e os proximos passos para continuar o uso.

### O que fazer aqui

- verificar se ja existem clientes cadastrados
- usar os atalhos para ir direto para Agenda, Treinos ou Portal
- entender rapidamente o que falta configurar

### Quando usar

- ao iniciar o dia
- antes de apresentar a plataforma
- quando quiser retomar o fluxo sem lembrar a ordem das telas

## 5. Clientes

Rota: `/clientes`

A tela de Clientes e a base da operacao.
Tudo comeca aqui.
Sem cliente e sem cao cadastrados, Agenda e Treinos ficam limitados.

### O que voce consegue fazer

- cadastrar tutor e cao no mesmo formulario
- informar telefone, tipo de imovel, plano e valor contratado
- definir forma de pagamento
- abrir o treino do cao direto a partir da carteira

### Como cadastrar corretamente

Preencha pelo menos:

- nome do dono
- nome do cao
- valor do contrato

Campos recomendados para deixar a demo mais forte:

- telefone
- raca
- idade
- peso
- focos de treino
- plano/contrato
- forma de pagamento

### Boas praticas

- use um nome de plano facil de entender, como "Plano Basico 8 aulas"
- descreva os focos de treino separados por virgula
- cadastre pelo menos 2 clientes para demonstrar melhor agenda e financeiro

### Resultado esperado

Depois do cadastro:

- o cliente aparece na carteira
- o cao fica disponivel para Treinos
- o cliente fica disponivel para Agenda
- o contrato entra na logica do Financeiro

## 6. Treinos

Rota: `/treinos`

Treinos e o modulo de memoria tecnica.
Ele serve para registrar o que aconteceu em cada sessao, sem depender de anotacoes soltas fora do sistema.

### O que voce consegue fazer

- escolher cliente e cao
- registrar uma sessao com titulo e data
- criar blocos tecnicos da aula
- atribuir nota por bloco
- escrever comentario tecnico
- consultar historico do caso

### Como usar bem

Cada sessao deve ter blocos objetivos, por exemplo:

- Guia
- Place
- Reatividade
- Foco
- Manejo

Para cada bloco, escreva:

- o que foi trabalhado
- como o cao respondeu
- qual ajuste entra na proxima aula

### Resultado esperado

Depois de salvar:

- a sessao entra no historico do cao
- o sistema passa a ter memoria do caso
- o Portal pode ficar mais coerente com as tarefas do tutor

## 7. Agenda

Rota: `/agenda`

A Agenda organiza os encontros da semana.
Ela foi ajustada para trabalhar com clientes e caes reais do cadastro, evitando registros soltos.

### O que voce consegue fazer

- escolher cliente
- escolher o cao daquele cliente
- definir dia da semana
- definir horario
- definir status inicial
- alterar status de um evento ja criado

### Status disponiveis

- Confirmado
- Pendente
- Cancelado

### Uso recomendado

- use Pendente quando a aula ainda nao foi validada com o tutor
- use Confirmado quando a aula estiver alinhada
- use Cancelado quando o encontro nao vai acontecer

### Observacao importante

A Agenda depende de clientes cadastrados.
Se nao houver cliente, o sistema nao consegue montar agendamento consistente.

## 8. Portal do tutor

Rota: `/portal`

Essa tela e o painel do adestrador para organizar a entrega ao tutor.
Ela nao e o portal final do cliente em si, e o modulo onde o adestrador monta o que o tutor vai acompanhar.

### O que voce consegue fazer

- selecionar cliente e cao
- copiar o link do portal
- acompanhar tarefas concluidas
- publicar tarefas para casa
- usar templates rapidos de tarefa
- visualizar agenda, feed e galeria relacionados ao caso

### Exemplos de tarefas boas

- Place 2x ao dia por 8 minutos
- Passeio com guia frouxa em 3 blocos
- Treino de foco antes das refeicoes

### Boas praticas

- crie tarefas curtas e objetivas
- evite instrucoes longas demais
- publique tarefas que tenham relacao com a ultima sessao registrada

## 9. Portal do cliente

Rota: `/portal/cliente`

Esta e a experiencia do tutor/cliente.
Como adestrador, voce pode usar essa tela em demonstracoes para mostrar como o cliente enxerga o acompanhamento.

### O que o tutor enxerga

- resumo do caso
- agenda da semana
- tarefas
- galeria
- relatorios
- comentarios e feedbacks

### Quando mostrar

- em reunioes comerciais
- para demonstrar valor percebido
- para explicar a continuidade entre aula presencial e rotina em casa

## 10. Financeiro

Rota: `/financeiro`

Financeiro mostra contratos, cobrancas e recebimentos ligados aos clientes e a assinatura da plataforma.

### O que voce consegue fazer

- ver total recebido
- ver total em aberto
- gerar faturamento por cliente
- marcar cobranca como paga
- reabrir pendencia
- acompanhar cobrancas da propria assinatura

### Como pensar esse modulo

- clientes com contrato ativo entram na carteira financeira
- cada cobranca pode ser gerada e acompanhada
- o sistema separa cobrancas de clientes e cobrancas da assinatura Adestro

### Uso recomendado

- gere cobranca somente quando fizer sentido no ciclo comercial
- use o status Pago para simular recebimento confirmado
- use a visao de em aberto para mostrar previsao de caixa

## 11. Planos

Rota: `/planos`

Essa tela concentra o plano do adestrador dentro da plataforma.
Nao e o plano do cliente final. E o plano do proprio profissional que usa o sistema.

### O que voce consegue fazer

- comparar planos disponiveis
- escolher plano atual
- ajustar forma de pagamento
- ajustar quantidade de aulas do pacote
- ativar ou desativar renovacao automatica
- preencher dados de pagamento
- gerar renovacao manual
- consultar historico de renovacoes

### Observacao importante

Nesta fase do prototipo, alguns dados de perfil de pagamento funcionam como configuracao local de demonstracao.
Eles ajudam na apresentacao do fluxo, mas nao representam uma integracao financeira completa.

## 12. IA

Rota: `/ia`

A tela de IA esta reservada para uma funcionalidade futura.
Hoje ela aparece como "Em breve".

### Como apresentar isso na demo

Explique que o modulo sera usado para:

- apoiar montagem de protocolo
- acelerar preparacao de sessao
- sugerir organizacao do caso a partir do historico

## 13. Problemas comuns e como evitar

### "Nao consigo agendar"

Verifique se:

- existe pelo menos 1 cliente cadastrado
- o cliente selecionado possui pelo menos 1 cao
- o formulario foi preenchido com dia e horario validos

### "O treino nao faz sentido com o caso"

Verifique se:

- o cliente correto foi selecionado
- o cao correto foi selecionado
- os blocos da sessao foram preenchidos com comentarios claros

### "O portal ficou vazio"

Verifique se:

- tarefas foram criadas na rota `/portal`
- existe historico de sessao
- existe cliente e cao selecionados

### "O financeiro nao mostra movimento"

Verifique se:

- o cliente foi cadastrado com valor de contrato
- a cobranca foi gerada manualmente
- a cobranca nao esta filtrada apenas como assinatura

## 14. Melhor forma de apresentar a plataforma

Se voce vai demonstrar o sistema para um cliente, siga esta narrativa:

1. mostrar o Dashboard como visao geral
2. cadastrar um cliente realista em Clientes
3. registrar uma sessao curta em Treinos
4. criar um agendamento em Agenda
5. publicar uma tarefa em Portal
6. abrir o Portal do cliente para mostrar a entrega
7. fechar em Financeiro para mostrar previsao e controle

Esse caminho deixa clara a proposta comercial do produto.

## 15. Limites atuais da versao

Nesta fase, o sistema prioriza validacao comercial e fluxo funcional.
Ainda nao e o momento de tratar como ERP completo.

Pontos importantes:

- algumas configuracoes sao focadas em demo
- o modulo de IA ainda nao esta ativo
- o sistema ainda esta evoluindo em refinamento de UX
- certas automacoes ainda dependem de proximas iteracoes

## 16. Resumo rapido de uso diario

Use este checklist no dia a dia:

1. abrir Dashboard
2. revisar Agenda
3. registrar Treinos das aulas realizadas
4. atualizar Portal com tarefas do tutor
5. conferir Financeiro
6. revisar Planos somente quando precisar ajustar assinatura

## 17. Roteiro curto para onboarding do adestrador

No primeiro uso:

1. faca login
2. entre em Clientes
3. cadastre o primeiro tutor e cao
4. va para Treinos e registre uma sessao
5. va para Agenda e crie um compromisso
6. va para Portal e publique uma tarefa
7. abra Financeiro para entender a cobranca

A partir desse ponto, o sistema ja passa a fazer sentido como operacao conectada.
