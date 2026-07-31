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
check("abre na seção 1", info.resumeStep === 1, `resumeStep=${info.resumeStep}`);
check("sem prefill antes de começar", info.prefill === null);
check("a tela /convite/<token> renderiza", (await anon(`/convite/${token}`)).status === 200);

// ── Seção 1: cria o cadastro. A partir daqui o lead está capturado ──────────
const s1 = await anon(`/api/invite/${token}`, post({
  section: 1,
  data: {
    clientName: "Maria Silva",
    phone: "41999998888",
    email: "maria@exemplo.com",
    cpf: "000.000.000-00",
    address: {
      zipCode: "80000-000", street: "Rua das Flores", number: "10",
      neighborhood: "Centro", city: "Curitiba", state: "PR",
    },
  },
}));
check("seção 1 responde 200", s1.status === 200, `HTTP ${s1.status}`);

const afterS1 = await prisma.clientInvite.findUnique({
  where: { id: gen.invite.id },
  include: { client: { include: { dogs: true, addresses: true } } },
});
check("seção 1 já cria o cliente como Rascunho", afterS1.client?.status === "Rascunho", afterS1.client?.status);
check("telefone gravado — é por ele que o adestrador retoma", afterS1.client?.phone === "41999998888");
check("endereço gravado", afterS1.client?.addresses?.[0]?.city === "Curitiba");
check("nenhum cão criado ainda", afterS1.client?.dogs?.length === 0, `${afterS1.client?.dogs?.length} cão(es)`);
check("convite ainda não está concluído", afterS1.completedAt === null);
check("telefone é obrigatório na seção 1", (await anon(`/api/invite/${token}`, post({
  section: 1, data: { clientName: "Sem Telefone" },
}))).status === 400);

// ── Abandono e retomada: o motivo de existir o status novo ──────────────────
const meio = await (await anon(`/api/invite/${token}`)).json();
check("abandonou na seção 2: status Em preenchimento", meio.status === "Em preenchimento", meio.status);
check("retoma na seção 2", meio.resumeStep === 2, `resumeStep=${meio.resumeStep}`);
check("NÃO mostra 'você já se cadastrou'", meio.alreadyUsed === false, String(meio.alreadyUsed));
check("prefill devolve o que já foi digitado", meio.prefill?.clientName === "Maria Silva", meio.prefill?.clientName);
check("prefill traz o endereço", meio.prefill?.address?.city === "Curitiba");
check("prefill não inventa cão", meio.prefill?.dog === null);

// ── Seção 2: o cão ─────────────────────────────────────────────────────────
const s2 = await anon(`/api/invite/${token}`, post({
  section: 2,
  data: {
    dogName: "Bolt", breed: "Border Collie", sex: "Macho", castrated: true,
    weight: "18 kg", preventiveCare: "Em dia",
    healthConditions: "Nenhuma", veterinarian: "Dra. Ana — 41977776666",
  },
}));
check("seção 2 responde 200", s2.status === 200, `HTTP ${s2.status}`);
const meio2 = await (await anon(`/api/invite/${token}`)).json();
check("retoma na seção 3 depois do cão", meio2.resumeStep === 3, `resumeStep=${meio2.resumeStep}`);
check("prefill traz o cão", meio2.prefill?.dog?.dogName === "Bolt", meio2.prefill?.dog?.dogName);

// Reenvio de seção não pode apagar o que o adestrador preencheu à mão.
const dogAntes = (await prisma.clientProfile.findUnique({
  where: { id: afterS1.clientId }, include: { dogs: true },
})).dogs[0];
await prisma.dog.update({ where: { id: dogAntes.id }, data: { microchip: "982000123456789" } });
await anon(`/api/invite/${token}`, post({ section: 2, data: { dogName: "Bolt" } }));
const dogDepois = await prisma.dog.findUnique({ where: { id: dogAntes.id } });
check("reenviar seção não apaga campo que ela não pergunta", dogDepois.microchip === "982000123456789", dogDepois.microchip);

// ── Seção 3: comportamento; fecha o convite ────────────────────────────────
const s3 = await anon(`/api/invite/${token}`, post({
  section: 3,
  data: {
    temperament: {
      energy: "Alta energia", social: "Sociável com pessoas", dogs: "Reativo a outros cães",
      children: "Tolerante com crianças",
      noise: ["Fica ansioso com barulhos", "Se esconde com barulhos"],
      biteHistory: "Sem histórico de mordida",
      resourceGuarding: "Protege recursos",
      handling: "Aceita manipulação com restrições",
      unwantedBehaviors: ["Puxa muito a guia", "Latidos em excesso"],
      behavior: "Late no portão",
    },
    routine: {
      alimentation: "Ração seca 2x ao dia",
      walks: "Duas voltas no quarteirão",
      plays: "Bolinha e mordedor",
      sleep: "Cama na sala",
    },
  },
}));
const s3body = await s3.json();
check("seção 3 responde 200", s3.status === 200, `HTTP ${s3.status}`);
check("conclusão devolve portalUrl", s3body.portalUrl?.includes("/portal/cliente/"));

const done = await prisma.clientInvite.findUnique({
  where: { id: gen.invite.id },
  include: { client: { include: { dogs: true } } },
});
check("convite marcado como concluído", !!done.completedAt);
const dogRow = done.client.dogs[0];
const temperament = JSON.parse(dogRow.temperament);
const routine = JSON.parse(dogRow.routine);

check("convivência com crianças gravada", temperament.children === "Tolerante com crianças");
check("reação a barulhos gravada como lista", Array.isArray(temperament.noise) && temperament.noise.length === 2);
check("histórico de mordida gravado", temperament.biteHistory === "Sem histórico de mordida");
check("proteção de recursos gravada", temperament.resourceGuarding === "Protege recursos");
check("aceita manipulação gravada", temperament.handling === "Aceita manipulação com restrições");
check("comportamentos indesejados gravados como lista", temperament.unwantedBehaviors?.length === 2);
check("vacinação/antipulgas gravada", dogRow.preventiveCare === "Em dia");

// Os tres campos que existiam mortos desde sempre.
check("rotina de sono deixou de ser vazia", routine.sleep === "Cama na sala", routine.sleep);
check("rotina de passeios deixou de ser vazia", !!routine.walks, routine.walks);
check("rotina de brincadeiras deixou de ser vazia", !!routine.plays, routine.plays);

// ── Passo 4: o destino do redirect existe ──────────────────────────────────
const portalToken = s3body.portalUrl.split("/portal/cliente/")[1];
check("portal do cliente abre", (await anon(`/portal/cliente/${portalToken}`)).status === 200);

// ── Passo 5: só depois de concluir é que vira reentrada ─────────────────────
const fim = await (await anon(`/api/invite/${token}`)).json();
check("convite concluído vira Usado", fim.status === "Usado", fim.status);
check("agora sim alreadyUsed", fim.alreadyUsed === true);
const reenter = await (await anon(`/api/invite/${token}`, { method: "POST" })).json();
check("reentrada emite portal novo", reenter.portalUrl?.includes("/portal/cliente/"));
check("token do portal foi rotacionado", reenter.portalUrl !== s3body.portalUrl);
check("reentrada não duplica cliente", (await prisma.clientProfile.count({ where: { name: "Maria Silva" } })) === 1);

// ── Seção fora de ordem ────────────────────────────────────────────────────
const orfao = await (await req("/api/client-invites", post({ label: "fora de ordem" }))).json();
const orfaoToken = orfao.shareUrl.split("/convite/")[1];
const pulou = await anon(`/api/invite/${orfaoToken}`, post({ section: 2, data: { dogName: "Rex" } }));
check("seção 2 sem seção 1 devolve 409", pulou.status === 409, `HTTP ${pulou.status}`);

// ── Consulta de CEP pelo servidor (a CSP bloqueia o navegador) ──────────────
const cepOk = await anon("/api/cep/01310100");
check("proxy de CEP responde 200", cepOk.status === 200, `HTTP ${cepOk.status}`);
check("proxy de CEP devolve o endereço", (await cepOk.json()).city === "São Paulo");
check("CEP malformado devolve 400", (await anon("/api/cep/123")).status === 400);

// Convite usado acima; a partir daqui o teste do adestrador usa o cliente criado.
const invite = done;


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
check("nome em branco é recusado com 400", (await anon(`/api/invite/${freshToken}`, post({
  section: 1, data: { clientName: "  ", phone: "41999998888" },
}))).status === 400);
// Seção inexistente num convite que ninguém começou cai na guarda do clientId
// antes de chegar em "passo inválido". A precedência é essa de propósito: a
// instrução útil é "comece pelo primeiro passo", não "passo inválido".
const secaoInvalida = await anon(`/api/invite/${freshToken}`, post({ section: 9, data: {} }));
check("seção inexistente é recusada", secaoInvalida.status === 409, `HTTP ${secaoInvalida.status}`);
check(
  "e a mensagem manda começar do começo",
  (await secaoInvalida.json()).error?.includes("primeiro passo"),
);
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
check("tutor consegue se cadastrar", (await anon(`/api/invite/${cotaToken}`, post({
  section: 1, data: { clientName: "Tutor Cota", phone: "41911112222" },
}))).status === 200);

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
