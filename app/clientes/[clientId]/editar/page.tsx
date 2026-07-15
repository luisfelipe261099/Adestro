"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { DateField } from "@/components/date-field";
import { useAppStore } from "@/lib/app-store";
import { maskCPF, maskDate, maskPhone } from "@/lib/masks";
import DOG_BREEDS from "@/lib/dog-breeds.json";

// Página COMPLETA de edição do cadastro (cliente + cães) — substitui o antigo
// pop-up, que só cobria nome/telefone e criava dados inconsistentes (idade
// bruta em vez de data de nascimento).

type DogDraft = {
  id?: string;
  name: string;
  breed: string;
  age: string;
  birthDate: string;
  weight: string;
  sex: string;
  castrated: boolean;
  microchip: string;
  color: string;
  dietRestrictions: string;
  healthConditions: string;
  veterinarian: string;
  trainingStatus: string;
};

type ClientDraft = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  cpf: string;
  secondContactName: string;
  secondContactPhone: string;
  plan: string;
  propertyType: string;
  environment: string;
  privateNotes: string;
  status: string;
  dogs: DogDraft[];
};

// Idade legível a partir da data de nascimento ISO (mesma regra do cadastro).
function dogAgeFromBirthDate(iso: string): string {
  if (!iso) return "";
  const birth = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  if (birth.getTime() > now.getTime()) return "";
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0 && remMonths === 0) return "Recém-nascido";
  if (years === 0) return `${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
  if (remMonths === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
}

const inputCls =
  "min-w-0 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-sky-400";
const labelCls = "grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]";

const PHASES = ["Ficha", "Ativo", "Completo", "Pausado", "Cancelado"];

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.clientId as string) ?? "";
  const loadFromDB = useAppStore((s) => s.loadFromDB);

  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Carrega o cadastro completo direto da API (o store guarda só um resumo).
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch("/api/clients", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Falha ao carregar"))))
      .then((list: Array<Record<string, unknown>>) => {
        if (cancelled) return;
        const c = (Array.isArray(list) ? list : []).find((item) => item.id === clientId);
        if (!c) {
          setLoadError("Cliente não encontrado.");
          return;
        }
        const dogs = ((c.dogs as Array<Record<string, unknown>>) ?? []).map((d) => ({
          id: String(d.id),
          name: String(d.name ?? ""),
          breed: String(d.breed ?? ""),
          age: String(d.age ?? ""),
          birthDate: String(d.birthDate ?? ""),
          weight: String(d.weight ?? ""),
          sex: String(d.sex ?? ""),
          castrated: Boolean(d.castrated),
          microchip: String(d.microchip ?? ""),
          color: String(d.color ?? ""),
          dietRestrictions: String(d.dietRestrictions ?? ""),
          healthConditions: String(d.healthConditions ?? ""),
          veterinarian: String(d.veterinarian ?? ""),
          trainingStatus: String(d.trainingStatus ?? "Ativo"),
        }));
        setDraft({
          name: String(c.name ?? ""),
          phone: String(c.phone ?? ""),
          email: String(c.email ?? ""),
          birthDate: String(c.birthDate ?? ""),
          cpf: String(c.cpf ?? ""),
          secondContactName: String(c.secondContactName ?? ""),
          secondContactPhone: String(c.secondContactPhone ?? ""),
          plan: String(c.plan ?? ""),
          propertyType: String(c.propertyType ?? ""),
          environment: String(c.environment ?? ""),
          privateNotes: String(c.privateNotes ?? ""),
          status: String(c.status ?? "Ativo"),
          dogs,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Não foi possível carregar o cadastro. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function patchDog(index: number, patch: Partial<DogDraft>) {
    setDraft((cur) =>
      cur ? { ...cur, dogs: cur.dogs.map((d, i) => (i === index ? { ...d, ...patch } : d)) } : cur,
    );
  }

  async function patchApi(body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch("/api/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return (data as { error?: string } | null)?.error ?? "Não foi possível salvar.";
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    if (!draft.name.trim()) {
      setSaveError("O nome do cliente é obrigatório.");
      return;
    }
    setSaving(true);
    setSaveError("");

    // 1) Dados do cliente
    const err1 = await patchApi({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      birthDate: draft.birthDate.trim(),
      cpf: draft.cpf.trim(),
      secondContactName: draft.secondContactName.trim(),
      secondContactPhone: draft.secondContactPhone.trim(),
      plan: draft.plan.trim(),
      propertyType: draft.propertyType.trim(),
      environment: draft.environment.trim(),
      privateNotes: draft.privateNotes,
      status: draft.status,
    });
    if (err1) {
      setSaveError(err1);
      setSaving(false);
      return;
    }

    // 2) Cada cão: com id = edita; sem id = adiciona
    for (const dog of draft.dogs) {
      if (!dog.name.trim()) continue;
      const err = await patchApi(
        dog.id
          ? {
              dog: {
                id: dog.id,
                name: dog.name.trim(),
                breed: dog.breed.trim(),
                age: dog.age.trim(),
                birthDate: dog.birthDate,
                weight: dog.weight.trim(),
                sex: dog.sex,
                castrated: dog.castrated,
                microchip: dog.microchip.trim(),
                color: dog.color.trim(),
                dietRestrictions: dog.dietRestrictions,
                healthConditions: dog.healthConditions,
                veterinarian: dog.veterinarian.trim(),
                trainingStatus: dog.trainingStatus,
              },
            }
          : { addDog: { name: dog.name.trim(), breed: dog.breed.trim(), age: dog.age.trim() } },
      );
      if (err) {
        setSaveError(err);
        setSaving(false);
        return;
      }
    }

    await loadFromDB();
    router.push(`/clientes/${clientId}`);
  }

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <div className="mb-4">
          <Link
            href={`/clientes/${clientId}`}
            className="text-[12.5px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ‹ Voltar para o cliente
          </Link>
        </div>

        <header className="mb-4">
          <p className="text-eyebrow mb-1.5">Clientes</p>
          <h1 className="text-display">Editar cadastro</h1>
          <p className="mt-1 text-subtitle">
            Cadastro completo do cliente e dos cães — mesmo formato da criação.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando cadastro…</p>
        ) : loadError || !draft ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <p className="text-sm text-[var(--foreground)]">{loadError || "Cliente não encontrado."}</p>
            <Link href="/clientes" className="mt-2 inline-block text-[12.5px] font-medium underline">
              Ver clientes
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Dados do cliente */}
            <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--foreground)]">Dados do cliente</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <label className={`${labelCls} sm:col-span-2`}>
                  Nome completo *
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  WhatsApp
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: maskPhone(e.target.value) })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  E-mail
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Nascimento (DD/MM/AAAA)
                  <input
                    value={draft.birthDate}
                    onChange={(e) => setDraft({ ...draft, birthDate: maskDate(e.target.value) })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  CPF
                  <input
                    value={draft.cpf}
                    onChange={(e) => setDraft({ ...draft, cpf: maskCPF(e.target.value) })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  2º contato — nome
                  <input
                    value={draft.secondContactName}
                    onChange={(e) => setDraft({ ...draft, secondContactName: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  2º contato — WhatsApp
                  <input
                    value={draft.secondContactPhone}
                    onChange={(e) => setDraft({ ...draft, secondContactPhone: maskPhone(e.target.value) })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Plano
                  <input
                    value={draft.plan}
                    onChange={(e) => setDraft({ ...draft, plan: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Tipo de imóvel
                  <input
                    value={draft.propertyType}
                    onChange={(e) => setDraft({ ...draft, propertyType: e.target.value })}
                    placeholder="Casa com quintal, apartamento…"
                    className={inputCls}
                  />
                </label>
                <label className={`${labelCls} sm:col-span-2`}>
                  Ambiente / convivência
                  <input
                    value={draft.environment}
                    onChange={(e) => setDraft({ ...draft, environment: e.target.value })}
                    placeholder="Com quem o cão convive, outros animais…"
                    className={inputCls}
                  />
                </label>
                <label className={`${labelCls} sm:col-span-2`}>
                  Observações confidenciais (só você vê)
                  <textarea
                    value={draft.privateNotes}
                    onChange={(e) => setDraft({ ...draft, privateNotes: e.target.value })}
                    rows={3}
                    className={inputCls}
                  />
                </label>
              </div>
            </section>

            {/* Cães */}
            {draft.dogs.map((dog, index) => (
              <section
                key={dog.id ?? `novo-${index}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[var(--foreground)]">
                    🐕 {dog.name || `Cão ${index + 1}`}
                    {!dog.id ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        novo
                      </span>
                    ) : null}
                  </h2>
                  {!dog.id ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, dogs: draft.dogs.filter((_, i) => i !== index) })
                      }
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <label className={labelCls}>
                    Nome *
                    <input
                      value={dog.name}
                      onChange={(e) => patchDog(index, { name: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Raça
                    <input
                      value={dog.breed}
                      onChange={(e) => patchDog(index, { breed: e.target.value })}
                      list="dog-breeds-edit"
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Nascimento (recalcula a idade)
                    <DateField
                      value={dog.birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const birthDate = e.target.value;
                        const computed = dogAgeFromBirthDate(birthDate);
                        patchDog(index, { birthDate, ...(computed ? { age: computed } : {}) });
                      }}
                      className="w-full min-w-0"
                    />
                  </label>
                  <label className={labelCls}>
                    Idade
                    <input
                      value={dog.age}
                      onChange={(e) => patchDog(index, { age: e.target.value })}
                      placeholder="Preenchida pela data de nascimento"
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Peso
                    <div className="relative">
                      <input
                        value={dog.weight.replace(/\s*kg\s*$/i, "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.,]/g, "");
                          patchDog(index, { weight: raw ? `${raw}kg` : "" });
                        }}
                        inputMode="decimal"
                        placeholder="Ex: 20"
                        className={`${inputCls} pr-9`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-[var(--muted)]">
                        kg
                      </span>
                    </div>
                  </label>
                  <label className={labelCls}>
                    Sexo
                    <select
                      value={dog.sex}
                      onChange={(e) => patchDog(index, { sex: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Não informado</option>
                      <option value="Macho">Macho</option>
                      <option value="Fêmea">Fêmea</option>
                    </select>
                  </label>
                  <label className={labelCls}>
                    Cor / pelagem
                    <input
                      value={dog.color}
                      onChange={(e) => patchDog(index, { color: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Microchip
                    <input
                      value={dog.microchip}
                      onChange={(e) => patchDog(index, { microchip: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Fase no quadro
                    <select
                      value={dog.trainingStatus}
                      onChange={(e) => patchDog(index, { trainingStatus: e.target.value })}
                      className={inputCls}
                    >
                      {PHASES.map((phase) => (
                        <option key={phase} value={phase}>
                          {phase}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`${labelCls} items-start`}>
                    Castrado
                    <span className="flex h-[34px] items-center gap-2 text-xs font-medium normal-case text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={dog.castrated}
                        onChange={(e) => patchDog(index, { castrated: e.target.checked })}
                        className="h-4 w-4"
                      />
                      {dog.castrated ? "Sim" : "Não"}
                    </span>
                  </label>
                  <label className={`${labelCls} sm:col-span-2`}>
                    Restrições alimentares
                    <input
                      value={dog.dietRestrictions}
                      onChange={(e) => patchDog(index, { dietRestrictions: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={`${labelCls} sm:col-span-2`}>
                    Condições de saúde
                    <input
                      value={dog.healthConditions}
                      onChange={(e) => patchDog(index, { healthConditions: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className={`${labelCls} sm:col-span-2`}>
                    Veterinário (nome + telefone)
                    <input
                      value={dog.veterinarian}
                      onChange={(e) => patchDog(index, { veterinarian: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>
              </section>
            ))}

            <datalist id="dog-breeds-edit">
              {DOG_BREEDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>

            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  dogs: [
                    ...draft.dogs,
                    {
                      name: "",
                      breed: "",
                      age: "",
                      birthDate: "",
                      weight: "",
                      sex: "",
                      castrated: false,
                      microchip: "",
                      color: "",
                      dietRestrictions: "",
                      healthConditions: "",
                      veterinarian: "",
                      trainingStatus: "Ativo",
                    },
                  ],
                })
              }
              className="btn-secondary text-[12px]"
            >
              + Adicionar outro cão
            </button>

            {saveError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {saveError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-[13px] disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
              <Link href={`/clientes/${clientId}`} className="btn-secondary text-[13px]">
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </main>
    </AuthGuard>
  );
}
