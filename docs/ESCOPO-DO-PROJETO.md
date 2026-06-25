# Adestro — Documento de Escopo do Projeto

**Versão:** 1.0 · **Data:** 25/06/2026
**Produto:** Adestro — plataforma de gestão para adestradores profissionais de cães
**Tipo:** SaaS B2B (web responsivo / PWA), multi-adestrador

---

## 1. Visão geral

O **Adestro** é uma plataforma completa de gestão para adestradores profissionais: centraliza, em um só lugar, toda a operação do negócio — clientes e cães, agenda, registro de treinos, evolução comportamental, financeiro (com Pix), portal do cliente, inteligência artificial de apoio e comunicação automatizada (WhatsApp e notificações).

Não é um aplicativo de cadastro simples: é um **sistema operacional do negócio de adestramento**, com controle de acesso por perfil, funcionamento offline e arquitetura preparada para múltiplos adestradores (modelo SaaS).

### Proposta de valor
- **Para o adestrador:** menos tempo em planilhas e WhatsApp solto; mais tempo com os cães. Tudo organizado, profissional e rastreável.
- **Para o cliente final (dono do cão):** acompanha a evolução do seu cão por um portal próprio, recebe tarefas de casa, confirma presença e dá feedback.
- **Para o negócio (SaaS):** plataforma multi-adestrador, com planos, faturamento e painel administrativo.

---

## 2. Perfis de acesso

O sistema tem **3 perfis** com permissões distintas (controle de acesso por papel):

| Perfil | Quem é | O que acessa |
|--------|--------|--------------|
| **Adestrador** (trainer) | O profissional dono da conta | Toda a operação: agenda, clientes, treinos, financeiro, relatórios, IA |
| **Administrador** (admin) | Operação da plataforma (SaaS) | Painel administrativo: adestradores, planos, faturamento, auditoria, modelos |
| **Cliente** (dono do cão) | O tutor do cão | Portal próprio (acesso por link/token): evolução, tarefas, feedback |

---

## 3. Módulos funcionais

### 3.1 Autenticação e Onboarding
- Cadastro e login com e-mail/senha (senha com hash seguro).
- Sessão por token (JWT), com redirecionamento por perfil.
- Tela de boas-vindas e fluxo de primeiro acesso.
- Exportação dos próprios dados (portabilidade / LGPD).

### 3.2 Dashboard — "Foco do Dia"
- Card dominante de **próxima sessão** (cão, cliente, horário, ações rápidas).
- Cartões de resumo: agenda do dia/semana, financeiro, pendências, checklist.
- **Quadro do dia** (kanban: A fazer / Em andamento / Concluído).
- **Resumo diário automático** (geração programada — cron).
- "Cães em atenção" (alertas operacionais).

### 3.3 CRM — Clientes e Cães
- Cadastro de clientes em etapas (dados, endereço com **CEP automático**, cão, plano).
- **Edição completa** da ficha do cliente e do cão.
- **Múltiplos cães por cliente** (adicionar 2º cão ou mais).
- **Ficha do cão dedicada** (`/caes/[id]`): dados cadastrais editáveis + **histórico completo de treinos** (nota em estrelas, data, resumo).
- Busca, seletor Cliente/Cão em destaque, filtros por status, **tags**.
- Importação de clientes por **CSV**.
- Aprovação de fichas de onboarding (rascunho → ativo).

### 3.4 Agenda
- Visões por **dia / semana / mês**.
- Agendamento individual e **aulas coletivas (turmas)** com participantes.
- **Seletor de data livre** (agendar para qualquer data) e horário.
- **Aviso de conflito** de horário.
- **Recorrência** (semanal por 4/8/12 semanas).
- Status do evento (agendada, concluída, cancelada, aguardando, recorrente).
- **Remarcar** o próprio agendamento (data/hora).
- Atalhos: registrar treino, confirmar presença (WhatsApp), mapa, abrir no Google Calendar.

### 3.5 Registro de Treinos
- **Página dedicada por sessão**, editável.
- Atividades e comandos trabalhados (com **modelos salvos e reutilizáveis**).
- **Avaliação por estrelas** (nota da sessão).
- **Resumo público** (vai para o cliente) × **notas privadas** (confidenciais).
- **Transcrição por voz** (gravação de notas por áudio).
- **Galeria de mídias** (fotos com compressão automática).
- Plano do próximo treino e **dever de casa** para o cliente.
- **Evolução comportamental** (7 categorias avaliadas).
- Treino salvo fica **Registrado** automaticamente; pós-salvamento retorna à lista do cão.

### 3.6 Evolução e Planos de Treino
- Tela de **Evolução comportamental** (obediência, reatividade, socialização, ansiedade, passeio, recall, controle de impulsos).
- Tela de **Planos de treino** (fase do treino e progresso "Sessão X/Y").

### 3.7 Relatórios
- Geração de **relatórios de evolução** pós-sessão.
- Comparação entre períodos.
- Relatórios para o cliente (disponíveis no portal).

### 3.8 Financeiro
- **Pacotes de serviço** e **contratos** por cliente.
- **Faturas** e **pagamentos** (incluindo **Pix**).
- Visão geral financeira (recebido, pendente, atrasado).
- Cobrança e recibo via WhatsApp (mensagens prontas).

### 3.9 Portal do Cliente
- Acesso por **link/token** (sem necessidade de senha).
- **Onboarding** do cliente (preenchimento da própria ficha).
- Acompanhamento da **evolução do cão** e relatórios.
- **Tarefas de casa** com frequência (todos os dias / dias da semana / uma vez).
- **Feedback / chat** com o adestrador.
- **Gamificação** e pesquisa de satisfação (**NPS**).

### 3.10 Inteligência Artificial
- **Análise/resumo automático de sessão** (gera o resumo público a partir das notas).
- **Chat com IA com contexto** — sabe de qual cão se trata e mantém o histórico da conversa.

### 3.11 Comunicação
- **WhatsApp**: mensagens prontas para agendamento, lembrete, confirmação, cobrança e recibo (preenchidas com os dados do cliente).
- **Notificações push** (PWA), com assinatura por dispositivo.

### 3.12 Painel Administrativo (SaaS)
- Gestão de **adestradores** (contas da plataforma).
- **Planos** e **faturamento** da plataforma; **renovações** de assinatura.
- **Auditoria** (log de ações).
- **Modelos/templates** (atividades, comandos, tarefas, mensagens de WhatsApp).
- Visão geral administrativa (overview).

### 3.13 Configurações e Tutoriais
- Configurações do negócio e perfil de pagamento.
- **Tutoriais guiados** (tours interativos) no painel do adestrador e no portal do cliente.

---

## 4. Integrações

| Integração | Uso |
|-----------|-----|
| **Inteligência Artificial (LLM)** | Resumo de sessão e chat com contexto |
| **WhatsApp** (links wa.me) | Mensagens prontas de agenda, cobrança, confirmação |
| **Google Calendar** (link) | Abrir o agendamento no calendário *(sincronização automática: roadmap)* |
| **Google Maps** (link) | Endereço do atendimento |
| **Notificações Push** (Web Push) | Avisos no dispositivo |
| **Pix** | Cobrança e recebimento |

---

## 5. Arquitetura técnica

| Camada | Tecnologia |
|--------|-----------|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Linguagem** | TypeScript |
| **Estilização** | Tailwind CSS v4 + design system próprio (fonte Geist, paleta grafite/branco) |
| **Autenticação** | NextAuth (JWT, controle por perfil) |
| **Banco de dados** | Prisma ORM + MySQL serverless (TiDB Cloud) |
| **Estado (frontend)** | Zustand |
| **Validação** | Zod |
| **PWA / Offline** | Manifest + Service Worker (funciona sem conexão) |
| **Hospedagem** | Vercel |
| **Analytics** | Vercel Analytics |

### Características não-funcionais
- **Segurança:** senhas com hash, isolamento de dados por adestrador (cada conta só acessa o que é seu), validação no servidor, auditoria de ações.
- **Responsivo:** pensado para web e celular (mobile-first em vários fluxos).
- **Offline-first (PWA):** instalável e funcional sem internet em telas-chave.
- **LGPD:** exportação de dados do usuário.

---

## 6. Modelo de dados (26 entidades)

| Domínio | Entidades |
|---------|-----------|
| **Usuários e acesso** | User, Account, Session, VerificationToken, Trainer |
| **CRM** | Client, ClientProfile, Dog, Address |
| **Agenda** | CalendarEvent, EventParticipant |
| **Treinos** | TrainingSession, DogTrainingSession, EvolutionReport |
| **Financeiro** | ServicePackage, ClientContract, ClientInvoice, Payment, SubscriptionRenewal |
| **Portal do cliente** | PortalAccessLink, PortalTask, PortalFeedback, ClientGamification, NpsResponse |
| **Infraestrutura** | PushSubscription, AuditLog |

---

## 7. Dimensão do projeto (números reais)

| Métrica | Valor |
|---------|-------|
| Linhas de código (TypeScript) | **+30.000** |
| Arquivos de código | **149** |
| Telas (rotas) | **31** |
| Endpoints de API | **40** |
| Componentes reutilizáveis | **43** |
| Entidades no banco de dados | **26** |
| Versões publicadas (commits) | **132** |
| Período de desenvolvimento | desde **mar/2026** (~3 meses contínuos) |

---

## 8. Roadmap / próximas etapas

- **Sincronização nativa com o Google Calendar** (criar/atualizar evento automaticamente ao salvar o treino).
- **Edição completa do cliente/cão diretamente pela aula** agendada (hoje a aula já edita data/hora).
- **Indicador de tarefa "não visualizada"** pelo cliente no portal.
- **Gráfico de tendência** da evolução comportamental ao longo do tempo.
- **Timeline** da agenda por período do dia (manhã/tarde/noite).

---

## 9. Considerações finais

O Adestro já é um **produto completo e em produção**, cobrindo o ciclo inteiro do negócio de adestramento — da captação e cadastro do cliente, passando pela agenda e pelo registro técnico dos treinos, até o financeiro e o relacionamento com o cliente via portal. A base técnica (Next.js + Prisma + PWA + IA) está preparada para escalar como SaaS multi-adestrador.

Os itens de roadmap são **evoluções planejadas**, não bloqueios: o núcleo operacional está implementado, testado e publicado.
