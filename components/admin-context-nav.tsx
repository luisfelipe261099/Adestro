"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconHome,
  IconUsers,
  IconTag,
  IconDollar,
  IconReport,
  IconCheckSquare,
  IconAlert,
} from "@/components/icons";

const adminItems = [
  { href: "/admin", label: "Visão geral", icon: IconHome },
  { href: "/admin/adestradores", label: "Adestradores", icon: IconUsers },
  { href: "/admin/planos", label: "Planos", icon: IconTag },
  { href: "/admin/faturamento", label: "Faturamento", icon: IconDollar },
  { href: "/admin/relatorios", label: "Relatórios", icon: IconReport },
  { href: "/admin/templates", label: "Templates", icon: IconCheckSquare },
  { href: "/admin/audit", label: "Auditoria", icon: IconAlert },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminContextNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação administrativa" className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {/* Rola na horizontal no mobile; vira barra única no desktop. */}
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {adminItems.map((item) => {
          const active = isCurrent(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
