// Verificações das regras de tarefas recorrentes do portal e do PDF do recibo.
// Rodar: npm run check:tasks
import assert from "node:assert/strict";

import {
  applyTaskToggle,
  isTaskCompletedToday,
  isTaskDueToday,
  localDateKey,
  parseCompletions,
  parseWeekdays,
  serializeTaskForToday,
} from "../lib/portal-tasks-shared.ts";
import { buildReceiptPdf, receiptPdfFileName } from "../lib/receipt-pdf.ts";

// Terça-feira, 28/07/2026 (getDay() === 2)
const HOJE = new Date(2026, 6, 28, 10, 0, 0);
const HOJE_KEY = "2026-07-28";
const ONTEM_KEY = "2026-07-27";

let pass = 0;
const t = (name: string, fn: () => void | Promise<void>) => {
  try {
    const result = fn();
    if (result instanceof Promise) return result.then(() => { pass++; console.log("  ok  ", name); }).catch((err) => { console.log("  FALHA", name, "\n       ", (err as Error).message.split("\n")[0]); process.exitCode = 1; });
    pass++;
    console.log("  ok  ", name);
  } catch (err) {
    console.log("  FALHA", name, "\n       ", (err as Error).message.split("\n")[0]);
    process.exitCode = 1;
  }
  return Promise.resolve();
};

const daily = (completions: string[], completed = false) => ({
  completed,
  recurrence: "daily",
  weekdays: null,
  completions: JSON.stringify(completions),
});

console.log("\nlocalDateKey / parsers");
await t("localDateKey usa hora local com zero à esquerda", () => {
  assert.equal(localDateKey(HOJE), HOJE_KEY);
  assert.equal(localDateKey(new Date(2026, 0, 5)), "2026-01-05");
});
await t("parseCompletions tolera JSON inválido e nulo", () => {
  assert.deepEqual(parseCompletions(null), []);
  assert.deepEqual(parseCompletions("{quebrado"), []);
  assert.deepEqual(parseCompletions('["2026-07-27"]'), ["2026-07-27"]);
});
await t("parseWeekdays filtra valores fora de 0..6", () => {
  assert.deepEqual(parseWeekdays("[0,2,9,-1]"), [0, 2]);
});

console.log("\nisTaskCompletedToday — o bug central do documento");
await t("tarefa diária concluída ONTEM não aparece concluída hoje", () => {
  assert.equal(isTaskCompletedToday(daily([ONTEM_KEY], true), HOJE), false);
});
await t("tarefa diária concluída HOJE aparece concluída", () => {
  assert.equal(isTaskCompletedToday(daily([ONTEM_KEY, HOJE_KEY]), HOJE), true);
});
await t("tarefa 'once' continua usando o flag salvo", () => {
  assert.equal(isTaskCompletedToday({ completed: true, recurrence: "once" }, HOJE), true);
  assert.equal(isTaskCompletedToday({ completed: false, recurrence: null }, HOJE), false);
});

console.log("\nisTaskDueToday");
await t("diária e 'once' valem todo dia", () => {
  assert.equal(isTaskDueToday({ recurrence: "daily" }, HOJE), true);
  assert.equal(isTaskDueToday({ recurrence: "once" }, HOJE), true);
});
await t("semanal só vale nos dias marcados (terça = 2)", () => {
  assert.equal(isTaskDueToday({ recurrence: "weekly", weekdays: "[2,4]" }, HOJE), true);
  assert.equal(isTaskDueToday({ recurrence: "weekly", weekdays: "[1,3]" }, HOJE), false);
});
await t("semanal sem dias marcados vale todo dia (fallback)", () => {
  assert.equal(isTaskDueToday({ recurrence: "weekly", weekdays: "[]" }, HOJE), true);
});

console.log("\napplyTaskToggle");
await t("concluir hoje adiciona a data e marca completed", () => {
  const result = applyTaskToggle(daily([ONTEM_KEY]), true, HOJE);
  assert.equal(result.completed, true);
  assert.deepEqual(JSON.parse(result.completions ?? "[]"), [ONTEM_KEY, HOJE_KEY]);
});
await t("desmarcar hoje remove só a data de hoje", () => {
  const result = applyTaskToggle(daily([ONTEM_KEY, HOJE_KEY]), false, HOJE);
  assert.equal(result.completed, false);
  assert.deepEqual(JSON.parse(result.completions ?? "[]"), [ONTEM_KEY]);
});
await t("concluir duas vezes no dia não duplica a data", () => {
  const once = applyTaskToggle(daily([HOJE_KEY]), true, HOJE);
  assert.deepEqual(JSON.parse(once.completions ?? "[]"), [HOJE_KEY]);
});
await t("histórico é limitado a 180 dias", () => {
  const muitos = Array.from({ length: 200 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, "0")}`);
  const result = applyTaskToggle(daily(muitos), true, HOJE);
  assert.equal(JSON.parse(result.completions ?? "[]").length, 180);
});
await t("'once' não mexe no histórico", () => {
  const result = applyTaskToggle({ completed: false, recurrence: "once", completions: "[]" }, true, HOJE);
  assert.equal(result.completed, true);
  assert.equal(result.completions, "[]");
});

console.log("\nserializeTaskForToday (contrato da API)");
await t("deriva completed por dia e expõe isDueToday", () => {
  const out = serializeTaskForToday(daily([ONTEM_KEY], true), HOJE);
  assert.equal(out.completed, false);
  assert.equal(out.isDueToday, true);
});
await t("semanal fora do dia vem isDueToday=false", () => {
  const out = serializeTaskForToday(
    { completed: false, recurrence: "weekly", weekdays: "[1]", completions: "[]" },
    HOJE,
  );
  assert.equal(out.isDueToday, false);
});

console.log("\nRecibo em PDF");
await t("nome do arquivo sem acentos e com número padded", () => {
  assert.equal(receiptPdfFileName(3, "João da Silva"), "recibo-0003-joao-da-silva.pdf");
  assert.equal(receiptPdfFileName(42, ""), "recibo-0042.pdf");
});
await t("gera bytes de PDF válidos (%PDF) com assinatura embutida", async () => {
  // PNG 1x1 transparente
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const bytes = await buildReceiptPdf({
    number: 1,
    clientName: "Ana Souza",
    dogName: "Bolt",
    service: "Pacote 8 aulas — adestramento comportamental",
    amount: "350,00",
    method: "Pix",
    dateLabel: "28/07/2026",
    businessName: "Adestra Pet",
    businessDocument: "12.345.678/0001-90",
    trainerName: "Luís Felipe",
    signatureUrl: png,
    logoUrl: png,
  });
  const header = String.fromCharCode(...bytes.slice(0, 5));
  assert.equal(header, "%PDF-");
  assert.ok(bytes.length > 1000, `PDF muito pequeno: ${bytes.length} bytes`);
});
await t("assinatura em formato não suportado não derruba a geração", async () => {
  const bytes = await buildReceiptPdf({
    number: 2,
    clientName: "Ana",
    dogName: "Bolt",
    service: "Aula avulsa",
    amount: "80,00",
    method: "Dinheiro",
    dateLabel: "28/07/2026",
    signatureUrl: "data:image/webp;base64,AAAA",
  });
  assert.equal(String.fromCharCode(...bytes.slice(0, 5)), "%PDF-");
});

console.log(`\n${pass} verificações passaram.`);
