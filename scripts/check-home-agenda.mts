import assert from "node:assert/strict";
import {
  eventsInWeek,
  eventsOnDay,
  isCancelled,
  pickNextSession,
  relativeDayLabel,
  resolveEventDate,
  listUpcomingSessions,
  computeDogAttention,
} from "../lib/home-agenda.ts";

const NOW = new Date(2026, 6, 28, 10, 0, 0); // terça, 28/07/2026 10:00
const nowMs = NOW.getTime();

const ev = (over: Record<string, unknown> = {}) =>
  ({
    id: "e1",
    day: "2026-07-28",
    time: "14:00",
    dog: "Bolt",
    client: "Ana",
    plan: "Pacote 8 aulas",
    sessionNumber: 1,
    status: "Confirmado",
    ...over,
  }) as never;

let pass = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    pass++;
    console.log("  ok  ", name);
  } catch (err) {
    console.log("  FALHA", name, "\n       ", (err as Error).message.split("\n")[0]);
    process.exitCode = 1;
  }
};

console.log("\n— parsing de datas —");
t("ISO passa direto", () => assert.equal(resolveEventDate("2026-07-28", NOW), "2026-07-28"));
t("dd/mm/yyyy converte", () => assert.equal(resolveEventDate("28/07/2026", NOW), "2026-07-28"));
t("d/m/yyyy sem zero converte", () => assert.equal(resolveEventDate("1/8/2026", NOW), "2026-08-01"));
t("dia da semana COM acento resolve", () => assert.equal(resolveEventDate("Sábado", NOW), "2026-08-01"));
t("dia da semana SEM acento resolve (dados de seed)", () =>
  assert.equal(resolveEventDate("Sabado", NOW), "2026-08-01"));
t("lixo devolve null (não vira aula fantasma de hoje)", () =>
  assert.equal(resolveEventDate("qualquer coisa", NOW), null));
t("string vazia devolve null", () => assert.equal(resolveEventDate("", NOW), null));

console.log("\n— cancelamento —");
t("Cancelado é cancelado", () => assert.equal(isCancelled("Cancelado"), true));
t("Confirmado não é", () => assert.equal(isCancelled("Confirmado"), false));

console.log("\n— a queixa (a): card dizia 3, quadro dizia 0 —");
t("aulas canceladas NÃO contam no dia", () => {
  const events = [
    ev({ id: "a", status: "Cancelado" }),
    ev({ id: "b", status: "Cancelado" }),
    ev({ id: "c", status: "Cancelado" }),
  ];
  assert.equal(eventsOnDay(events, NOW, NOW).length, 0);
});
t("aulas ativas contam e vêm ordenadas por horário", () => {
  const events = [
    ev({ id: "a", time: "16:00" }),
    ev({ id: "b", time: "09:00" }),
    ev({ id: "c", time: "14:00", status: "Cancelado" }),
  ];
  const result = eventsOnDay(events, NOW, NOW);
  assert.deepEqual(result.map((e) => e.time), ["09:00", "16:00"]);
});

console.log("\n— a queixa (b): semana mostrava 5 com 2 agendadas —");
t("conta só a semana corrente, não o histórico inteiro", () => {
  const events = [
    ev({ id: "a", day: "2026-07-27" }), // segunda desta semana
    ev({ id: "b", day: "2026-07-30" }), // quinta desta semana
    ev({ id: "c", day: "2026-01-15" }), // janeiro — fora
    ev({ id: "d", day: "2026-12-01" }), // dezembro — fora
    ev({ id: "e", day: "2026-07-29", status: "Cancelado" }), // cancelada — fora
  ];
  assert.equal(eventsInWeek(events, NOW).length, 2);
});

console.log("\n— a queixa (1a): próxima sessão elegia aula cancelada —");
t("pula a cancelada mais próxima e pega a próxima ativa", () => {
  const events = [
    ev({ id: "cancelada", time: "11:00", status: "Cancelado" }),
    ev({ id: "valida", time: "15:00" }),
  ];
  assert.equal(pickNextSession(events, nowMs)?.id, "valida");
});
t("aula iniciada há 30min ainda é 'a próxima'", () => {
  const events = [ev({ id: "emAndamento", time: "09:30" })];
  assert.equal(pickNextSession(events, nowMs)?.id, "emAndamento");
});
t("aula de 3h atrás já não é", () => {
  const events = [ev({ id: "velha", time: "07:00" })];
  assert.equal(pickNextSession(events, nowMs), null);
});

console.log("\n— a queixa (i): lista de próximas aulas —");
t("ordem crescente de data e hora, dentro de 7 dias", () => {
  const events = [
    ev({ id: "d3", day: "2026-07-30", time: "08:00" }),
    ev({ id: "d1", day: "2026-07-28", time: "14:00" }),
    ev({ id: "d2", day: "2026-07-29", time: "09:00" }),
    ev({ id: "fora", day: "2026-09-10", time: "09:00" }),
  ];
  const result = listUpcomingSessions(events, nowMs, { withinDays: 7 });
  assert.deepEqual(result.map((r) => r.event.id), ["d1", "d2", "d3"]);
});

console.log("\n— rótulos de dia —");
t("hoje", () => assert.equal(relativeDayLabel("2026-07-28", NOW), "Hoje"));
t("amanhã", () => assert.equal(relativeDayLabel("2026-07-29", NOW), "Amanhã"));
t("dia da semana dentro de 7 dias", () => assert.equal(relativeDayLabel("2026-07-31", NOW), "Sexta"));
t("data absoluta além de 7 dias", () => assert.equal(relativeDayLabel("2026-09-10", NOW), "10/09"));

console.log("\n— a queixa (g): Foco nos cães, janela de 7 dias —");
const client = (over: Record<string, unknown> = {}) =>
  ({
    id: "c1",
    name: "Ana",
    phone: "",
    propertyType: "",
    environment: "",
    plan: "Pacote 8 aulas",
    status: "Ativo",
    dogs: [{ id: "d1", name: "Bolt", breed: "", age: "", weight: "", trainingTypes: [] }],
    ...over,
  }) as never;

t("sem aula nos próximos 7 dias → amarelo", () => {
  const result = computeDogAttention([client()], [], [], nowMs);
  assert.equal(result[0].level, "amber");
});
t("com aula marcada e sem atraso → verde", () => {
  const result = computeDogAttention([client()], [ev({ dogId: "d1", time: "15:00" })], [], nowMs);
  assert.equal(result[0].level, "green");
});
t("aula de ontem sem treino registrado → vermelho", () => {
  const result = computeDogAttention(
    [client()],
    [ev({ dogId: "d1", day: "2026-07-27", time: "09:00" })],
    [],
    nowMs,
  );
  assert.equal(result[0].level, "red");
});
t("cão de TURMA coletiva conta pelos participantes (não fica amarelo eterno)", () => {
  const turma = ev({
    id: "turma",
    dogId: undefined,
    clientId: undefined,
    dog: "Turma da tarde",
    client: "Coletivo",
    time: "15:00",
    participantDogIds: ["d1"],
  });
  const result = computeDogAttention([client()], [turma], [], nowMs);
  assert.equal(result[0].level, "green");
});
t("cão homônimo de OUTRO cliente não herda a agenda", () => {
  const outro = ev({ id: "x", dogId: undefined, clientId: "c2", dog: "Bolt", time: "15:00" });
  const result = computeDogAttention([client()], [outro], [], nowMs);
  assert.equal(result[0].level, "amber");
});
const completedDog = client({
  dogs: [{ id: "d1", name: "Bolt", breed: "", age: "", weight: "", trainingTypes: [], trainingStatus: "Completo" }],
});
t("cão Completo sai do radar da home (includeInactive: false)", () =>
  assert.equal(computeDogAttention([completedDog], [], [], nowMs, { includeInactive: false }).length, 0));
t("cão Completo CONTINUA no kanban de clientes (padrão)", () =>
  assert.equal(computeDogAttention([completedDog], [], [], nowMs).length, 1));
const pausedDog = client({
  dogs: [{ id: "d1", name: "Bolt", breed: "", age: "", weight: "", trainingTypes: [], trainingStatus: "Pausado" }],
});
t("cão Pausado não vira alerta na home (pausar É a decisão de não agendar)", () =>
  assert.equal(computeDogAttention([pausedDog], [], [], nowMs, { includeInactive: false }).length, 0));
t("cão Pausado CONTINUA no kanban (tem coluna própria)", () =>
  assert.equal(computeDogAttention([pausedDog], [], [], nowMs).length, 1));
t("card leva ao perfil do cão", () => {
  const result = computeDogAttention([client()], [], [], nowMs);
  assert.equal(result[0].href, "/caes/d1");
});

// ── Rótulos das telas de Clientes ───────────────────────────────────────────
const labels = await import("../lib/labels.ts");

console.log("\n— queixas da página Clientes —");
t("plural: 1 cão (não 'cão(ões)')", () => assert.equal(labels.dogCountLabel(1), "1 cão"));
t("plural: 3 cães", () => assert.equal(labels.dogCountLabel(3), "3 cães"));
t("plural: nenhum cão", () => assert.equal(labels.dogCountLabel(0), "Nenhum cão"));
t("plano não vira 'Plano Plano Pro'", () =>
  assert.equal(labels.planLabel("Plano Pro - 8 aulas"), "Plano Pro - 8 aulas"));
t("plano sem prefixo ganha 'Plano'", () => assert.equal(labels.planLabel("Pro"), "Plano Pro"));
t("sem plano cai no padrão", () => assert.equal(labels.planLabel(""), "Plano personalizado"));
t("pacote: 4/8 aulas", () => assert.equal(labels.packageProgressLabel(4, 8), "4/8 aulas"));
t("sem pacote não inventa denominador", () => assert.equal(labels.packageProgressLabel(4, 0), null));
t("passou do pacote é sinalizado", () => assert.equal(labels.isOverPackage(14, 8), true));
t("dentro do pacote não alarma", () => assert.equal(labels.isOverPackage(8, 8), false));

console.log("\n— plurais escritos por extenso (a queixa 'cão(ões)') —");
t("plural: 1 cliente", () => assert.equal(labels.plural(1, "cliente", "clientes"), "1 cliente"));
t("plural: 3 clientes (não 'clientees')", () =>
  assert.equal(labels.plural(3, "cliente", "clientes"), "3 clientes"));
t("plural: 3 cães (não 'cãoes')", () => assert.equal(labels.dogCountLabel(3), "3 cães"));
t("plural: 1 aula a confirmar", () =>
  assert.equal(labels.plural(1, "aula a confirmar", "aulas a confirmar"), "1 aula a confirmar"));
t("plural: 0 usa a forma plural", () =>
  assert.equal(labels.plural(0, "treino sem registro", "treinos sem registro"), "0 treinos sem registro"));

console.log(`\n${pass} verificações passaram.\n`);
