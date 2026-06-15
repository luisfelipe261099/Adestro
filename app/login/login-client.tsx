"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn, useSession } from "next-auth/react";

function defaultRouteForRole(role?: string) {
  switch ((role ?? "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "client":
      return "/portal";
    case "trainer":
    default:
      return "/dashboard";
  }
}

export function LoginClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const explicitNext = params.get("next");
  const safeExplicitNext = explicitNext?.startsWith("/") ? explicitNext : null;

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as { role?: string } | undefined)?.role;
      router.replace(safeExplicitNext ?? defaultRouteForRole(role));
    }
  }, [status, session, router, safeExplicitNext]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    const freshSession = await getSession();
    const role = (freshSession?.user as { role?: string } | undefined)?.role;
    router.replace(safeExplicitNext ?? defaultRouteForRole(role));
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-semibold text-white">
            A
          </span>
          <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">Adestro</span>
        </div>

        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--foreground)]">Entrar na sua conta</h1>
        <p className="mt-1.5 text-[14px] text-[var(--muted)]">
          Bem-vindo de volta. Acesse para continuar gerenciando sua rotina.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[12.5px] font-medium text-[var(--foreground)]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="voce@adestrador.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[12.5px] font-medium text-[var(--foreground)]">
                Senha
              </label>
              <Link href="#" className="text-[11.5px] text-[var(--muted)] hover:text-[var(--foreground)]">
                Esqueceu?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Sua senha"
              required
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-3 py-2 text-[12.5px] text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-10 w-full text-[13.5px]"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-[var(--muted)]">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline">
            Criar conta gratuita
          </Link>
        </p>

        <div className="mt-12 grid gap-2 border-t border-[var(--border)] pt-6 text-[11.5px] text-[var(--muted)]">
          <p className="font-medium text-[var(--muted-strong)]">Para adestradores profissionais</p>
          <p>CRM completo · agenda mobile-first · cobrança com Pix · portal do tutor incluído</p>
        </div>
      </div>
    </main>
  );
}
