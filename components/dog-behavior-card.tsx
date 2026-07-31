"use client";

// Mostra ao adestrador o que o tutor respondeu no formulário de convite.
//
// Existe porque coletar sem exibir é pior que não coletar: foi o que aconteceu
// com routine.sleep/walks/plays, que viajavam no payload do onboarding e nunca
// chegavam a nenhuma tela.

type Json = Record<string, unknown>;

function parse(raw: string | null | undefined): Json {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
  } catch {
    return {};
  }
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const list = (v: unknown) => (Array.isArray(v) && v.length ? (v as string[]).join(", ") : null);

// Perguntas que mudam como o adestrador se aproxima na primeira aula. Vão para
// o topo, e não na ordem em que foram perguntadas.
const RISCO = new Set([
  "Histórico de mordida",
  "Proteção de recursos",
  "Aceita manipulação",
  "Com crianças",
]);

export function DogBehaviorCard({
  dog,
}: {
  dog: {
    name?: string;
    preventiveCare?: string | null;
    temperament?: string | null;
    routine?: string | null;
    environmentalAnalysis?: string | null;
  };
}) {
  const temperament = parse(dog.temperament);
  const routine = parse(dog.routine);
  const env = parse(dog.environmentalAnalysis);

  const rows = [
    { label: "Vacinação/antipulgas", value: text(dog.preventiveCare) },
    { label: "Energia", value: text(temperament.energy) },
    { label: "Com pessoas", value: text(temperament.social) },
    { label: "Com outros cães", value: text(temperament.dogs) },
    { label: "Com crianças", value: text(temperament.children) },
    { label: "Barulhos fortes", value: list(temperament.noise) },
    { label: "Histórico de mordida", value: text(temperament.biteHistory) },
    { label: "Proteção de recursos", value: text(temperament.resourceGuarding) },
    { label: "Aceita manipulação", value: text(temperament.handling) },
    { label: "Comportamentos indesejados", value: list(temperament.unwantedBehaviors) },
    { label: "Observações", value: text(temperament.behavior) },
    { label: "Alimentação", value: text(routine.alimentation) },
    { label: "Passeios", value: text(routine.walks) },
    { label: "Brincadeiras", value: text(routine.plays) },
    { label: "Sono", value: text(routine.sleep) },
    { label: "Tempo sozinho", value: text(env.aloneTime) },
    { label: "Já foi adestrado", value: text(env.history) },
  ].filter((row): row is { label: string; value: string } => !!row.value);

  if (!rows.length) return null;

  const ordenadas = [...rows].sort(
    (a, b) => Number(RISCO.has(b.label)) - Number(RISCO.has(a.label)),
  );

  return (
    <section className="mt-3 rounded-lg border border-[var(--border)] p-3">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Comportamento e rotina{dog.name ? ` · ${dog.name}` : ""}
      </h3>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {ordenadas.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,9rem)_1fr] gap-2 py-1.5 text-[12.5px]"
          >
            <span className={RISCO.has(row.label) ? "font-semibold" : "text-[var(--muted)]"}>
              {row.label}
            </span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
