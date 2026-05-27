"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";

type Step = 1 | 2 | 3 | 4;

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
      const ok = await addClient({
        clientName: clientName || "Tutor de exemplo",
        phone: clientPhone || "",
        dogName: dogName || "Cão de exemplo",
        breed: dogBreed || "Sem raça definida",
      });
      if (!ok) throw new Error("Não foi possível salvar o cliente. Tente em /clientes.");
      try {
        window.localStorage.setItem("adestro-onboarding-done", "1");
      } catch {
        /* ignore */
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  function next() {
    setStep((current) => (current < 4 ? ((current + 1) as Step) : current));
  }

  function back() {
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
  }

  function skip() {
    try {
      window.localStorage.setItem("adestro-onboarding-done", "1");
    } catch {
      /* ignore */
    }
    router.push("/dashboard");
  }

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-md px-3 pb-12 pt-6 sm:max-w-xl">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[#f7fbff] p-5 shadow-[var(--shadow)]">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2d6f99]">Configuração inicial</p>
              <h1 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                Olá, {trainerName?.split(" ")[0] || "adestrador"}! 🐾
              </h1>
              <p className="mt-1 text-xs text-[var(--muted)]">
                4 passos rápidos para deixar o Adestro pronto para o seu fluxo.
              </p>
            </div>
            <button
              type="button"
              onClick={skip}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[#145a82]"
            >
              Pular
            </button>
          </header>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition ${
                  s <= step ? "bg-[#145a82]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          ) : null}

          {/* Step 1: Negócio */}
          {step === 1 && (
            <div className="mt-5 grid gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">1/4 — Seu negócio</h2>
              <label className="text-xs text-[var(--muted)]">
                Nome do seu negócio (opcional)
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Adestramento da Mariana"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                WhatsApp principal
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Usaremos para identificar você nos recibos e mensagens.
              </p>
            </div>
          )}

          {/* Step 2: Pix */}
          {step === 2 && (
            <div className="mt-5 grid gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">2/4 — Recebimento</h2>
              <label className="text-xs text-[var(--muted)]">
                Sua chave Pix (CPF/CNPJ, e-mail, telefone ou chave aleatória)
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="ex: 99999999999 ou seuemail@dominio.com"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                A chave aparece no recibo como Pix Copia e Cola — sem gateway pago.
              </p>
            </div>
          )}

          {/* Step 3: Primeiro tutor */}
          {step === 3 && (
            <div className="mt-5 grid gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">3/4 — Primeiro tutor</h2>
              <label className="text-xs text-[var(--muted)]">
                Nome do tutor
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Mariana Lopes"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                WhatsApp do tutor
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </div>
          )}

          {/* Step 4: Primeiro cão */}
          {step === 4 && (
            <form onSubmit={handleFinish} className="mt-5 grid gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">4/4 — Primeiro cão</h2>
              <label className="text-xs text-[var(--muted)]">
                Nome do cão
                <input
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="Ex: Nina"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Raça
                <input
                  value={dogBreed}
                  onChange={(e) => setDogBreed(e.target.value)}
                  placeholder="Ex: Golden Retriever (ou 'Sem raça definida')"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 rounded-full bg-[#145a82] px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
              >
                {submitting ? "Salvando…" : "Finalizar e ir pro Dashboard"}
              </button>
            </form>
          )}

          {step < 4 ? (
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={back}
                disabled={step === 1}
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] disabled:opacity-30"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-[#145a82] px-4 py-2 text-xs font-bold text-white"
              >
                Próximo →
              </button>
            </div>
          ) : null}

          <footer className="mt-5 border-t border-slate-100 pt-3 text-center">
            <Link href="/dashboard" className="text-[11px] font-semibold text-[var(--muted)] hover:text-[#145a82]">
              Quero explorar primeiro
            </Link>
          </footer>
        </section>
      </main>
    </AuthGuard>
  );
}
