/**
 * Importa os clientes/cães do ClickUp (lista "Clientes" do workspace do adestrador)
 * para o Adestro, na conta do trainer indicado.
 *
 * Uso (sempre local, nunca no build):
 *   DATABASE_URL="mysql://...sslaccept=strict" node scripts/import-clickup.js \
 *     --trainer-email carloswoellner@gmail.com [--commit] [--preview-out caminho.md]
 *
 * Sem --commit roda em dry-run: só gera o preview, não toca no banco.
 * Token da API lido de CLICKUP_API_TOKEN (env ou .env.local).
 * Idempotente: cards já importados (marcador [clickup:<id>] no contrato) são pulados.
 */
const fs = require("fs");
const path = require("path");

const LIST_ID = "901321279780";
const MAP_PATH = path.join(__dirname, "clickup-map.json");

const KANBAN_STATUS = {
  fichas: "Ficha",
  ativo: "Ativo",
  completo: "Completo",
  pausado: "Pausado",
  cancelado: "Cancelado",
};
const CONTRACT_STATUS = {
  fichas: "Ativo",
  ativo: "Ativo",
  pausado: "Ativo",
  completo: "Encerrado",
  cancelado: "Encerrado",
};

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}
const COMMIT = process.argv.includes("--commit");
const TRAINER_EMAIL = arg("--trainer-email");
const PREVIEW_OUT = arg("--preview-out") || path.join(__dirname, "..", "clickup-import-preview.md");

function loadToken() {
  if (process.env.CLICKUP_API_TOKEN) return process.env.CLICKUP_API_TOKEN;
  const envLocal = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envLocal)) {
    const m = fs.readFileSync(envLocal, "utf8").match(/^CLICKUP_API_TOKEN=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("CLICKUP_API_TOKEN não encontrado (env ou .env.local)");
}

async function fetchAllTasks(token) {
  const tasks = [];
  for (let page = 0; ; page++) {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${LIST_ID}/task?subtasks=true&include_closed=true&page=${page}`,
      { headers: { Authorization: token } }
    );
    if (!res.ok) throw new Error(`ClickUp API ${res.status}: ${await res.text()}`);
    const batch = (await res.json()).tasks || [];
    if (!batch.length) break;
    tasks.push(...batch);
  }
  return tasks;
}

function msToDate(ms) {
  if (!ms) return null;
  const d = new Date(Number(ms));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function line(desc, label) {
  const m = (desc || "").match(new RegExp(`${label}:[ \\t]*([^\\n]*)`));
  return m ? m[1].trim() : "";
}

function parseFicha(desc) {
  desc = desc || "";
  const objetivos = (() => {
    const m = desc.match(/Objetivos:\s*([\s\S]*?)(?=Análise|$)/);
    return m ? m[1].trim() : "";
  })();
  const analise = (() => {
    const m = desc.match(/Análise (?:ambiental e )?comportamental[^\n]*\n?([\s\S]*)$/);
    return m ? m[1].trim() : "";
  })();
  return {
    phone: line(desc, "Telefone"),
    sexRaw: line(desc, "Sexo e condição"),
    breed: line(desc, "Raça"),
    age: line(desc, "Idade") || line(desc, "Nascimento"),
    plan: line(desc, "Plano"),
    objetivos,
    analise,
  };
}

function parseSex(sexRaw) {
  if (!sexRaw) return {};
  const out = {};
  if (/fêmea/i.test(sexRaw) && !/macho/i.test(sexRaw)) out.sex = "Fêmea";
  if (/macho/i.test(sexRaw) && !/fêmea/i.test(sexRaw)) out.sex = "Macho";
  if (/castrad/i.test(sexRaw)) out.castrated = !/não\s+castrad/i.test(sexRaw);
  return out;
}

const PAG_RE = /pagamento/i;
const NUM_RE = /(\d{1,2})\s*$/;

function classifySubtasks(subs) {
  const sessions = [];
  const pagamentos = [];
  for (const s of subs) {
    if (PAG_RE.test(s.name)) {
      pagamentos.push(s);
    } else if (NUM_RE.test(s.name) || /visita inicial/i.test(s.name)) {
      sessions.push(s);
    }
  }
  return { sessions, pagamentos };
}

async function main() {
  if (!TRAINER_EMAIL) throw new Error("--trainer-email é obrigatório");
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const token = loadToken();

  console.log(`Baixando tarefas da lista ${LIST_ID}...`);
  const tasks = await fetchAllTasks(token);
  const cards = tasks.filter((t) => !t.parent);
  const subsByParent = new Map();
  for (const t of tasks) {
    if (!t.parent) continue;
    if (!subsByParent.has(t.parent)) subsByParent.set(t.parent, []);
    subsByParent.get(t.parent).push(t);
  }
  console.log(`${cards.length} cards, ${tasks.length - cards.length} subtarefas.`);

  // ── monta grupos (cliente+cães) a partir do mapa curado ──────────────────
  const exceptions = [];
  const groups = new Map(); // group key -> { client, dogs: Map(nome->attrs), cards: [] }

  for (const card of cards) {
    const entry = map[card.id];
    if (!entry) {
      exceptions.push(`Card sem entrada no mapa (não importado): ${card.id} | ${card.name}`);
      continue;
    }
    if (entry.skip) continue;

    const ficha = parseFicha(card.description);
    const { sessions, pagamentos } = classifySubtasks(
      (subsByParent.get(card.id) || []).sort((a, b) => a.orderindex - b.orderindex)
    );

    if (!groups.has(entry.group)) {
      groups.set(entry.group, { client: entry.client, dogs: new Map(), cards: [], reviews: [] });
    }
    const g = groups.get(entry.group);
    if (entry.review) g.reviews.push(`${card.name}: ${entry.review}`);

    for (const d of entry.dogs) {
      const existing = g.dogs.get(d.name.toLowerCase()) || { name: d.name };
      const parsedSex = entry.dogs.length === 1 ? parseSex(ficha.sexRaw) : {};
      g.dogs.set(d.name.toLowerCase(), {
        ...existing,
        breed: d.breed || existing.breed || (entry.dogs.length === 1 ? ficha.breed : "") || "",
        age: d.age || existing.age || (entry.dogs.length === 1 ? ficha.age : "") || "",
        sex: d.sex || existing.sex || parsedSex.sex || null,
        castrated: d.castrated ?? existing.castrated ?? parsedSex.castrated ?? false,
        name: d.name,
      });
    }

    const doneSessions = sessions
      .filter((s) => s.status.status === "completo")
      .map((s) => ({
        title: s.name.trim(),
        number: /visita inicial/i.test(s.name) ? 0 : Number((s.name.match(NUM_RE) || [])[1] || 0),
        date: msToDate(s.due_date) || msToDate(s.date_closed) || msToDate(s.date_updated),
      }));

    const startDate =
      sessions.map((s) => msToDate(s.due_date)).filter(Boolean).sort()[0] ||
      msToDate(card.start_date) ||
      msToDate(card.date_created) ||
      new Date().toISOString().slice(0, 10);

    const orientacoes = (card.custom_fields || [])
      .filter((f) => /orienta/i.test(f.name || "") && f.value)
      .map((f) => String(f.value));

    g.cards.push({
      id: card.id,
      name: card.name.trim(),
      etapa: entry.etapa || 1,
      clickupStatus: card.status.status,
      ficha,
      sessionsCount: sessions.filter((s) => !/visita inicial/i.test(s.name)).length,
      doneSessions,
      pagamentos: pagamentos.map((p) => `${p.name.trim()} (${p.status.status})`),
      orientacoes,
      startDate,
      dogNames: entry.dogs.map((d) => d.name),
    });
  }

  // status kanban do grupo = status do card de etapa mais alta
  for (const g of groups.values()) {
    g.cards.sort((a, b) => a.etapa - b.etapa);
    const last = g.cards[g.cards.length - 1];
    g.trainingStatus = KANBAN_STATUS[last.clickupStatus] || "Ativo";
    g.phone = g.cards.map((c) => c.ficha.phone).find(Boolean) || "";
    g.plan = g.cards.map((c) => c.ficha.plan).find(Boolean) || "";
  }

  // ── preview ───────────────────────────────────────────────────────────────
  const previewLines = [
    "# Preview da importação ClickUp → Adestro",
    "",
    `Trainer alvo: ${TRAINER_EMAIL} · Modo: ${COMMIT ? "COMMIT" : "DRY-RUN"} · Grupos: ${groups.size}`,
    "",
    "| Cliente | Telefone | Cães | Quadro | Contratos (etapas) | Sessões a criar |",
    "|---|---|---|---|---|---|",
  ];
  let totDogs = 0, totContracts = 0, totSessions = 0;
  const allReviews = [];
  for (const [key, g] of [...groups.entries()].sort()) {
    const dogs = [...g.dogs.values()];
    totDogs += dogs.length;
    totContracts += g.cards.length;
    const nSess = g.cards.reduce((n, c) => n + c.doneSessions.length, 0);
    totSessions += nSess;
    allReviews.push(...g.reviews.map((r) => `- ${r}`));
    previewLines.push(
      `| ${g.client} | ${g.phone || "—"} | ${dogs
        .map((d) => `${d.name}${d.breed ? ` (${d.breed})` : ""}`)
        .join(", ")} | ${g.trainingStatus} | ${g.cards
        .map((c) => `${c.name} [${c.sessionsCount} sessões]`)
        .join("; ")} | ${nSess} |`
    );
  }
  previewLines.push(
    "",
    `**Totais:** ${groups.size} clientes · ${totDogs} cães · ${totContracts} contratos · ${totSessions} sessões realizadas`,
    "",
    allReviews.length ? `## Revisar depois\n${allReviews.join("\n")}` : "",
    exceptions.length ? `## Exceções (não importados)\n${exceptions.map((e) => `- ${e}`).join("\n")}` : ""
  );
  fs.writeFileSync(PREVIEW_OUT, previewLines.filter((l) => l !== undefined).join("\n"));
  console.log(`Preview: ${PREVIEW_OUT}`);
  console.log(`Totais: ${groups.size} clientes, ${totDogs} cães, ${totContracts} contratos, ${totSessions} sessões.`);
  if (exceptions.length) console.log(`ATENÇÃO: ${exceptions.length} exceções (ver preview).`);

  if (!COMMIT) {
    console.log("Dry-run: nada foi gravado. Use --commit para importar.");
    return;
  }

  // ── commit ────────────────────────────────────────────────────────────────
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: TRAINER_EMAIL },
      include: { trainer: true },
    });
    if (!user?.trainer) throw new Error(`Trainer não encontrado para ${TRAINER_EMAIL}`);
    const trainerId = user.trainer.id;
    console.log(`Gravando na conta de ${user.name || user.email} (trainer ${trainerId})...`);

    let cClients = 0, cDogs = 0, cContracts = 0, cSessions = 0, skippedCards = 0;

    for (const [key, g] of groups.entries()) {
      // cliente: reaproveita por nome exato (trainer-scoped)
      let client = await prisma.clientProfile.findFirst({
        where: { trainerId, name: g.client },
      });

      const notesBlocks = [`[Importado do ClickUp em ${new Date().toISOString().slice(0, 10)}]`];
      for (const c of g.cards) {
        const parts = [`## ${c.name} — etapa ${c.etapa} (${c.clickupStatus})`];
        if (c.ficha.plan) parts.push(`Plano: ${c.ficha.plan}`);
        if (c.ficha.objetivos) parts.push(`Objetivos:\n${c.ficha.objetivos}`);
        if (c.ficha.analise) parts.push(`Análise comportamental:\n${c.ficha.analise}`);
        if (c.pagamentos.length) parts.push(`Pagamentos (ClickUp): ${c.pagamentos.join(" · ")}`);
        if (c.orientacoes.length) parts.push(`Orientações ao dono: ${c.orientacoes.join("\n")}`);
        notesBlocks.push(parts.join("\n"));
      }
      const privateNotes = notesBlocks.join("\n\n").slice(0, 60000);

      if (!client) {
        client = await prisma.clientProfile.create({
          data: {
            trainerId,
            name: g.client,
            phone: g.phone || "",
            plan: g.plan || null,
            status: "Ativo",
            privateNotes,
          },
        });
        cClients++;
      } else {
        await prisma.clientProfile.update({
          where: { id: client.id },
          data: {
            phone: client.phone || g.phone || "",
            plan: client.plan || g.plan || null,
            privateNotes: client.privateNotes
              ? `${client.privateNotes}\n\n${privateNotes}`.slice(0, 60000)
              : privateNotes,
          },
        });
      }

      // cães
      const dogIdByName = new Map();
      for (const d of g.dogs.values()) {
        let dog = await prisma.dog.findFirst({ where: { clientId: client.id, name: d.name } });
        if (!dog) {
          dog = await prisma.dog.create({
            data: {
              clientId: client.id,
              name: d.name,
              breed: d.breed || "",
              age: d.age || "",
              sex: d.sex,
              castrated: !!d.castrated,
              trainingTypes: JSON.stringify([]),
              trainingStatus: g.trainingStatus,
            },
          });
          cDogs++;
        } else {
          await prisma.dog.update({
            where: { id: dog.id },
            data: { trainingStatus: g.trainingStatus },
          });
        }
        dogIdByName.set(d.name.toLowerCase(), dog.id);
      }

      // contratos + sessões (por card, idempotente pelo marcador)
      for (const c of g.cards) {
        const marker = `[clickup:${c.id}]`;
        const existing = await prisma.clientContract.findFirst({
          where: { trainerId, clientId: client.id, notes: { contains: marker } },
        });
        if (existing) {
          skippedCards++;
          continue;
        }
        const cardDogIds = c.dogNames
          .map((n) => dogIdByName.get(n.toLowerCase()))
          .filter(Boolean);
        const contractNotes = [
          c.ficha.plan ? `Plano (ClickUp): ${c.ficha.plan}` : null,
          c.pagamentos.length ? `Pagamentos (ClickUp): ${c.pagamentos.join(" · ")}` : null,
          marker,
        ]
          .filter(Boolean)
          .join("\n");

        // contrato + sessões do card gravados atomicamente: se cair no meio,
        // o card inteiro fica de fora e a re-execução o refaz sem duplicar
        await prisma.$transaction(
          async (tx) => {
            await tx.clientContract.create({
              data: {
                trainerId,
                clientId: client.id,
                dogId: cardDogIds.length === 1 ? cardDogIds[0] : null,
                name: c.name,
                sessionsCount: c.sessionsCount,
                amount: 0,
                startDate: c.startDate,
                status: CONTRACT_STATUS[c.clickupStatus] || "Ativo",
                notes: contractNotes,
              },
            });
            for (const s of c.doneSessions) {
              const session = await tx.trainingSession.create({
                data: {
                  trainerId,
                  title: s.title,
                  date: s.date || c.startDate,
                  status: "Realizado",
                  number: s.number,
                  dogId: cardDogIds.length === 1 ? cardDogIds[0] : null,
                  clientName: g.client,
                  dogName: c.dogNames.join(", "),
                },
              });
              if (cardDogIds.length) {
                await tx.dogTrainingSession.createMany({
                  data: cardDogIds.map((dogId) => ({ sessionId: session.id, dogId })),
                });
              }
            }
          },
          { timeout: 120000, maxWait: 30000 }
        );
        cContracts++;
        cSessions += c.doneSessions.length;
      }
    }

    console.log(
      `OK: +${cClients} clientes, +${cDogs} cães, +${cContracts} contratos, +${cSessions} sessões` +
        (skippedCards ? ` (${skippedCards} cards já importados, pulados)` : "")
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
