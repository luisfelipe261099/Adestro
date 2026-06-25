# Adestro

Plataforma SaaS para adestradores, feita em Next.js, com foco em operacao diaria, treino, agenda, portal do cliente e financeiro.

## Documentacao de uso

- Manual do adestrador: `MANUAL_ADESTRADOR.md`

## Status atual

- Frontend responsivo com experiencia de demo para validacao comercial.
- Backend funcional com autenticacao real via NextAuth v5 (Credentials).
- Persistencia real com Prisma + TiDB Cloud (MySQL compativel).
- APIs implementadas: auth, perfil, clientes, sessoes, eventos e pagamentos.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- NextAuth v5
- Prisma ORM
- TiDB Cloud (MySQL)
- Deploy: Vercel

## Rotas principais

- / (landing)
- /dashboard
- /clientes
- /treinos
- /agenda
- /portal
- /financeiro
- /admin/*

## Setup local completo

1. Instalar dependencias:

```powershell
pnpm install
```

2. Criar arquivo de ambiente:

```powershell
Copy-Item .env.example .env.local
Copy-Item .env.local .env
```

3. Preencher `.env.local` com valores reais:

- DATABASE_URL (TiDB Cloud)
- AUTH_SECRET
- NEXTAUTH_URL=http://localhost:3000
- SEED_SECRET

Observacao: o Prisma CLI usa `.env` para carregar variaveis em comandos como `prisma generate` e `prisma db push`.

4. Gerar client do Prisma e aplicar schema no banco:

```powershell
pnpm prisma generate
pnpm prisma db push
```

5. Subir a aplicacao:

```powershell
pnpm dev
```

6. Seed inicial (uma vez) para criar contas demo no banco:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/seed" -Method POST -Headers @{"x-seed-secret"="SEU_SEED_SECRET"}
```

## Contas demo (seed)

- Adestrador: adestrador@adestro.com.br / 123456
- Cliente: cliente@adestro.com.br / 123456
- Admin: admin@adestro.com.br / 123456

## Deploy na Vercel

1. Conectar repositorio na Vercel.
2. Configurar variaveis de ambiente de producao:

- DATABASE_URL
- AUTH_SECRET
- NEXTAUTH_URL=https://seu-dominio.vercel.app
- SEED_SECRET

3. Fazer deploy.
4. Chamar POST `/api/seed` uma unica vez em producao com `x-seed-secret`.

## Checklist rapido de validacao

1. Login com cada perfil funciona.
2. API de sessao responde em /api/me com usuario autenticado.
3. Criacao e listagem em /api/clients funcionam.
4. Treinos/eventos/pagamentos persistem no banco.
5. Build de producao passa: `pnpm run build`.
