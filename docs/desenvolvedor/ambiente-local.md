# Ambiente local: banco e verificação ponta a ponta

O `.env` do repo aponta para `mysql://dummy:...@127.0.0.1:4000/adestro` — um banco local
que **não vem pronto**. Sem ele, qualquer rota que toque o Prisma falha, e foi por isso que
a verificação ponta a ponta do convite de autocadastro ficou bloqueada por duas sessões.

Esta receita sobe um MariaDB **sem root** e sem instalar nada no sistema.

## 1. MariaDB em espaço de usuário

```bash
D=~/.local/share/mariadb-adestro
mkdir -p "$D/debs" "$D/root" "$D/data" "$D/run"
cd "$D/debs"
apt-get download mariadb-server-core mariadb-common mariadb-client-core libmariadb3
for f in *.deb; do dpkg-deb -x "$f" "$D/root"; done
```

Arquivo de configuração (a porta 4000 é a que o `.env` espera):

```bash
cat > "$D/my.cnf" <<EOF
[mysqld]
basedir  = $D/root/usr
datadir  = $D/data
port     = 4000
socket   = $D/run/mysqld.sock
pid-file = $D/run/mysqld.pid
bind-address = 127.0.0.1
skip-name-resolve
lc-messages-dir = $D/root/usr/share/mariadb
[client]
port   = 4000
socket = $D/run/mysqld.sock
EOF

"$D/root/usr/bin/mariadb-install-db" --defaults-file="$D/my.cnf" \
  --basedir="$D/root/usr" --datadir="$D/data" --auth-root-authentication-method=normal
```

Subir e criar o banco (a senha tem de ser a mesma do `DATABASE_URL` do `.env`):

```bash
"$D/root/usr/sbin/mariadbd" --defaults-file="$D/my.cnf" &
SENHA=$(grep -oP 'mysql://dummy:\K[^@]*' .env)
"$D/root/usr/bin/mariadb" --defaults-file="$D/my.cnf" -u root -e "
  CREATE DATABASE IF NOT EXISTS adestro CHARACTER SET utf8mb4;
  CREATE USER IF NOT EXISTS 'dummy'@'%' IDENTIFIED BY '$SENHA';
  GRANT ALL PRIVILEGES ON adestro.* TO 'dummy'@'%';
  FLUSH PRIVILEGES;"
```

Aplicar o schema:

```bash
npx prisma db push
```

## 2. Subir a aplicação

`npm run dev` **não funciona** neste projeto: o Turbopack não resolve `tailwindcss`
através do symlink de `~/Adestro`. Use o build de produção, que funciona:

```bash
npm run build:local && npm start
```

(`npm run build` roda `prisma db push` antes — é o que a Vercel executa. Localmente use
`build:local`, que pula essa etapa.)

## 3. Rodar a verificação

```bash
npm run check:invite:e2e
```

Percorre o fluxo inteiro do convite: o adestrador gera o link, o tutor se cadastra, o
cadastro chega como rascunho, o adestrador aprova. Cobre limite de plano, revogação,
expiração, reentrada e as rotas privadas sem sessão.

O script **apaga** clientes e convites do adestrador de teste
(`teste.adestrador@local.test`) e por isso se recusa a rodar se o `DATABASE_URL` não
apontar para `127.0.0.1` ou `localhost`.
