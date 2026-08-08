import assert from "node:assert/strict";

import {
  EXERCISE_TREE,
  EXERCISE_TREE_TOTALS,
  averageRating,
  customExerciseKey,
  findCatalogExercise,
  flattenCatalog,
  groupExercisesByCategory,
  legacyToSessionExercises,
  parseSessionExercises,
  sessionExercisesFromParsed,
  sessionExercisesOf,
  slugifyExercise,
  summarizeExercisesByCategory,
  toLegacyCommands,
  toSessionExercise,
  type SessionExercise,
} from "../lib/exercise-tree.ts";

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

const flat = flattenCatalog();

console.log("\n— árvore Categoria > Área > Exercício —");
t("5 categorias na ordem combinada", () =>
  assert.deepEqual(
    EXERCISE_TREE.map((c) => c.name),
    ["Fundamentos", "Obediência", "Socialização", "Comportamento", "Manejo & Rotina"],
  ));
t("toda categoria tem pelo menos uma área", () =>
  assert.equal(EXERCISE_TREE.every((c) => c.areas.length > 0), true));
t("toda área tem pelo menos um exercício", () =>
  assert.equal(EXERCISE_TREE.every((c) => c.areas.every((a) => a.exercises.length > 0)), true));
t("totais batem com a árvore", () => {
  assert.equal(EXERCISE_TREE_TOTALS.categories, EXERCISE_TREE.length);
  assert.equal(
    EXERCISE_TREE_TOTALS.areas,
    EXERCISE_TREE.reduce((sum, c) => sum + c.areas.length, 0),
  );
  assert.equal(EXERCISE_TREE_TOTALS.exercises, flat.length);
});
t("chave de exercício é única (nomes repetem entre áreas)", () => {
  const keys = flat.map((item) => item.exercise.key);
  assert.equal(new Set(keys).size, keys.length);
});
t("nome repetido em áreas diferentes não colide", () => {
  // "Sons" existe em Socialização > Estímulos e em Comportamento > Medos.
  const sons = flat.filter((item) => item.exercise.name === "Sons");
  assert.equal(sons.length, 2);
  assert.notEqual(sons[0].exercise.key, sons[1].exercise.key);
  assert.deepEqual(sons.map((item) => item.category.name), ["Socialização", "Comportamento"]);
});
t("chave carrega categoria e área", () =>
  assert.equal(findCatalogExercise("obediencia.chamado.recall")?.area.name, "Chamado"));
t("acentos viram slug estável", () => {
  assert.equal(slugifyExercise("Ignorar distrações"), "ignorar-distracoes");
  assert.equal(slugifyExercise("Habituação à focinheira"), "habituacao-a-focinheira");
  assert.equal(slugifyExercise("Caixa de transporte / Toca"), "caixa-de-transporte-toca");
});
t("'+ Outro' gera chave dentro da área", () =>
  assert.equal(customExerciseKey("manejo.rotina", "Subir na cama"), "manejo.rotina.custom-subir-na-cama"));

console.log("\n— avaliação fica no exercício (3º nível) —");
const recall = findCatalogExercise("obediencia.chamado.recall")!;
const senta = findCatalogExercise("obediencia.posicoes.senta")!;
const focinheira = findCatalogExercise("manejo.equipamentos.habituacao-a-focinheira")!;

t("marcar exercício copia o caminho da árvore", () => {
  const marked = toSessionExercise(recall, 5, "voltou de primeira");
  assert.equal(marked.categoryName, "Obediência");
  assert.equal(marked.areaName, "Chamado");
  assert.equal(marked.rating, 5);
});
t("nota fora de 1-5 é normalizada na leitura", () => {
  const parsed = parseSessionExercises([{ ...toSessionExercise(recall), rating: 9 }]);
  assert.equal(parsed[0].rating, 5);
});
t("item sem nome é descartado", () =>
  assert.equal(parseSessionExercises([{ key: "x", name: "" }]).length, 0));

console.log("\n— relatório agrupado por categoria —");
const marcados: SessionExercise[] = [
  toSessionExercise(recall, 5),
  toSessionExercise(senta, 3),
  toSessionExercise(focinheira, 2),
];

t("agrupa por categoria na ordem da árvore", () =>
  assert.deepEqual(
    groupExercisesByCategory(marcados).map((g) => g.categoryName),
    ["Obediência", "Manejo & Rotina"],
  ));
t("média da categoria usa só os exercícios dela", () => {
  const [obediencia, manejo] = groupExercisesByCategory(marcados);
  assert.equal(obediencia.average, 4); // (5 + 3) / 2
  assert.equal(manejo.average, 2);
});
t("média geral da sessão", () => assert.equal(averageRating(marcados), 3.3));
t("resumo junta repetições do mesmo exercício", () => {
  const summary = summarizeExercisesByCategory([
    toSessionExercise(recall, 5),
    toSessionExercise(recall, 3),
  ]);
  assert.equal(summary[0].exercises[0].count, 2);
  assert.equal(summary[0].exercises[0].average, 4);
});
t("sem exercício marcado, sem grupo", () => assert.equal(groupExercisesByCategory([]).length, 0));

console.log("\n— compatibilidade com os registros antigos —");
t("comando antigo casa com o exercício do catálogo", () => {
  const [item] = legacyToSessionExercises(undefined, [{ command: "Senta", rating: 4, notes: "ok" }]);
  assert.equal(item.key, senta.exercise.key);
  assert.equal(item.categoryName, "Obediência");
  assert.equal(item.rating, 4);
});
t("comando desconhecido vira item avulso, não some", () => {
  const [item] = legacyToSessionExercises(undefined, [{ command: "Cambalhota", rating: 3 }]);
  assert.equal(item.categoryName, "Registros anteriores");
  assert.equal(item.name, "Cambalhota");
});
t("atividade concluída vale 4 estrelas; pendente, 2", () => {
  const items = legacyToSessionExercises(
    [{ name: "Aquecimento", completed: true }, { name: "Descanso", completed: false }],
    undefined,
  );
  assert.equal(items[0].rating, 4);
  assert.equal(items[1].rating, 2);
});
t("mesmo item não duplica entre comandos e atividades", () => {
  const items = legacyToSessionExercises(
    [{ name: "Senta", completed: true }],
    [{ command: "Senta", rating: 5 }],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].rating, 5); // o comando (com estrela real) ganha
});
t("registro novo do banco lê 'exercises' e ignora a projeção", () => {
  const items = sessionExercisesOf({
    exercises: JSON.stringify([toSessionExercise(recall, 5)]),
    commands: JSON.stringify([{ command: "Senta", rating: 1 }]),
    activities: "[]",
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Recall");
});
t("registro antigo do banco cai na conversão", () => {
  const items = sessionExercisesOf({
    exercises: null,
    commands: JSON.stringify([{ command: "Senta", rating: 2 }]),
    activities: "[]",
  });
  assert.equal(items[0].name, "Senta");
});
t("JSON quebrado não derruba o relatório", () =>
  assert.deepEqual(sessionExercisesOf({ exercises: "{{{", commands: null, activities: null }), []));
t("registro já desserializado (store do app) usa o mesmo caminho", () => {
  const items = sessionExercisesFromParsed({ commands: [{ command: "Fica", rating: 3 }] });
  assert.equal(items[0].areaName, "Permanência");
});
t("projeção para 'commands' mantém nome e nota", () =>
  assert.deepEqual(toLegacyCommands([toSessionExercise(senta, 4, "firme")]), [
    { command: "Senta", rating: 4, notes: "firme" },
  ]));

console.log(`\n${pass} verificações passaram.\n`);
