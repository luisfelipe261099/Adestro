"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminItems = [
  {
    href: "/admin",
    label: "Visao geral",
    description: "Resumo da operacao",
  },
  {
    href: "/admin/adestradores",
    label: "Adestradores",
    description: "Cadastro e status",
  },
  {
    href: "/admin/planos",
    label: "Planos",
    description: "Plano de cada conta",
  },
  {
    href: "/admin/faturamento",
    label: "Faturamento",
    description: "Pagos e pendentes",
  },
  {
    href: "/admin/relatorios",
    label: "Relatorios",
    description: "Uso e desempenho",
  },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminContextNav() {
  const pathname = usePathname();

  return (
    <section className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Navegacao administrativa
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {adminItems.map((item) => {
          const active = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md border px-3 py-2.5 transition ${
                active
                  ? "border-[#145a82] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-white"
              }`}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={`text-xs ${active ? "text-sky-100" : "text-[var(--muted)]"}`}>{item.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
