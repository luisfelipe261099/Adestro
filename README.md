# Adestro

Plataforma SaaS de gestão para adestradores profissionais de cães: agenda, ficha do
cão, registro técnico do treino, evolução comportamental, financeiro com pacotes e
portal para o dono do cão.

Aplicação web responsiva instalável como PWA, multi-adestrador, com painel
administrativo separado.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 4 |
| Estado | Zustand · validação com Zod |
| Autenticação | NextAuth v5 (JWT, provider Credentials + bcrypt) |
| ORM / Banco | Prisma 5.22 → MySQL (compatível com TiDB Cloud) |
| Notificações | Web Push próprio (VAPID) |
| IA (opcional) | Google Gemini — sem chave, o chat cai num motor heurístico |
| Deploy | Vercel |

O gerenciador de pacotes é **pnpm 9** (declarado em `packageManager`). Não use npm
nem yarn: geraria uma árvore de dependências diferente da que foi testada.

## Rodando localmente

Requer Node.js 20+ e um MySQL acessível (local ou TiDB Cloud).

```bash
pnpm install
cp .env.example .env
# preencha o .env — no mínimo DATABASE_URL, AUTH_SECRET e NEXTAUTH_URL
pnpm prisma generate
pnpm prisma db push        # cria/atualiza o schema no banco do DATABASE_URL
pnpm dev                   # http://localhost:3000
```

O Prisma CLI lê o arquivo `.env` (não o `.env.local`) em `prisma generate` e
`prisma db push`. Se você usar `.env.local` para a aplicação, mantenha o `.env`
com pelo menos o `DATABASE_URL`.

### Variáveis de ambiente

Todas estão documentadas com exemplo em [`.env.example`](.env.example).

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | String de conexão MySQL |
| `AUTH_SECRET` | sim | Assina os JWT de sessão. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | sim | URL pública da aplicação |
| `CRON_SECRET` | cron | Autoriza `/api/cron/daily-brief`. **Sem ela a rota fica fechada** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | não | Liga as notificações push |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | não | Liga a IA real no assistente |

Não existe valor embutido no código para nenhum segredo: se a variável faltar, o
recurso correspondente fica desligado ou a rota fecha, em vez de cair num padrão
inseguro.

### Primeiros dados

Depois do `prisma db push`, o banco está vazio. Crie as contas de trabalho com o
script abaixo, escolhendo você mesmo as senhas:

```bash
SEED_ADMIN_PASSWORD=... SEED_TRAINER_PASSWORD=... SEED_CLIENT_PASSWORD=... \
  node scripts/provision-test-users.js
```

Ele cria um ADMIN, um TRAINER e um CLIENT já vinculados entre si, e imprime os
e-mails e ids (nunca as senhas). Para uma base de demonstração mais rica — cão,
contrato, sessões e evolução — rode depois:

```bash
SEED_TRAINER_PASSWORD=... node scripts/seed-real-trainer-sample.js
```

As senhas vêm de variável de ambiente de propósito: não há nenhuma credencial de
acesso versionada neste repositório, e o login não tem atalho de desenvolvimento —
toda autenticação passa pelo banco e por bcrypt.

## Verificações

```bash
pnpm lint
pnpm build:local        # build sem tocar no banco
pnpm check:home         # agenda da home
pnpm check:exercises    # árvore de exercícios
pnpm check:invite       # autocadastro por convite
pnpm check:invite:e2e   # ponta a ponta (exige DATABASE_URL em localhost)
pnpm check:dog-age      # cálculo de idade do cão
```

## Deploy

O projeto está preparado para a Vercel.

> **Atenção:** o script `build` é `prisma generate && prisma db push && next build`.
> Todo deploy aplica o schema no banco apontado por `DATABASE_URL`. É o que dispensa
> um passo de migração manual, mas significa que um deploy com a URL errada altera o
> banco errado. Para compilar sem tocar no banco, use `pnpm build:local`.

1. Conecte o repositório na Vercel.
2. Configure as variáveis de ambiente da tabela acima no projeto.
3. Faça o deploy — o schema é aplicado sozinho durante o build.
4. Rode `scripts/provision-test-users.js` uma vez, localmente, com o `DATABASE_URL`
   de produção, para criar a primeira conta de acesso.

O `vercel.json` registra um cron diário às 10:00 UTC em `/api/cron/daily-brief`,
que monta o resumo do dia de cada adestrador e dispara as notificações push.

## Estrutura

```
app/          rotas do App Router — telas e API (app/api/**)
components/   componentes de UI compartilhados
lib/          domínio, acesso a dados, autenticação e utilitários
prisma/       schema e seed
scripts/      verificações e utilitários de manutenção
docs/         documentação (veja abaixo)
public/       estáticos, ícones e service worker do PWA
```

Áreas principais da aplicação: `/dashboard`, `/clientes`, `/caes`, `/agenda`,
`/treinos`, `/evolucao`, `/planos-treino`, `/relatorios`, `/financeiro`,
`/pendencias`, `/configuracoes`, `/ia`, `/chat`, `/tutorial`, além do portal do
cliente em `/portal` e `/convite`, e do painel administrativo em `/admin`.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/ESCOPO-DO-PROJETO.md`](docs/ESCOPO-DO-PROJETO.md) | Escopo completo do produto |
| [`docs/desenvolvedor/arquitetura.md`](docs/desenvolvedor/arquitetura.md) | Arquitetura e decisões técnicas |
| [`docs/desenvolvedor/api-docs.md`](docs/desenvolvedor/api-docs.md) | Endpoints da API |
| [`docs/desenvolvedor/fluxo-do-sistema.md`](docs/desenvolvedor/fluxo-do-sistema.md) | Fluxo funcional ponta a ponta |
| [`docs/desenvolvedor/ambiente-local.md`](docs/desenvolvedor/ambiente-local.md) | Banco local e verificação ponta a ponta |
| [`docs/usuario/guia-operacao-diaria.md`](docs/usuario/guia-operacao-diaria.md) | Como o adestrador usa no dia a dia |
| [`docs/usuario/manual-adestrador.md`](docs/usuario/manual-adestrador.md) | Manual de referência do adestrador |
| [`docs/usuario/manual-tutor.md`](docs/usuario/manual-tutor.md) | Manual do dono do cão (portal) |
| [`docs/usuario/tutorial-do-sistema.md`](docs/usuario/tutorial-do-sistema.md) | Tutorial de primeiros passos |

A aplicação também traz o tutorial embutido em `/tutorial` (adestrador e admin) e
`/tutorial/cliente` (portal), além de tours guiados em `components/product-tour.tsx`.

## Convenções

- **O tutorial acompanha a funcionalidade.** Ao adicionar ou mudar algo visível ao
  usuário, atualize no mesmo commit `app/tutorial/page.tsx`, e também
  `app/tutorial/cliente/page.tsx` quando a mudança afetar o portal do cliente, e os
  passos em `components/product-tour.tsx`. Tutorial desatualizado é pior que nenhum:
  o usuário confia nele para descobrir o sistema.
- Mensagens de commit em português, no formato `tipo(escopo): descrição`.
- Nenhum segredo vai para o repositório — só para `.env`, que é ignorado pelo git.
