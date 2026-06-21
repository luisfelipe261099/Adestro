"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";

type PortalLinkStatus = "Ativo" | "Revogado" | "Expirado";

type PortalLinkInfo = {
  id: string;
  clientId: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessAt: string | null;
  hasPin: boolean;
  status: PortalLinkStatus;
  shareUrl: string | null;
  previewPath: string;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PortalPage() {
  const trainerName = useAppStore((state) => state.trainerName);
  const storeClients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);
  const events = useAppStore((state) => state.calendarEvents);
  const tasks = useAppStore((state) => state.portalTasks);
  const feedbacks = useAppStore((state) => state.portalFeedbacks);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const addPortalTask = useAppStore((state) => state.addPortalTask);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskRecurrence, setTaskRecurrence] = useState<"once" | "daily" | "weekly">("daily");
  const [taskWeekdays, setTaskWeekdays] = useState<number[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "ok-renewed" | "error">("idle");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [portalLink, setPortalLink] = useState<PortalLinkInfo | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState("");
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isRevokingLink, setIsRevokingLink] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");

  const selectedClient = useMemo(() => {
    if (!storeClients.length) return null;
    return storeClients.find((client) => client.id === selectedClientId) ?? storeClients[0];
  }, [storeClients, selectedClientId]);

  const selectedDog = useMemo(() => {
    if (!selectedClient?.dogs.length) return null;
    return selectedClient.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient.dogs[0];
  }, [selectedClient, selectedDogId]);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => !selectedClient || task.clientId === selectedClient.id),
    [tasks, selectedClient],
  );

  const selectedFeedbacks = useMemo(
    () => feedbacks.filter((feedback) => !selectedClient || feedback.clientId === selectedClient.id),
    [feedbacks, selectedClient],
  );

  useEffect(() => {
    async function loadPortalLink() {
      if (!selectedClient?.id) {
        setPortalLink(null);
        setLastGeneratedUrl("");
        return;
      }

      setIsLoadingLink(true);
      setLinkError("");

      try {
        const response = await fetch(`/api/portal-links?clientId=${encodeURIComponent(selectedClient.id)}`, {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Falha ao consultar link");

        const body = (await response.json()) as { link?: PortalLinkInfo | null };
        setPortalLink(body.link ?? null);
        setLastGeneratedUrl("");
      } catch {
        setLinkError("Não foi possível carregar o status do link deste cliente.");
      } finally {
        setIsLoadingLink(false);
      }
    }

    loadPortalLink();
  }, [selectedClient?.id]);

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim() || isAddingTask || !selectedClient?.id) return;
    if (taskRecurrence === "weekly" && taskWeekdays.length === 0) return;
    setIsAddingTask(true);
    try {
      await addPortalTask(taskTitle, "", selectedClient.id, {
        recurrence: taskRecurrence,
        weekdays: taskWeekdays,
      });
      setTaskTitle("");
    } finally {
      setIsAddingTask(false);
    }
  }

  async function handleTemplateTask(template: string) {
    if (isAddingTask || !selectedClient?.id) return;
    setIsAddingTask(true);
    try {
      await addPortalTask(template, "Tarefa sugerida", selectedClient.id, {
        recurrence: taskRecurrence,
        weekdays: taskWeekdays,
      });
    } finally {
      setIsAddingTask(false);
    }
  }

  const selectedEvents = useMemo(() => {
    if (!selectedClient) return [];

    return events.filter((event) => {
      const sameClient = event.clientId ? event.clientId === selectedClient.id : event.client === selectedClient.name;
      const sameDog = selectedDog
        ? event.dogId
          ? event.dogId === selectedDog.id
          : event.dog === selectedDog.name
        : true;
      return sameClient && sameDog;
    });
  }, [events, selectedClient, selectedDog]);

  const selectedSessions = useMemo(() => {
    if (!selectedClient) return [];

    return sessions.filter((session) => {
      const sameClient = session.clientName === selectedClient.name;
      const sameDog = selectedDog ? session.dogId === selectedDog.id || session.dogName === selectedDog.name : true;
      return sameClient && sameDog;
    });
  }, [sessions, selectedClient, selectedDog]);

  async function requestNewPortalLink(): Promise<string | null> {
    if (!selectedClient?.id || isGeneratingLink) return null;
    if (pinEnabled && !/^\d{4}$/.test(pin)) {
      setLinkError("Defina um PIN de 4 dígitos para proteger o link.");
      return null;
    }

    setIsGeneratingLink(true);
    setLinkError("");
    setCopyStatus("idle");

    try {
      const response = await fetch("/api/portal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id, expiresInDays, pin: pinEnabled ? pin : null }),
      });

      if (!response.ok) throw new Error("Falha ao gerar link");

      const body = (await response.json()) as { link?: PortalLinkInfo };
      if (!body.link) throw new Error("Resposta sem link");

      setPortalLink(body.link);
      const nextShareUrl = body.link.shareUrl ?? "";
      setLastGeneratedUrl(nextShareUrl);
      return nextShareUrl;
    } catch {
      setLinkError("Não foi possível gerar o link deste cliente. Tente novamente.");
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function handleGeneratePortalLink() {
    await requestNewPortalLink();
  }

  async function handleRevokePortalLink() {
    if (!selectedClient?.id || isRevokingLink) return;

    setIsRevokingLink(true);
    setLinkError("");

    try {
      const response = await fetch("/api/portal-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id, action: "revoke" }),
      });

      if (!response.ok) throw new Error("Falha ao revogar link");

      setPortalLink((current) =>
        current
          ? {
              ...current,
              status: "Revogado",
              revokedAt: new Date().toISOString(),
              shareUrl: null,
            }
          : current,
      );
      setLastGeneratedUrl("");
    } catch {
      setLinkError("Não foi possível revogar o link agora.");
    } finally {
      setIsRevokingLink(false);
    }
  }

  async function handleCopyPortalLink() {
    let shareUrl = lastGeneratedUrl || portalLink?.shareUrl || "";
    let renewed = false;

    if (!shareUrl) {
      const generated = await requestNewPortalLink();
      if (!generated) {
        setCopyStatus("error");
        window.setTimeout(() => setCopyStatus("idle"), 2500);
        return;
      }
      shareUrl = generated;
      renewed = true;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus(renewed ? "ok-renewed" : "ok");
    } catch {
      setCopyStatus("error");
    }

    window.setTimeout(() => setCopyStatus("idle"), 2500);
  }

  return (
    <AuthGuard role="trainer">
      <section className="mx-auto max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
        <div className="rounded-lg border border-[var(--border)] bg-gradient-to-b from-[#f8fcff] to-[#f2f9ff] p-4 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Portal do cliente</p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Compartilhar acompanhamento</h1>
              <p className="mt-1 text-xs text-[var(--muted)]">Adestrador: {trainerName || "Sem nome"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/agenda" className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)]">
                Agenda
              </Link>
              <Link href="/treinos" className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)]">
                Treinos
              </Link>
            </div>
          </header>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <article className="rounded-md border border-[var(--border)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Tarefas</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{selectedTasks.length}</p>
              <p className="text-xs text-[var(--muted)]">Itens no portal</p>
            </article>
            <article className="rounded-md border border-[var(--border)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Feedbacks</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{selectedFeedbacks.length}</p>
              <p className="text-xs text-[var(--muted)]">Mensagens recentes</p>
            </article>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            1. Escolha o cliente
            <select
              value={selectedClient?.id ?? ""}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
            >
              {storeClients.length === 0 ? <option value="">Sem clientes</option> : null}
              {storeClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            2. Escolha o cão
            <select
              value={selectedDog?.id ?? ""}
              onChange={(event) => setSelectedDogId(event.target.value)}
              disabled={!selectedClient?.dogs.length}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none disabled:opacity-60 focus:border-sky-400"
            >
              {!selectedClient?.dogs.length ? <option value="">Sem cães</option> : null}
              {(selectedClient?.dogs ?? []).map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </select>
          </label>
          </div>

          {selectedClient && selectedDog && (
            <article className="mb-4 mt-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-3">
              <Image
                src={selectedDog.photoUrl || "/images/dog-default-bolt.svg"}
                alt={`Foto de ${selectedDog.name}`}
                width={96}
                height={96}
                unoptimized
                onError={(event) => {
                  event.currentTarget.src = "/images/dog-default-bolt.svg";
                }}
                className="h-20 w-20 rounded-md object-cover"
              />
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">3. Link do portal de {selectedDog.name}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Cliente: {selectedClient.name} • {selectedClient.plan || "Plano não informado"}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-md border border-[var(--border)] bg-white p-3">
              <p className="text-xs text-[var(--muted)]">
                Status: <span className="font-semibold text-[var(--foreground)]">{isLoadingLink ? "Carregando..." : portalLink?.status || "Não gerado"}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">
                Expira: <span className="font-semibold text-[var(--foreground)]">{formatDateTime(portalLink?.expiresAt)}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">
                Último acesso: <span className="font-semibold text-[var(--foreground)]">{formatDateTime(portalLink?.lastAccessAt)}</span>
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Validade (dias)
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(Number(event.target.value || 90))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {[7, 30, 90].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setExpiresInDays(preset)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      expiresInDays === preset
                        ? "border border-sky-300 bg-[var(--surface-2)] text-sky-700"
                        : "border border-[var(--border)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    {preset}d
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={pinEnabled}
                  onChange={(event) => setPinEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-white"
                />
                Proteger com PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={!pinEnabled}
                placeholder="0000"
                className="w-16 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--foreground)] outline-none disabled:opacity-60 focus:border-sky-400"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleGeneratePortalLink}
                disabled={!selectedClient || isGeneratingLink}
                className="flex-1 rounded-md border border-sky-300 bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-60"
              >
                {isGeneratingLink ? "Gerando..." : portalLink ? "Renovar link" : "Gerar link"}
              </button>
              <button
                type="button"
                onClick={handleCopyPortalLink}
                className="flex-1 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={handleRevokePortalLink}
                disabled={!portalLink || portalLink.status === "Revogado" || isRevokingLink}
                className="flex-1 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
              >
                {isRevokingLink ? "..." : "Revogar"}
              </button>
            </div>

            {portalLink && !lastGeneratedUrl && !portalLink.shareUrl ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Por segurança, o link completo nao e reexibido apos recarregar. Ao tocar em copiar, um novo link e gerado automaticamente.
              </p>
            ) : null}

            {linkError ? <p className="mt-2 text-xs text-rose-600">{linkError}</p> : null}
            {copyStatus === "ok" ? <p className="mt-2 text-xs text-sky-700">Copiado!</p> : null}
            {copyStatus === "ok-renewed" ? <p className="mt-2 text-xs text-sky-700">Link renovado e copiado.</p> : null}
            {copyStatus === "error" ? <p className="mt-2 text-xs text-rose-600">Gere ou renove o link antes de copiar.</p> : null}
          </article>
        )}

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Tarefas</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {selectedTasks.filter((task) => task.completed).length}/{selectedTasks.length || 0}
            </p>
          </article>
          <article className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Sessões</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {selectedSessions.length}
            </p>
          </article>
        </div>

        <article className="mb-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold text-[var(--foreground)]">4. Tarefas para casa</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">O cliente verá estas tarefas logo ao abrir o portal.</p>

          {!selectedClient ? (
            <p className="mt-3 text-xs text-[var(--muted)]">Selecione um cliente para gerenciar tarefas.</p>
          ) : (
            <>
              {selectedTasks.length === 0 ? (
                <p className="mt-3 text-xs text-[var(--muted)]">Nenhuma tarefa cadastrada.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-white p-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 h-4 w-4 rounded border transition-colors ${
                          task.completed
                            ? "border-sky-600 bg-sky-500"
                            : "border-[var(--border)] bg-white"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)]">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Place 2x ao dia",
                  "Passeio com guia",
                  "Treino de foco",
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => handleTemplateTask(template)}
                    disabled={isAddingTask}
                    className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
                  >
                    + {template}
                  </button>
                ))}
              </div>

              {/* Frequência da tarefa — evita que o cliente marque só uma vez */}
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">Com que frequência o cliente deve fazer?</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {([
                    { key: "daily", label: "Todos os dias" },
                    { key: "weekly", label: "Dias da semana" },
                    { key: "once", label: "Uma vez" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTaskRecurrence(opt.key)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        taskRecurrence === opt.key
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border)] bg-white text-[var(--muted)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {taskRecurrence === "weekly" && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => {
                      const on = taskWeekdays.includes(i);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setTaskWeekdays((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))
                          }
                          className={`h-7 w-9 rounded-md text-[11px] font-semibold ${
                            on ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white text-[var(--muted)]"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddTask} className="mt-2 flex gap-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-sky-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isAddingTask}
                  className="rounded-lg border border-sky-300 bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-60"
                >
                  {isAddingTask ? "..." : "Adicionar"}
                </button>
              </form>
            </>
          )}
        </article>

        {selectedClient && selectedDog && (
          <article className="mb-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <h2 className="font-semibold text-[var(--foreground)]">Contexto do caso</h2>

            {selectedClient.environment && (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Ambiente</p>
                <p className="mt-1 text-xs text-[var(--foreground)]">{selectedClient.environment}</p>
              </div>
            )}

            {(selectedDog.trainingTypes ?? []).length > 0 && (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Focos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDog.trainingTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedEvents.length > 0 && (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Próximas sessões</p>
                <div className="mt-2 space-y-2">
                  {selectedEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="text-xs">
                      <p className="font-semibold text-[var(--foreground)]">{event.day} • {event.time}</p>
                      <p className="text-[var(--muted)]">Sessão {event.sessionNumber}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSessions.length > 0 && (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Últimas notas</p>
                <div className="mt-2 space-y-1">
                  {selectedSessions.slice(0, 2).map((session) => (
                    <div key={session.id} className="text-xs">
                      <p className="font-semibold text-[var(--foreground)]">{session.date}</p>
                      <p className="text-[var(--muted)]">{session.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedFeedbacks.length > 0 && (
              <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Feedback ({selectedFeedbacks.length})</p>
                <div className="mt-2 space-y-1">
                  {selectedFeedbacks.slice(0, 2).map((feedback) => (
                    <div key={feedback.id} className="text-xs">
                      <p className="font-semibold text-[var(--foreground)]">{feedback.author}</p>
                      <p className="text-[var(--muted)]">{feedback.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
        </div>
      </section>
    </AuthGuard>
  );
}
