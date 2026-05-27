"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("adestro-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
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

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-sky-50 ${className}`}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
      {theme === "dark" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
