"use client";

import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/icons";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("adestro-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({
  className = "",
  variant = "button",
}: {
  className?: string;
  // "button": rótulo + ícone (Configurações). "icon": só o ícone, para o header.
  variant?: "button" | "icon";
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Lê o tema salvo após montar (adiado p/ não disparar render em cascata).
  useEffect(() => {
    const id = window.setTimeout(() => {
      setTheme(readStoredTheme());
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("adestro-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }

  if (!mounted) return null;

  const label = theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] ${className}`}
        aria-label={label}
        title={label}
      >
        {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn-secondary ${className}`}
      aria-label={label}
    >
      {theme === "dark" ? <IconSun className="h-3.5 w-3.5" /> : <IconMoon className="h-3.5 w-3.5" />}
      {theme === "dark" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
