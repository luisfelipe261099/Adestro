"use client";

import { useEffect, useMemo, useState } from "react";

type Permission = "admin" | "standard" | "viewer";

const PERMISSION_LABELS: Record<Permission, string> = {
  admin: "Admin",
  standard: "Padrão",
  viewer: "Só-visualização",
};

type TrainerRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  status: "Ativo" | "Trial";
  planType: "Trial" | "Starter" | "Pro" | "Business";
  permission: Permission;
  monthlyValue: number;
};

export function AdestradoresClient() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPlan, setFormPlan] = useState<"Trial" | "Starter" | "Pro" | "Business">("Starter");
  const [formStatus, setFormStatus] = useState<"Ativo" | "Trial">("Ativo");
  const [formPermission, setFormPermission] = useState<Permission>("standard");
  const [message, setMessage] = useState("");
  // Senha temporária retornada ao criar — exibida uma vez para repassar.
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  async function loadTrainers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trainers");
      if (!res.ok) return;
      const data = (await res.json()) as TrainerRow[];
      setTrainers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrainers();
  }, []);

  const filteredTrainers = useMemo(
    () => (filter === "todos" ? trainers : trainers.filter((t) => t.status === filter)),
    [filter, trainers],
  );

  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPlan("Starter");
    setFormStatus("Ativo");
    setFormPermission("standard");
    setEditingId(null);
    setIsCreating(false);
  }

  function startCreate() {
    resetForm();
    setIsCreating(true);
  }

  function startEdit(id: string) {
    const trainer = trainers.find((item) => item.id === id);
    if (!trainer) return;
    setEditingId(id);
    setIsCreating(false);
    setFormName(trainer.name);
    setFormEmail(trainer.email);
    setFormPlan(trainer.planType);
    setFormStatus(trainer.status);
    setFormPermission(trainer.permission ?? "standard");
  }

  async function saveTrainer() {
    if (!formName.trim() || !formEmail.trim()) return;

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: formName.trim(),
      email: formEmail.trim(),
      planType: formPlan,
      status: formStatus,
      permission: formPermission,
    };

    const response = await fetch("/api/admin/trainers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage("Não foi possível salvar o adestrador.");
      return;
    }

    if (!editingId) {
      const data = (await response.json()) as { tempPassword?: string };
      if (data.tempPassword) setTempPassword({ email: formEmail.trim().toLowerCase(), password: data.tempPassword });
    }
    setMessage(editingId ? "Adestrador atualizado." : "Adestrador criado.");
    await loadTrainers();
    resetForm();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-md border border-[var(--border)] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Fluxo simples</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          1) Filtre por status, 2) abra Novo adestrador ou Editar, 3) salve. Cada conta nova recebe uma
          senha temporária aleatória, exibida uma única vez para você repassar ao adestrador.
        </p>
      </section>

      {tempPassword ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Senha temporária gerada</p>
          <p className="mt-1 text-xs text-amber-800">
            Repasse ao adestrador <span className="font-semibold">{tempPassword.email}</span>. Ela não será
            exibida de novo. Peça para trocá-la no primeiro acesso.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 text-sm font-bold text-slate-900 border border-amber-200">
              {tempPassword.password}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(tempPassword.password)}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setTempPassword(null)}
              className="text-xs font-semibold text-amber-700 underline"
            >
              Ocultar
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { value: "todos", label: "Todos" },
            { value: "Ativo", label: "Ativos" },
              { value: "Trial", label: "Trial" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition border ${
                filter === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-700 bg-white text-slate-900 font-bold"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-sky-600 px-6 py-3 text-base font-bold text-white hover:bg-sky-700"
        >
          + Novo Adestrador
        </button>
      </div>

      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Carregando adestradores...</p> : null}

      {(isCreating || editingId) ? (
        <div className="rounded-md border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">
                {editingId ? "Editar adestrador" : "Novo adestrador"}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Edite dados comerciais e status de assinatura sem perder contexto.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="Nome do adestrador"
              className="rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
            />
            <input
              value={formEmail}
              onChange={(event) => setFormEmail(event.target.value)}
              placeholder="Email"
              className="rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
            />
            <select
              value={formPlan}
              onChange={(event) => setFormPlan(event.target.value as "Trial" | "Starter" | "Pro" | "Business")}
              className="rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
            >
              <option>Trial</option>
              <option>Starter</option>
              <option>Pro</option>
              <option>Business</option>
            </select>
            <select
              value={formStatus}
              onChange={(event) => setFormStatus(event.target.value as "Ativo" | "Trial")}
              className="rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
            >
              <option>Ativo</option>
              <option>Trial</option>
            </select>
            <label className="grid gap-1 text-xs font-semibold text-[var(--muted)] md:col-span-2">
              Permissão
              <select
                value={formPermission}
                onChange={(event) => setFormPermission(event.target.value as Permission)}
                className="rounded-md border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-sky-400"
              >
                <option value="admin">Admin — acesso total</option>
                <option value="standard">Padrão — opera clientes e treinos</option>
                <option value="viewer">Só-visualização — apenas leitura</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={saveTrainer}
            className="pc-primary-action mt-4 rounded-full px-5 py-3 text-sm font-semibold"
          >
            {editingId ? "Salvar alterações" : "Criar adestrador"}
          </button>
        </div>
      ) : null}

      <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Nome</th>
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Email</th>
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Plano</th>
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Permissão</th>
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Mensalidade</th>
                <th className="px-6 py-4 text-left font-bold text-slate-900 text-base">Status</th>
                <th className="px-6 py-4 text-right font-bold text-slate-900 text-base">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrainers.map((trainer) => (
                <tr key={trainer.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-base">{trainer.name}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{trainer.email}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{trainer.planType}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {PERMISSION_LABELS[trainer.permission] ?? "Padrão"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-base">{trainer.monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
                      trainer.status === "Ativo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {trainer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(trainer.id)}
                      className="text-sky-700 hover:text-sky-900 font-bold text-base"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredTrainers.length === 0 ? (
            <div className="border-t border-[var(--border)] px-6 py-5">
              <p className="text-sm text-[var(--muted)]">Nenhum adestrador encontrado para este filtro.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
