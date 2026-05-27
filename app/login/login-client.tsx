"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export function LoginClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const next = params.get("next") ?? "/dashboard";
  const safNext = next.startsWith("/") ? next : "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace(safNext);
  }, [status, router, safNext]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCredentials(email, password);
  }

  async function submitCredentials(nextEmail: string, nextPassword: string, redirectTo = safNext) {
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email:    nextEmail.trim().toLowerCase(),
      password: nextPassword,
      redirect: false,
    });

    if (!result || result.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-76px)] w-full max-w-7xl items-start justify-center px-4 pb-16 pt-4 sm:min-h-[calc(100dvh-96px)] sm:items-center sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
      <section className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,_rgba(248,254,255,0.97),_rgba(238,249,255,0.99))] p-5 shadow-[var(--shadow)] sm:rounded-[2rem] sm:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-[rgba(34,137,190,0.14)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[rgba(31,154,138,0.12)] blur-3xl" />

        <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(20,90,130,0.8)]">Adestro</p>
        <h2 className="relative mt-2 font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Entrar</h2>
        <p className="relative mt-2 text-sm text-[var(--muted)]">Acesse sua conta para continuar.</p>

        <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(250,255,255,0.94)] px-4 py-3 text-base outline-none transition focus:border-[#1b719d] sm:text-sm"
              placeholder="voce@adestrador.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(250,255,255,0.94)] px-4 py-3 text-base outline-none transition focus:border-[#1b719d] sm:text-sm"
                placeholder="------"
                required
                autoComplete="current-password"
              />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="pc-primary-action w-full rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {error ? (
            <div className="rounded-2xl border border-[rgba(176,116,32,0.3)] bg-[rgba(245,186,86,0.16)] px-4 py-3 text-sm font-medium text-[#8a5b1a]">
              {error}
            </div>
          ) : null}
        </form>

        <p className="relative mt-6 text-center text-sm text-[var(--muted)]">
          Ainda nao tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-[#145a82] hover:underline">
            Criar conta gratis
          </Link>
        </p>
      </section>
    </main>
  );
}
