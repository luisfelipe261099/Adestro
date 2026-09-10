# Arquitetura do Sistema Adestro

## Overview

Adestro é uma plataforma SaaS desenvolvida em Next.js para gerenciar adestradores, clientes, treinos e progresso. Este documento descreve a arquitetura, fluxos de dados e componentes principais.

---

## Stack Técnico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19 + Next.js 16 (App Router) |
| **Styling** | Tailwind CSS 4 + design system próprio (sem biblioteca de componentes) |
| **Estado** | Zustand · validação com Zod |
| **Backend** | Next.js API Routes |
| **Database** | MySQL (TiDB Cloud em produção) + Prisma ORM 5.22 |
| **Auth** | NextAuth v5 — JWT, provider Credentials + bcrypt |
| **IA** | Google Gemini (assistente de treino) |
| **Notificações** | Web Push próprio (VAPID) |
| **Deploy** | Vercel |

---

## Estrutura de Diretórios

```
adestro/
├── app/
│   ├── layout.tsx           # Layout global
│   ├── page.tsx             # Home
│   ├── api/                 # API Routes
│   │   ├── auth/            # Autenticação (NextAuth)
│   │   ├── ia/              # Análise de IA
│   │   ├── clients/         # CRUD de clientes
│   │   ├── trainer/         # Dados do adestrador
│   │   └── ...
│   ├── dashboard/           # Dashboard principal
│   ├── clientes/            # Gestão de clientes
│   ├── treinos/             # Registro de treinos
│   ├── agenda/              # Agenda
│   └── portal/              # Portal do tutor
├── components/              # Componentes React
├── lib/                     # Utilitários e hooks
├── prisma/                  # Esquema do banco
├── public/                  # Assets estáticos
└── docs/                    # Documentação

```

---

## Fluxo de Dados

### 1. Autenticação

```
User Login → NextAuth → JWT Token → Session Store → Authenticated Routes
```

**Endpoints:**
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Sessão atual

### 2. Registro de Treino

```
Trainer Input → API /api/trainer/plan → IA Analysis → Database → Portal Tutor
```

**Fluxo:**
1. Adestrador preenche formulário
2. Dados enviados para `/api/trainer/plan`
3. IA analisa automaticamente
4. Resultado salvo no banco
5. Resumo disponível no portal do tutor

### 3. Gamificação

```
User Action → applyAction() → Calculate Points → Update Database → Frontend
```

**Ações:**
- `task_completed`: +20 pontos
- `video_watched`: +15 pontos
- `feedback_sent`: +10 pontos

---

## Módulos Principais

### 1. Autenticação (`lib/auth.ts`)

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      // Validação de e-mail/senha
    }),
  ],
  // ... config
};
```

### 2. Gamificação (`lib/gamification-shared.ts`)

```typescript
export type GamificationAction = 
  | "task_completed"
  | "video_watched"
  | "feedback_sent"
  | "training_completed"
  | "multiple_techniques";

export function applyAction(
  current: RawGamification, 
  input: ApplyActionInput
): ApplyActionResult
```

### 3. Análise de IA (`app/api/ia/analyze-session/route.ts`)

```typescript
interface SessionData {
  session_id: string;
  trainer_notes: string;
  dog_id: string;
  duration_minutes?: number;
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const analysis = analyzeSessionWithAI(data);
  return NextResponse.json({ analysis });
}
```

### 4. Portal do Tutor

Componentes:
- `FeedbackCard`: Exibe avaliações dimensionais
- `ProgressChart`: Gráfico de progresso mensal
- `MonthlyReport`: Relatório em PDF
- `OnboardingChecklist`: Guia de boas-vindas

---

## APIs Principais

### Clientes

```
GET    /api/clients             # Listar clientes
POST   /api/clients             # Criar cliente
GET    /api/clients/:id         # Detalhes do cliente
PUT    /api/clients/:id         # Atualizar cliente
DELETE /api/clients/:id         # Deletar cliente
```

### Treinos

```
GET    /api/trainer/plan        # Listar treinos
POST   /api/trainer/plan        # Registrar treino
GET    /api/trainer/plan/:id    # Detalhes do treino
```

### Análise de IA

```
POST   /api/ia/analyze-session  # Analisar sessão
GET    /api/ia/analyze-session  # Recuperar análise
```

### Gamificação

```
GET    /api/portal-public/:token/gamification     # Obter pontos
POST   /api/portal-public/:token/gamification     # Aplicar ação
```

---

## Modelo de Dados (Prisma)

> Os trechos desta seção são ilustrativos e **não correspondem ao schema atual** —
> alguns models mostrados aqui (`Profile`, `Training`, `Gamification`) não existem,
> e `String[]` não é válido em MySQL. O schema real, com 26 models, está em
> `prisma/schema.prisma`; consulte-o antes de mexer no banco.

### User

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     // admin, trainer, tutor
  profile   Profile?
  sessions  Session[]
  createdAt DateTime @default(now())
}
```

### Dog

```prisma
model Dog {
  id            String   @id @default(cuid())
  name          String
  breed         String
  age           Int
  tutorId       String
  tutor         User     @relation(fields: [tutorId], references: [id])
  trainings     Training[]
  gamification  Gamification?
  createdAt     DateTime @default(now())
}
```

### Training

```prisma
model Training {
  id             String   @id @default(cuid())
  dogId          String
  dog            Dog      @relation(fields: [dogId], references: [id])
  trainerId      String
  trainer        User     @relation(fields: [trainerId], references: [id])
  notes          String
  duration       Int      // minutos
  techniques     String[]
  aiAnalysis     AIAnalysis?
  createdAt      DateTime @default(now())
}
```

---

## Integrações

### Assistente de IA (Google Gemini)

**Arquivo**: `app/api/ia/session-chat/route.ts` — implementado.

A rota chama a API REST do Gemini direto, sem SDK. O modelo vem de `GEMINI_MODEL`
(padrão `gemini-2.0-flash`) e a chave de `GEMINI_API_KEY`.

```typescript
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const url =
  `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
  `:generateContent?key=${apiKey}`;
```

Sem `GEMINI_API_KEY` a rota não quebra: cai num motor heurístico por palavra-chave,
e a tela `/ia` continua funcionando com respostas mais simples.

### Email (Sendgrid)

**Arquivo**: `lib/email.ts` (a implementar)

```typescript
async function sendReportEmail(tutorEmail: string, report: MonthlyReport) {
  await sgMail.send({
    to: tutorEmail,
    subject: "Relatório Mensal do Seu Cão",
    html: renderReport(report),
  });
}
```

---

## Segurança

### Autenticação & Autorização

- ✅ NextAuth.js com sessões JWT
- ✅ Role-based access control (RBAC)
- ✅ API route protection com middleware

### Validação

- ✅ Zod para validação de inputs
- ✅ CORS configurado
- ✅ Rate limiting em endpoints públicos

### Dados Sensíveis

- ✅ Senhas com bcrypt
- ✅ Tokens armazenados em HttpOnly cookies
- ✅ Sanitização de inputs

---

## Performance

### Otimizações

- ✅ Next.js Image Optimization
- ✅ Code splitting automático
- ✅ SWR/React Query para caching
- ✅ Database indexes nos IDs

### Monitoramento

- Vercel Analytics para frontend
- Log de erros com Sentry (a configurar)

---

## Deploy

### Vercel

Deploy automático ao push na branch de produção. O script `build` é
`prisma generate && prisma db push && next build`: **todo deploy aplica o schema no
banco apontado por `DATABASE_URL`**, o que dispensa passo de migração manual mas
significa que um deploy com a URL errada altera o banco errado.

### Variáveis de Ambiente

```env
DATABASE_URL=            # obrigatória — conexão MySQL
AUTH_SECRET=             # obrigatória — assina os JWT de sessão
NEXTAUTH_URL=            # obrigatória — URL pública da aplicação
CRON_SECRET=             # sem ela, /api/cron/daily-brief fica fechada
VAPID_PUBLIC_KEY=        # opcional — notificações push
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
GEMINI_API_KEY=          # opcional — IA real no assistente
GEMINI_MODEL=
```

A lista completa, comentada, está em `.env.example`.

---

## Próximas Melhorias

1. ✅ Integração com OpenAI (em desenvolvimento)
2. ✅ Envio de relatórios por e-mail
3. ⏳ Integração com WhatsApp Business
4. ⏳ Mobile app (React Native)
5. ⏳ Video streaming (HLS)

---

## Contribuindo

Para contribuir, siga:

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/sua-feature`)
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Versão**: 1.0  
**Última atualização**: Maio de 2026
