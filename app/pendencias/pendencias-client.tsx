"use client";

// Pendências — a tela que responde "o que está errado e como eu resolvo?".
// Antes o card "Pendências" da home levava ao histórico de treinos, que não
// explica nada. Aqui cada grupo diz o que é a pendência, por que ela importa e
// qual é a ação que a encerra.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AuthGuard } from "@/components/auth-guard";
import { IconAlert, IconCalendar, IconChevronRight, IconDollar, IconDog, IconReport } from "@/components/icons";
import { useAppStore } from "@/lib/app-store";
import {
  computeDogAttention,
  isActiveEvent,
  relativeDayLabel,
  resolveEventDate,
  ymd,
} from "@/lib/home-agenda";
import { useNow } from "@/lib/use-now";

type InvoiceRow = {
  id: string;
  clientName?: string;
  dogName?: string;
  amount: number;
  dueDate?: string;
  status?: string;
};

type ReportRow = { id: string; month?: string; status?: string };

/** Agendamento cujo cliente foi excluído — sobrou no banco, sumiu das telas. */
type OrphanRow = { id: string; day: string; time: string; dog: string; client: string };

type PendingItem = {
  key: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
};

type PendingGroup = {
  key: string;
  title: string;
  /** O que é essa pendência, em uma frase que o adestrador entende. */
  what: string;
  /** Por que ela precisa ser resolvida. */
  why: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  items: PendingItem[];
  emptyLabel: string;
};

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export default function PendenciasClientPage() {
  const events = useAppStore((state) => state.calendarEvents);
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);
  const now = useNow();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/finance/invoices", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setInvoices(data as InvoiceRow[]);
      })
      .catch(() => undefined);

    fetch("/api/relatorios", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setReports(data as ReportRow[]);
      })
      .catch(() => undefined);

    fetch("/api/events?orphans=only", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setOrphans(data as OrphanRow[]);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  async function removeOrphan(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) setOrphans((list) => list.filter((o) => o.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  const groups: PendingGroup[] = useMemo(() => {
    const todayStr = ymd(new Date(now));

    // 1) Treinos sem registro — mesma regra do quadro "Foco nos cães".
    const missingRecord = computeDogAttention(clients, events, sessions, now, { includeInactive: false })
      .filter((item) => item.level === "red")
      .map((item) => ({
        key: `treino-${item.dog.id}`,
        title: `${item.dog.name} — ${item.clientName}`,
        detail: "Teve aula nos últimos 7 dias e o treino não foi registrado.",
        actionLabel: "Registrar treino",
        href: `/treinos/registro?clientId=${item.clientId}&dogId=${item.dog.id}`,
      }));

    // 2) Aulas que o tutor ainda não confirmou.
    const awaiting = events
      .filter((e) => isActiveEvent(e) && (e.status === "Pendente" || e.status === "Aguardando"))
      .map((e) => ({
        key: `aula-${e.id}`,
        title: `${e.dog} — ${e.client}`,
        detail: `${relativeDayLabel(e.day)} às ${e.time} · status "${e.status}"`,
        actionLabel: "Abrir agenda",
        href: "/agenda?view=semana",
      }));

    // 3) Cobranças vencidas. "Atrasado" vem do vencimento, não do campo status:
    // nenhuma rotina do sistema grava esse status, então confiar nele deixaria
    // toda cobrança vencida invisível.
    const overdue = invoices
      .filter((inv) => (inv.status ?? "") !== "Pago")
      .map((inv) => ({ inv, due: inv.dueDate ? resolveEventDate(inv.dueDate) : null }))
      .filter((row) => row.due !== null && row.due < todayStr)
      .map(({ inv }) => ({
        key: `cobranca-${inv.id}`,
        title: `${inv.clientName ?? "Cliente"} — ${brl(inv.amount)}`,
        detail: `Venceu em ${inv.dueDate} e ainda não foi baixada.`,
        actionLabel: "Abrir financeiro",
        href: "/financeiro",
      }));

    // 4) Relatórios que ficaram parados antes do envio.
    const pendingReports = reports
      .filter((r) => (r.status ?? "") !== "Enviado")
      .map((r) => ({
        key: `relatorio-${r.id}`,
        title: `Relatório mensal ${r.month ?? ""}`.trim(),
        detail: `Status atual: ${r.status ?? "Rascunho"}. Ainda não foi enviado ao tutor.`,
        actionLabel: "Abrir relatórios",
        href: "/relatorios",
      }));

    return [
      {
        key: "treinos",
        title: "Treinos sem registro",
        what: "Aulas que já aconteceram nos últimos 7 dias, mas cujo treino não foi registrado no sistema.",
        why: "Sem o registro, o tutor não vê a evolução no portal e o relatório mensal sai incompleto.",
        Icon: IconDog,
        tone: "text-[var(--danger)]",
        items: missingRecord,
        emptyLabel: "Todos os treinos da última semana estão registrados.",
      },
      {
        key: "confirmacoes",
        title: "Aulas aguardando confirmação",
        what: 'Agendamentos criados que continuam com status "Pendente" ou "Aguardando".',
        why: "Aula não confirmada é a principal causa de falta. Confirme com o tutor ou cancele para liberar o horário.",
        Icon: IconCalendar,
        tone: "text-[var(--warning)]",
        items: awaiting,
        emptyLabel: "Nenhuma aula esperando confirmação.",
      },
      {
        key: "cobrancas",
        title: "Cobranças vencidas",
        what: "Faturas de clientes cuja data de vencimento já passou e que não foram marcadas como pagas.",
        why: "É o dinheiro que já era seu e não entrou. Marque como paga no Financeiro ou cobre o tutor.",
        Icon: IconDollar,
        tone: "text-[var(--danger)]",
        items: overdue,
        emptyLabel: "Nenhuma cobrança vencida.",
      },
      {
        key: "relatorios",
        title: "Relatórios a enviar",
        what: "Relatórios mensais criados que ainda não foram enviados ao tutor.",
        why: "O relatório é o que mostra valor ao cliente e sustenta a renovação do pacote.",
        Icon: IconReport,
        tone: "text-[var(--muted-strong)]",
        items: pendingReports,
        emptyLabel: "Nenhum relatório parado.",
      },
    ];
  }, [clients, events, sessions, invoices, reports, now]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0) + orphans.length;

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <header>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[26px]">
            Pendências
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {total === 0
              ? "Nada travado no momento — tudo em dia."
              : `${total} ${total === 1 ? "item precisa" : "itens precisam"} da sua ação. Cada bloco explica o que é e como resolver.`}
          </p>
        </header>

        {/* Agendamentos órfãos primeiro: enquanto existirem, a agenda parece
            vazia e nenhuma outra correção fica visível para o adestrador. */}
        {orphans.length > 0 ? (
          <section className="mt-6 rounded-lg border border-[var(--danger)] bg-[var(--danger-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <IconAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--danger)]" />
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                    Agendamentos sem cliente
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted-strong)]">
                    Estas aulas foram marcadas para um cliente que depois foi excluído do sistema.
                    Elas continuam gravadas, mas <strong>não aparecem na agenda</strong> — é por isso
                    que a agenda pode parecer mais vazia do que você esperava.
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-[var(--muted-strong)]">
                    <strong className="font-semibold">Como resolver:</strong> remova as que não fazem
                    mais sentido. Se a aula ainda vai acontecer, cadastre o cliente de novo e agende
                    outra vez.
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 rounded-md border border-[var(--danger)] bg-[var(--surface)] px-2 py-0.5 text-[13px] font-semibold text-[var(--danger)]">
                {orphans.length}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-[var(--border)] rounded-md bg-[var(--surface)]">
              {orphans.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[var(--foreground)]">
                      {o.dog || "Cão"} — {o.client || "Cliente removido"}
                    </p>
                    <p className="truncate text-[13px] text-[var(--muted)]">
                      {o.day} às {o.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={removing === o.id}
                    onClick={() => removeOrphan(o.id)}
                    className="flex-shrink-0 rounded-md border border-[var(--danger)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--danger)] disabled:opacity-60"
                  >
                    {removing === o.id ? "Removendo…" : "Remover"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.key} className="card p-4">
              <header className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <group.Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${group.tone}`} />
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{group.title}</h2>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{group.what}</p>
                    <p className="mt-1 text-[13px] leading-snug text-[var(--muted-strong)]">
                      <strong className="font-semibold">Por que resolver:</strong> {group.why}
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[13px] font-semibold text-[var(--foreground)]">
                  {group.items.length}
                </span>
              </header>

              {group.items.length === 0 ? (
                <p className="mt-3 rounded-md bg-[var(--surface-2)]/50 p-3 text-[13px] text-[var(--muted)]">
                  {group.emptyLabel}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-[var(--foreground)]">
                            {item.title}
                          </p>
                          <p className="truncate text-[13px] text-[var(--muted)]">{item.detail}</p>
                        </div>
                        <span className="flex flex-shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--accent-text)]">
                          {item.actionLabel}
                          <IconChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {total === 0 ? (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 text-[13.5px] text-[var(--muted)]">
            <IconAlert className="h-4 w-4 flex-shrink-0 text-[var(--success)]" />
            Quando algo travar — treino sem registro, aula não confirmada, cobrança vencida ou
            relatório parado — ele aparece aqui automaticamente.
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
