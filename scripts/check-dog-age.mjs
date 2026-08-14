// Verificação da idade completa do cão (pedido do adestrador).
import assert from "node:assert/strict";
import { formatDogAge, formatDogAgeShort, getDogAgeParts, isPuppy } from "../lib/dog-age.ts";

const hoje = new Date(2026, 7, 14); // 14/08/2026

assert.equal(formatDogAge("2024-11-18", null, hoje), "1 ano, 8 meses e 27 dias");
assert.equal(formatDogAge("2026-06-01", null, hoje), "2 meses e 13 dias");
assert.equal(formatDogAge("2026-08-10", null, hoje), "4 dias");
assert.equal(formatDogAge("2026-08-14", null, hoje), "0 dias");
assert.equal(formatDogAge("2023-08-14", null, hoje), "3 anos");
assert.equal(formatDogAge("14/08/2025", null, hoje), "1 ano");

// empréstimo com o tamanho real do mês anterior (março puxa de fevereiro)
assert.deepEqual(getDogAgeParts("2026-01-30", new Date(2026, 2, 1)), { years: 0, months: 1, days: 1, totalDays: 30 });

// sem data de nascimento cai no texto antigo; sem nada, string vazia
assert.equal(formatDogAge(null, "2 anos aprox."), "2 anos aprox.");
assert.equal(formatDogAge(null, null), "");
assert.equal(formatDogAge("data ruim", "1 ano"), "1 ano");

// data no futuro não vira idade negativa
assert.equal(formatDogAge("2027-01-01", "sem idade", hoje), "sem idade");

assert.equal(formatDogAgeShort("2024-11-18", null, hoje), "1a 8m");
assert.equal(formatDogAgeShort("2026-06-01", null, hoje), "2 meses");
assert.equal(isPuppy("2026-06-01", hoje), true);
assert.equal(isPuppy("2024-11-18", hoje), false);

console.log("OK idade do cão");
