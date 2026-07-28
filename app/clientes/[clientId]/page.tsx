"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { TagsEditor } from "@/components/tags-editor";
import { type DogTrainingStatus, useAppStore } from "@/lib/app-store";
import { buildWaUrl, waTemplates } from "@/lib/whatsapp";

// Cor da etiqueta de fase, alinhada às colunas do quadro kanban.
const PHASE_BADGE: Record<DogTrainingStatus, string> = {
  Ficha: "bg-slate-100 text-slate-700",
  Ativo: "bg-sky-100 text-sky-800",
  Completo: "bg-emerald-100 text-emerald-800",
  Pausado: "bg-amber-100 text-amber-800",
  Cancelado: "bg-rose-100 text-rose-800",
};

// Contrato como o GET /api/finance/contracts devolve (inclui cliente e faturas).
type ContractInfo = {
  id: string;
  name: string;
  sessionsCount: number;
  amount: number;
  client: { id: string; name: string };
  dog?: { id: string; name: string } | null;
  servicePackage?: { name: string } | null;
  invoices: Array<{ id: string; amount: number; dueDate: string; status: string }>;
};

// Datas de treino vêm como "DD/MM/YYYY".
function parseBrazilianDate(date: string): number {
  const [day, month, year] = (date ?? "").split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const EVENT_STATUS_BADGE: Record<string, string> = {
  Confirmado: "bg-emerald-100 text-emerald-800",
  Pendente: "bg-amber-100 text-amber-800",
  Aguardando: "bg-amber-100 text-amber-800",
  Cancelado: "bg-rose-100 text-rose-800",
  Recorrente: "bg-sky-100 text-sky-800",
};

const INVOICE_STATUS_BADGE: Record<string, string> = {
  Pago: "bg-emerald-100 text-emerald-800",
  Pendente: "bg-amber-100 text-amber-800",
  Atrasado: "bg-rose-100 text-rose-800",
};

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ClientProfilePage() {
  const params = useParams();
  const clientId = (params?.clientId as string) ?? "";

  const hydrated = useAppStore((s) => s.hydrated);
  const clients = useAppStore((s) => s.clients);
  const events = useAppStore((s) => s.calendarEvents);
  const sessions = useAppStore((s) => s.trainingSessions);
  const portalTasks = useAppStore((s) => s.portalTasks);
  const portalFeedbacks = useAppStore((s) => s.portalFeedbacks);

  const client = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId]);

  // Aulas do cliente: com data futura primeiro (asc); recorrentes por dia da semana no fim.
  const clientEvents = useMemo(() => {
    if (!client) return [];
    const mine = events.filter((e) => e.clientId === client.id || e.client === client.name);
    const isDated = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    const today = todayISO();
    const upcomingDated = mine
      .filter((e) => isDated(e.day) && e.day >= today && e.status !== "Cancelado")
      .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
    const weekly = mine.filter((e) => !isDated(e.day) && e.status !== "Cancelado");
    return [...upcomingDated, ...weekly].slice(0, 6);
  }, [client, events]);

  // Treinos registrados do cliente, mais recentes primeiro.
  const clientSessions = useMemo(() => {
    if (!client) return [];
    return sessions
      .filter((s) => s.clientId === client.id || s.clientName === client.name)
      .sort((a, b) => parseBrazilianDate(b.date) - parseBrazilianDate(a.date));
  }, [client, sessions]);

  const clientTasks = useMemo(
    () => (client ? portalTasks.filter((t) => t.clientId === client.id) : []),
    [client, portalTasks],
  );

  const clientMessages = useMemo(
    () => (client ? portalFeedbacks.filter((f) => f.clientId === client.id).slice(-4).reverse() : []),
    [client, portalFeedbacks],
  );

  // Financeiro do cliente: contratos + faturas via API (não vive no store).
  const [contracts, setContracts] = useState<ContractInfo[] | null>(null);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch("/api/finance/contracts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ContractInfo[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setContracts(data.filter((c) => c.client?.id === clientId));
      })
      .catch(() => {
        if (!cancelled) setContracts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const invoiceTotals = useMemo(() => {
    const all = (contracts ?? []).flatMap((c) => c.invoices);
    const sum = (status: string) =>
      all.filter((i) => i.status === status).reduce((total, i) => total + i.amount, 0);
    return { paid: sum("Pago"), pending: sum("Pendente"), overdue: sum("Atrasado") };
  }, [contracts]);

  const isDraft = /rascunho/i.test(client?.status ?? "");
  const firstDog = client?.dogs[0];
  const doneTasks = clientTasks.filter((t) => t.completed).length;

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <div className="mb-4">
          <Link href="/clientes" className="text-[12.5px] text-[var(--muted)] hover:text-[var(--foreground)]">
            ‹ Voltar para clientes
          </Link>
        </div>

        {!hydrated ? (
          <p className="text-sm text-[var(--muted)]">Carregando ficha…</p>
        ) : !client ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
            <p className="text-sm text-[var(--foreground)]">Cliente não encontrado.</p>
            <Link href="/clientes" className="mt-2 inline-block text-[12.5px] font-medium text-[var(--foreground)] underline">
              Ver clientes
            </Link>
          </div>
        ) : (
          <>
            {/* Cabeçalho: identidade + dados cadastrais + ações rápidas */}
            <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-sky-100">
                    <Image
                      src={firstDog?.photoUrl || "/images/dog-default-bolt.svg"}
                      alt={`Foto de ${firstDog?.name || "cão"}`}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-semibold text-[var(--foreground)]">{client.name}</h1>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          isDraft ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {client.status || "Ativo"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                      {client.dogs.length} cão(ões) · Plano {client.plan || "Personalizado"}
                    </p>
                    <div className="mt-2 relative">
                      <TagsEditor clientId={client.id} initialTags={client.tags ?? []} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildWaUrl(client.phone, `Olá ${client.name.split(" ")[0]}! `)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-[12px]"
                  >
                    💬 WhatsApp
                  </a>
                  <Link href="/agenda?new=true" className="btn-secondary text-[12px]">
                    📆 Agendar aula
                  </Link>
                  <Link href="/treinos/registro" className="btn-secondary text-[12px]">
                    📝 Registrar treino
                  </Link>
                  <Link href="/portal" className="btn-secondary text-[12px]">
                    🔗 Portal
                  </Link>
                  <Link href="/financeiro?vender=true" className="btn-secondary text-[12px]">
                    💰 Vender pacote
                  </Link>
                  <Link href={`/clientes/${client.id}/editar`} className="btn-secondary text-[12px]">
                    ✏️ Editar cadastro
                  </Link>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-[12.5px] sm:grid-cols-4">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">Telefone</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{client.phone || "Não informado"}</dd>
                </div>
                {client.secondContactName || client.secondContactPhone ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">2º contato</dt>
                    <dd className="mt-0.5 text-[var(--foreground)]">
                      {[client.secondContactName, client.secondContactPhone].filter(Boolean).join(" · ")}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">Imóvel</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{client.propertyType || "Não informado"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">Ambiente</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{client.environment || "Não informado"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-[10px] text-[var(--muted)]">Treinos registrados</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{clientSessions.length}</dd>
                </div>
              </dl>
            </section>

            {/* Cães do cliente */}
            <section className="mt-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Cães</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {client.dogs.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--muted)]">Nenhum cão cadastrado para este cliente.</p>
                ) : (
                  client.dogs.map((dog) => {
                    const phase = (dog.trainingStatus ?? "Ativo") as DogTrainingStatus;
                    return (
                      <Link
                        key={dog.id}
                        href={`/caes/${dog.id}`}
                        className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm transition hover:border-[var(--border-strong)]"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-sky-100">
                          <Image
                            src={dog.photoUrl || "/images/dog-default-bolt.svg"}
                            alt={`Foto de ${dog.name}`}
                            fill
                            sizes="48px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{dog.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PHASE_BADGE[phase]}`}>
                              {phase}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted)]">
                            {dog.breed || "Raça não informada"}
                            {dog.age ? ` · ${dog.age}` : ""}
                            {dog.weight ? ` · ${dog.weight}` : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">Ver ficha completa →</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Próximas aulas */}
              <SectionCard
                title="Próximas aulas"
                subtitle="Agendamentos futuros e recorrências deste cliente"
                action={
                  <Link href="/agenda" className="text-[11.5px] font-semibold text-[var(--foreground)] hover:underline">
                    Agenda →
                  </Link>
                }
              >
                {clientEvents.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center">
                    <p className="text-[12px] text-[var(--muted)]">Nenhuma aula futura agendada.</p>
                    <Link href="/agenda?new=true" className="btn-primary mt-2 inline-flex text-[12px]">
                      + Agendar aula
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {clientEvents.map((event) => (
                      <li
                        key={event.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--foreground)]">
                            {event.day} às {event.time}
                          </p>
                          <p className="truncate text-[11.5px] text-[var(--muted)]">
                            {event.dog} · {event.plan} · Sessão {event.sessionNumber}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            EVENT_STATUS_BADGE[event.status] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {event.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Financeiro do cliente */}
              <SectionCard
                title="Financeiro"
                subtitle="Contratos e faturas deste cliente"
                action={
                  <Link href="/financeiro" className="text-[11.5px] font-semibold text-[var(--foreground)] hover:underline">
                    Financeiro →
                  </Link>
                }
              >
                {contracts === null ? (
                  <p className="text-[12px] text-[var(--muted)]">Carregando contratos…</p>
                ) : contracts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center">
                    <p className="text-[12px] text-[var(--muted)]">
                      Nenhum contrato para este cliente. Venda um pacote no Financeiro para gerar cobranças automáticas.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-emerald-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-emerald-700">Pago</p>
                        <p className="text-[13px] font-semibold text-emerald-800">{brl(invoiceTotals.paid)}</p>
                      </div>
                      <div className="rounded-md bg-amber-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-amber-700">Pendente</p>
                        <p className="text-[13px] font-semibold text-amber-800">{brl(invoiceTotals.pending)}</p>
                      </div>
                      <div className="rounded-md bg-rose-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-rose-700">Em atraso</p>
                        <p className="text-[13px] font-semibold text-rose-800">{brl(invoiceTotals.overdue)}</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {contracts.map((contract) => (
                        <li key={contract.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-[var(--foreground)]">{contract.name}</p>
                            <p className="text-[12.5px] font-semibold text-[var(--foreground)]">{brl(contract.amount)}</p>
                          </div>
                          <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                            {contract.sessionsCount} sessões
                            {contract.dog?.name ? ` · ${contract.dog.name}` : ""}
                          </p>
                          {contract.invoices.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {contract.invoices.map((invoice) => (
                                <span
                                  key={invoice.id}
                                  title={`Vence em ${invoice.dueDate}`}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    INVOICE_STATUS_BADGE[invoice.status] ?? "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {brl(invoice.amount)} · {invoice.status}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {(() => {
                            const open =
                              contract.invoices.find((i) => i.status === "Atrasado") ??
                              contract.invoices.find((i) => i.status === "Pendente");
                            if (!open || !client.phone) return null;
                            const message = waTemplates.cobrancaPendente({
                              tutor: client.name,
                              valor: open.amount.toFixed(2),
                              data: open.dueDate,
                            });
                            return (
                              <a
                                href={buildWaUrl(client.phone, message)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-800 hover:bg-emerald-100"
                              >
                                💬 Cobrar pelo WhatsApp
                              </a>
                            );
                          })()}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </SectionCard>

              {/* Últimos treinos */}
              <SectionCard
                title="Últimos treinos"
                subtitle={`${clientSessions.length} registro(s) no total`}
                action={
                  <Link
                    href={`/treinos?clientId=${client.id}${firstDog ? `&dogId=${firstDog.id}` : ""}`}
                    className="text-[11.5px] font-semibold text-[var(--foreground)] hover:underline"
                  >
                    Histórico →
                  </Link>
                }
              >
                {clientSessions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-center">
                    <p className="text-[12px] text-[var(--muted)]">Nenhum treino registrado ainda.</p>
                    <Link href="/treinos/registro" className="btn-primary mt-2 inline-flex text-[12px]">
                      + Registrar treino
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {clientSessions.slice(0, 5).map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                            {session.title || `Sessão ${session.number}`}
                          </p>
                          <p className="truncate text-[11.5px] text-[var(--muted)]">
                            {session.date}
                            {session.dogName ? ` · ${session.dogName}` : ""}
                            {session.type ? ` · ${session.type}` : ""}
                          </p>
                        </div>
                        {session.media.length ? (
                          <span className="shrink-0 text-[11px] text-[var(--muted)]">📷 {session.media.length}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Portal: tarefas + mensagens */}
              <SectionCard
                title="Portal do cliente"
                subtitle={`Tarefas de casa: ${doneTasks}/${clientTasks.length} concluída(s)`}
                action={
                  <Link href="/portal" className="text-[11.5px] font-semibold text-[var(--foreground)] hover:underline">
                    Portal →
                  </Link>
                }
              >
                {clientTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--muted)]">
                    Nenhuma tarefa de casa criada — crie em Portal para engajar o tutor entre as aulas.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {clientTasks.slice(0, 5).map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-[12.5px] text-[var(--foreground)]">
                        <span aria-hidden>{task.completed ? "✅" : "⬜"}</span>
                        <span className={task.completed ? "line-through opacity-70" : ""}>{task.title}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {clientMessages.length > 0 ? (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Mensagens recentes</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {clientMessages.map((message) => (
                        <li key={message.id} className="text-[12px] leading-5 text-[var(--muted)]">
                          <span className="font-semibold text-[var(--foreground)]">{message.author}:</span>{" "}
                          {message.message}
                        </li>
                      ))}
                    </ul>
                    <Link href="/chat" className="mt-2 inline-block text-[11.5px] font-semibold text-[var(--foreground)] hover:underline">
                      Responder no chat →
                    </Link>
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
