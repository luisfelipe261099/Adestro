"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";

type Step = 1 | 2 | 3 | 4;

const STEP_INFO: Record<Step, { title: string; description: string }> = {
  1: { title: "Seu negócio", description: "Identifique o nome usado nos recibos e mensagens." },
  2: { title: "Recebimento", description: "Cadastre sua chave Pix para gerar Pix Copia e Cola no recibo." },
  3: { title: "Primeiro tutor", description: "Cadastre seu primeiro cliente. Você pode mudar depois." },
  4: { title: "Primeiro cão", description: "Vincule o cão atendido ao tutor." },
};

export default function WelcomePage() {
  const router = useRouter();
  const trainerName = useAppStore((state) => state.trainerName);
  const addClient = useAppStore((state) => state.addClientWithDog);

  const [step, setStep] = useState<Step>(1);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await addClient({
        clientName: clientName || "Tutor de exemplo",
        phone: clientPhone || "",
        dogName: dogName || "Cão de exemplo",
        breed: dogBreed || "Sem raça definida",
      });
      if (!result.ok) throw new Error(result.error || "Não foi possível salvar o cliente. Tente em /clientes.");
      try {
        window.localStorage.setItem("adestro-onboarding-done", "1");
      } catch { /* ignore */ }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  function next() { setStep((c) => (c < 4 ? ((c + 1) as Step) : c)); }
  function back() { setStep((c) => (c > 1 ? ((c - 1) as Step) : c)); }

  function skip() {
    try { window.localStorage.setItem("adestro-onboarding-done", "1"); } catch { /* ignore */ }
    router.push("/dashboard");
  }

  const info = STEP_INFO[step];
  const firstName = trainerName?.split(" ")[0] || "adestrador";

  return (
    <AuthGuard role="trainer">
      <main className="page-narrow">
        <header className="mb-8">
          <p className="text-eyebrow mb-2">Configuração inicial</p>
          <h1 className="text-display">Bem-vindo, {firstName}</h1>
          <p className="mt-1 text-subtitle">
            Quatro passos rápidos para deixar o Adestro pronto.
          </p>
        </header>

        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                  s === step
                    ? "bg-[var(--accent)] text-white"
                    : s < step
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {s < step ? "✓" : s}
              </span>
              {s < 4 ? (
                <div className={`h-px flex-1 ${s < step ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                Etapa {step} de 4 — {info.title}
              </h2>
              <p className="text-[12px] text-[var(--muted)]">{info.description}</p>
            </div>
            <button type="button" onClick={skip} className="btn-ghost text-[12px]">
              Pular configuração
            </button>
          </div>

          <div className="card-body space-y-4">
            {step === 1 && (
              <>
                <label className="block">
                  <span className="label">Nome do negócio (opcional)</span>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex: Adestramento da Mariana"
                    className="input-field"
                  />
                </label>
                <label className="block">
                  <span className="label">WhatsApp principal</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="input-field"
                  />
                  <p className="help-text">Aparece nos recibos e mensagens enviadas ao tutor.</p>
                </label>
              </>
            )}

            {step === 2 && (
              <label className="block">
                <span className="label">Chave Pix</span>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  className="input-field"
                />
                <p className="help-text">
                  A chave é usada para gerar o Pix Copia e Cola direto no recibo, sem gateway pago.
                </p>
              </label>
            )}

            {step === 3 && (
              <>
                <label className="block">
                  <span className="label">Nome do tutor</span>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Mariana Lopes"
                    className="input-field"
                  />
                </label>
                <label className="block">
                  <span className="label">WhatsApp do tutor</span>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="input-field"
                  />
                </label>
              </>
            )}

            {step === 4 && (
              <form onSubmit={handleFinish} className="space-y-4">
                <label className="block">
                  <span className="label">Nome do cão</span>
                  <input
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                    placeholder="Ex: Nina"
                    className="input-field"
                  />
                </label>
                <label className="block">
                  <span className="label">Raça</span>
                  <input
                    value={dogBreed}
                    onChange={(e) => setDogBreed(e.target.value)}
                    placeholder="Golden Retriever, Border Collie, Sem raça definida…"
                    className="input-field"
                  />
                </label>
                {error ? (
                  <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-3 py-2 text-[12px] text-[var(--danger)]">
                    {error}
                  </p>
                ) : null}
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Salvando…" : "Finalizar configuração"}
                </button>
              </form>
            )}
          </div>

          {step < 4 ? (
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 1}
                className="btn-secondary disabled:opacity-40"
              >
                Voltar
              </button>
              <button type="button" onClick={next} className="btn-primary">
                Continuar
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--muted)]">
          <Link href="/dashboard" className="hover:text-[var(--foreground)] hover:underline">
            Prefiro explorar primeiro
          </Link>
        </p>
      </main>
    </AuthGuard>
  );
}
