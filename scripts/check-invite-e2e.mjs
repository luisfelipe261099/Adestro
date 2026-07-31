// Verificação ponta a ponta do convite de autocadastro (Task 9 do plano).
//
// Percorre o fluxo inteiro contra um servidor real: adestrador gera o link,
// tutor se cadastra, adestrador aprova. Cobre também limite de plano, revogação,
// expiração e as rotas privadas sem sessão.
//
// Pré-requisitos (ver docs/desenvolvedor/ambiente-local.md):
//   1. Banco MySQL/MariaDB local no DATABASE_URL do .env, com o schema aplicado
//   2. `npm run build:local && npm start` no ar em http://localhost:3000
//
// Rodar: npm run check:invite:e2e
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const EMAIL = "teste.adestrador@local.test";
const SENHA = "teste123456";

// ── Trava de segurança ───────────────────────────────────────────────────────
// Este script APAGA clientes e convites do adestrador de teste. Rodar contra
// produção destruiria dados reais, então o host é conferido antes de tudo.
const dbUrl = process.env.DATABASE_URL ?? "";
const host = dbUrl.replace(/^[a-z]+:\/\/[^@]*@/i, "").split("/")[0];
if (!/^(127\.0\.0\.1|localhost)(:|$)/.test(host)) {
  console.error(`RECUSADO: DATABASE_URL aponta para "${host}", que não é local.`);
  console.error("Este script apaga dados. Só roda contra 127.0.0.1 ou localhost.");
  process.exit(1);
}

const prisma = new PrismaClient();

let pass = 0;
let total = 0;
const falhas = [];
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  else falhas.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`${cond ? "  ok  " : " FALHA"} ${label}${detail ? ` — ${detail}` : ""}`);
}

// ── Sessão do adestrador ─────────────────────────────────────────────────────
const jar = new Map();
function saveCookies(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    redirect: "manual",
    headers: { cookie: cookieHeader(), ...(opts.headers ?? {}) },
  });
  saveCookies(res);
  return res;
}
// Sem cookie: é assim que o tutor chega.
const anon = (path, opts = {}) => fetch(`${BASE}${path}`, { ...opts, redirect: "manual" });
const post = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

try {
  await fetch(`${BASE}/api/auth/csrf`);
} catch {
  console.error(`RECUSADO: nada respondendo em ${BASE}. Suba a app com \`npm start\`.`);
  process.exit(1);
}

// ── Fixture: adestrador de teste ─────────────────────────────────────────────
const bcrypt = (await import("bcryptjs")).default;
const user = await prisma.user.upsert({
  where: { email: EMAIL },
  update: {},
  create: {
    email: EMAIL,
    password: await bcrypt.hash(SENHA, 10),
    role: "TRAINER",
    name: "Adestrador de Teste",
  },
});
const trainer = await prisma.trainer.upsert({
  where: { userId: user.id },
  update: { plan: "Pro" },
  create: { userId: user.id, name: "Adestrador de Teste", plan: "Pro" },
});
await prisma.clientInvite.deleteMany({ where: { trainerId: trainer.id } });
await prisma.clientProfile.deleteMany({ where: { trainerId: trainer.id } });

const { csrfToken } = await (await req("/api/auth/csrf")).json();
await req("/api/auth/callback/credentials", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrfToken, email: EMAIL, password: SENHA, callbackUrl: `${BASE}/clientes` }),
});
check("login do adestrador", [...jar.keys()].some((k) => k.includes("session-token")));
const session = await (await req("/api/auth/session")).json();
check("sessão traz role trainer", (session?.user?.role ?? "").toLowerCase() === "trainer", session?.user?.role);

// ── Passo 1: o adestrador gera o convite ─────────────────────────────────────
const genRes = await req("/api/client-invites", post({ label: "Maria do Instagram", expiresInDays: 7 }));
const gen = await genRes.json();
check("POST /api/client-invites gera convite", genRes.status === 200, `HTTP ${genRes.status}`);
check("devolve shareUrl", gen.shareUrl?.includes("/convite/"), gen.shareUrl);
check("status inicial Pendente", gen.invite?.status === "Pendente", gen.invite?.status);

const token = gen.shareUrl.split("/convite/")[1];
const stored = await prisma.clientInvite.findUnique({ where: { id: gen.invite.id } });
check("token nunca gravado em texto puro", !JSON.stringify(stored).includes(token), "só hash + prefixo");

const list = await (await req("/api/client-invites")).json();
check("convite aparece na lista do adestrador", list.invites?.some((i) => i.id === gen.invite.id));

// ── Passo 2: o tutor abre o link ─────────────────────────────────────────────
const infoRes = await anon(`/api/invite/${token}`);
const info = await infoRes.json();
check("GET público responde 200", infoRes.status === 200, `HTTP ${infoRes.status}`);
check("mostra o nome do adestrador", info.trainerName === "Adestrador de Teste", info.trainerName);
check("não vaza dado de cliente", !("clientId" in info), Object.keys(info).join(","));
check("a tela /convite/<token> renderiza", (await anon(`/convite/${token}`)).status === 200);

// ── Passo 3: o tutor envia a ficha ───────────────────────────────────────────
const submitRes = await anon(`/api/invite/${token}`, post({
  clientName: "Maria Silva",
  phone: "41999998888",
  email: "maria@exemplo.com",
  dogName: "Bolt",
  breed: "Border Collie",
}));
const submit = await submitRes.json();
check("POST público cria o cadastro", submitRes.status === 200, `HTTP ${submitRes.status}`);
check("devolve portalUrl", submit.portalUrl?.includes("/portal/cliente/"));

const invite = await prisma.clientInvite.findUnique({
  where: { id: gen.invite.id },
  include: { client: { include: { dogs: true } } },
});
check("cliente criado como Rascunho", invite.client?.status === "Rascunho", invite.client?.status);
check("dados do tutor gravados", invite.client?.name === "Maria Silva" && invite.client?.phone === "41999998888");
check("cão criado na mesma transação", invite.client?.dogs?.[0]?.name === "Bolt", invite.client?.dogs?.[0]?.name);
check("PortalAccessLink criado na transação", !!(await prisma.portalAccessLink.findUnique({ where: { clientId: invite.clientId } })));

// ── Passo 4: o destino do redirect existe ────────────────────────────────────
const portalToken = submit.portalUrl.split("/portal/cliente/")[1];
check("ficha de onboarding abre", (await anon(`/portal/cliente/${portalToken}/onboarding`)).status === 200);
check("portal do cliente abre (Deixar para depois)", (await anon(`/portal/cliente/${portalToken}`)).status === 200);

// ── Passo 5: reentrada ───────────────────────────────────────────────────────
const info2 = await (await anon(`/api/invite/${token}`)).json();
check("convite usado vira alreadyUsed", info2.alreadyUsed === true);
check("status do convite vira Usado", info2.status === "Usado", info2.status);
const reenter = await (await anon(`/api/invite/${token}`, { method: "POST" })).json();
check("reentrada emite portal novo", reenter.portalUrl?.includes("/portal/cliente/"));
check("token do portal foi rotacionado", reenter.portalUrl !== submit.portalUrl);
check("reentrada não duplica cliente", (await prisma.clientProfile.count({ where: { name: "Maria Silva" } })) === 1);

// ── Passos 6 e 7: o adestrador vê e aprova ───────────────────────────────────
const clients = await (await req("/api/clients")).json();
const arr = Array.isArray(clients) ? clients : (clients.clients ?? []);
const draft = arr.find((c) => c.id === invite.clientId);
check("rascunho aparece na lista do adestrador", draft?.status === "Rascunho", draft?.status);

const approveRes = await req("/api/clients", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientId: invite.clientId, status: "Ativo" }),
});
check("PATCH de aprovação responde 200", approveRes.status === 200, `HTTP ${approveRes.status}`);
check("cliente virou Ativo", (await prisma.clientProfile.findUnique({ where: { id: invite.clientId } })).status === "Ativo");

// ── Casos de erro ────────────────────────────────────────────────────────────
const bad = await anon("/api/invite/token-invalido");
check("token inválido devolve 404", bad.status === 404, `HTTP ${bad.status}`);
check("mensagem de token inválido é acionável", (await bad.json()).error?.includes("Confira o link"));

const revGen = await (await req("/api/client-invites", post({ label: "para revogar" }))).json();
const revToken = revGen.shareUrl.split("/convite/")[1];
check("PATCH de revogação responde 200", (await req("/api/client-invites", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: revGen.invite.id, action: "revoke" }),
})).status === 200);
const revOpen = await anon(`/api/invite/${revToken}`);
check("convite revogado devolve 410", revOpen.status === 410, `HTTP ${revOpen.status}`);
check("mensagem diz que foi cancelado", (await revOpen.json()).error?.includes("cancelado"));

const expGen = await (await req("/api/client-invites", post({ label: "para expirar" }))).json();
const expToken = expGen.shareUrl.split("/convite/")[1];
await prisma.clientInvite.update({
  where: { id: expGen.invite.id },
  data: { expiresAt: new Date(Date.now() - 86_400_000) },
});
const expOpen = await anon(`/api/invite/${expToken}`);
check("convite vencido devolve 410", expOpen.status === 410, `HTTP ${expOpen.status}`);
check("mensagem diz que venceu", (await expOpen.json()).error?.includes("venceu"));

check("GET /api/client-invites sem sessão devolve 401", (await anon("/api/client-invites")).status === 401);
check("POST /api/client-invites sem sessão devolve 401", (await anon("/api/client-invites", post({}))).status === 401);

const freshGen = await (await req("/api/client-invites", post({ label: "validacao" }))).json();
const freshToken = freshGen.shareUrl.split("/convite/")[1];
check("nome em branco é recusado com 400", (await anon(`/api/invite/${freshToken}`, post({ clientName: "  ", dogName: "Bolt" }))).status === 400);
check("convite segue utilizável após payload inválido", (await (await anon(`/api/invite/${freshToken}`)).json()).status === "Pendente");

// ── Limite de plano: rascunho não ocupa vaga, a aprovação é que cobra ────────
await prisma.clientInvite.deleteMany({ where: { trainerId: trainer.id } });
await prisma.clientProfile.deleteMany({ where: { trainerId: trainer.id } });
await prisma.trainer.update({ where: { id: trainer.id }, data: { plan: "Trial" } }); // 3 clientes

const addActive = (n) => prisma.clientProfile.createMany({
  data: Array.from({ length: n }, (_, i) => ({
    trainerId: trainer.id,
    name: `Ativo ${i + 1}`,
    status: "Ativo",
  })),
});

await addActive(3);
const blocked = await req("/api/client-invites", post({ label: "estourado" }));
const blockedBody = await blocked.json();
check("cota cheia bloqueia a geração com 402", blocked.status === 402, `HTTP ${blocked.status}`);
check("resposta traz code PLAN_LIMIT", blockedBody.code === "PLAN_LIMIT", blockedBody.code);
check("mensagem explica o plano", /Plano Trial permite até 3 clientes/.test(blockedBody.error ?? ""), blockedBody.error);

const victim1 = await prisma.clientProfile.findFirst({ where: { trainerId: trainer.id, status: "Ativo" } });
await prisma.clientProfile.delete({ where: { id: victim1.id } }); // 2 ativos
const cotaGen = await (await req("/api/client-invites", post({ label: "com vaga" }))).json();
check("com vaga livre o convite é gerado", !!cotaGen.shareUrl);
const cotaToken = cotaGen.shareUrl.split("/convite/")[1];
check("tutor consegue se cadastrar", (await anon(`/api/invite/${cotaToken}`, post({ clientName: "Tutor Cota", dogName: "Rex" }))).status === 200);

const ativos = await prisma.clientProfile.count({ where: { trainerId: trainer.id, status: { not: "Rascunho" } } });
const rascunhos = await prisma.clientProfile.count({ where: { trainerId: trainer.id, status: "Rascunho" } });
check("rascunho NÃO entra na contagem do plano", ativos === 2 && rascunhos === 1, `ativos=${ativos} rascunhos=${rascunhos}`);
check("rascunho pendente não impede novo convite", (await req("/api/client-invites", post({ label: "ainda cabe" }))).status === 200);

await addActive(1); // 3 ativos: cota cheia de novo
const cotaDraft = await prisma.clientProfile.findFirst({ where: { trainerId: trainer.id, status: "Rascunho" } });
const approveBlocked = await req("/api/clients", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientId: cotaDraft.id, status: "Ativo" }),
});
check("aprovar com cota cheia devolve 402", approveBlocked.status === 402, `HTTP ${approveBlocked.status}`);
check("aprovação bloqueada traz PLAN_LIMIT", (await approveBlocked.json()).code === "PLAN_LIMIT");
check("cadastro continua Rascunho após bloqueio", (await prisma.clientProfile.findUnique({ where: { id: cotaDraft.id } })).status === "Rascunho");

const victim2 = await prisma.clientProfile.findFirst({ where: { trainerId: trainer.id, status: "Ativo" } });
await prisma.clientProfile.delete({ where: { id: victim2.id } });
check("com vaga aberta a mesma aprovação passa", (await req("/api/clients", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientId: cotaDraft.id, status: "Ativo" }),
})).status === 200);

// ── Limpeza ──────────────────────────────────────────────────────────────────
await prisma.clientInvite.deleteMany({ where: { trainerId: trainer.id } });
await prisma.clientProfile.deleteMany({ where: { trainerId: trainer.id } });
await prisma.trainer.update({ where: { id: trainer.id }, data: { plan: "Pro" } });
await prisma.$disconnect();

console.log(`\n${pass}/${total} verificações passaram.`);
if (falhas.length) {
  console.error(`\n${falhas.length} falha(s):`);
  for (const f of falhas) console.error(`  - ${f}`);
}
assert.equal(falhas.length, 0, "check-invite-e2e falhou");
console.log("check-invite-e2e: OK");
