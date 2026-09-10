# Ambiente local: banco e verificação ponta a ponta

O Adestro não roda sem banco: qualquer rota que toque o Prisma falha se o
`DATABASE_URL` não apontar para um MySQL acessível. Este documento mostra como
levantar esse banco e como rodar a verificação ponta a ponta do fluxo de convite.

## 1. Um MySQL local

A forma mais rápida, se você tem Docker:

```bash
docker run -d --name adestro-db \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=adestro \
  -p 3306:3306 \
  mysql:8
```

E no `.env`:

```
DATABASE_URL="mysql://root:root@127.0.0.1:3306/adestro"
```

Sem Docker, serve qualquer MySQL 8 ou MariaDB 10.6+ instalado pelo gerenciador de
pacotes do sistema — basta criar o banco `adestro` e um usuário com permissão nele,
e ajustar a URL. O projeto também roda contra o TiDB Cloud, que é o que a produção
usava; nesse caso a URL termina em `?sslaccept=strict`.

Com o banco de pé, aplique o schema:

```bash
pnpm prisma db push
```

O Prisma CLI lê o arquivo `.env` (não o `.env.local`). Se você mantém as variáveis
da aplicação no `.env.local`, deixe pelo menos o `DATABASE_URL` também no `.env`.

## 2. Subir a aplicação

```bash
pnpm dev          # http://localhost:3000
```

Se o Turbopack reclamar que não resolve `tailwindcss`, o motivo costuma ser o
projeto estar atrás de um symlink: mova o repositório para um caminho real ou use o
build de produção, que não depende dessa resolução:

```bash
pnpm build:local && pnpm start
```

`build:local` compila sem tocar no banco. O `build` normal roda `prisma db push`
antes — é o que a Vercel executa no deploy, e por isso não é o que você quer rodar
apontando para um banco que não seja o seu.

## 3. Verificação ponta a ponta

```bash
pnpm check:invite:e2e
```

Percorre o fluxo inteiro do convite: o adestrador gera o link, o cliente se cadastra,
a ficha chega como rascunho, o adestrador aprova. Cobre limite de plano, revogação,
expiração, reentrada e as rotas privadas sem sessão.

O script **apaga** clientes e convites do adestrador de teste
(`teste.adestrador@local.test`) e por isso se recusa a rodar se o `DATABASE_URL` não
apontar para `127.0.0.1` ou `localhost`.

As demais verificações não precisam de banco e conferem regras de domínio puras:

```bash
pnpm check:home        # montagem da agenda da home
pnpm check:exercises   # árvore Categoria > Área > Exercício
pnpm check:invite      # validação por seção do formulário de convite
pnpm check:dog-age     # cálculo de idade do cão em anos, meses e dias
```
