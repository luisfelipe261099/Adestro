"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { DateField } from "@/components/date-field";
import { BEHAVIOR_CATEGORIES } from "@/lib/behavior";
import { AudioTranscriber } from "@/components/audio-transcriber";
import { SessionAiChat } from "@/components/session-ai-chat";
import { type TrainingMediaItem, useAppStore } from "@/lib/app-store";

const MAX_IMAGES = 4;
const MAX_DIMENSION = 1280;

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
};

function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`h-9 w-9 rounded-full border text-lg leading-none transition-colors ${
              active
                ? "border-amber-300 bg-amber-50 text-amber-500"
                : "border-[var(--border)] bg-white text-slate-300"
            }`}
            aria-label={`Definir ${star} estrela(s)`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

async function toCompressedMedia(file: File): Promise<TrainingMediaItem> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });

  const image = new window.Image();
  image.src = dataUrl;
  await image.decode();

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem.");
  }

  ctx.drawImage(image, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL("image/webp", 0.8);
  const base64 = compressedDataUrl.split(",")[1] ?? "";
  const sizeBytes = Math.ceil((base64.length * 3) / 4);

  return {
    id: `media-${Math.random().toString(36).slice(2, 10)}`,
    dataUrl: compressedDataUrl,
    width,
    height,
    sizeKb: Math.max(1, Math.round(sizeBytes / 1024)),
    createdAt: new Date().toISOString(),
  };
}

// Interfaces da evolução estruturada
interface ActivityItem {
  id: string;
  name: string;
  completed: boolean;
  notes: string;
}

interface CommandItem {
  id: string;
  command: string;
  rating: number; // 1-5 estrelas
  notes: string;
}

// Seções numeradas (1 a 8) — antes eram letras A–I.
type AccordionSection = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "yyyy-mm-dd" (input date) -> "dd/mm/yyyy" (formato salvo no histórico)
function toBrDate(value: string): string {
  if (!value) return new Date().toLocaleDateString("pt-BR");
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

// "dd/mm/yyyy" -> "yyyy-mm-dd" para preencher o input ao editar
function toInputDate(value: string): string {
  if (!value) return todayInputValue();
  const [d, m, y] = value.split("/");
  if (!y || !m || !d) return todayInputValue();
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export default function RegistroTreinoClientPage() {
  const searchParams = useSearchParams();
  const clients = useAppStore((state) => state.clients);
  const addTrainingSession = useAppStore((state) => state.addTrainingSession);
  const updateTrainingSession = useAppStore((state) => state.updateTrainingSession);
  const trainingSessions = useAppStore((state) => state.trainingSessions);
  const setEventStatus = useAppStore((state) => state.setEventStatus);
  const router = useRouter();

  const requestedClientId = searchParams.get("clientId") ?? "";
  const requestedDogId = searchParams.get("dogId") ?? "";
  // sessionId presente => modo edição (atualiza o MESMO treino, não cria novo).
  const requestedSessionId = searchParams.get("sessionId") ?? "";
  const requestedEventId = searchParams.get("eventId") ?? "";

  const [selectedClientId, setSelectedClientId] = useState(requestedClientId || clients[0]?.id || "");
  const [selectedDogId, setSelectedDogId] = useState(requestedDogId || clients[0]?.dogs[0]?.id || "");

  // Edição
  const [editingId, setEditingId] = useState<string>("");
  const [editingNumber, setEditingNumber] = useState<number | null>(null);
  const [hydratedEdit, setHydratedEdit] = useState(false);

  // Dados Gerais da Sessão
  const [title, setTitle] = useState("Sessão prática estruturada");
  const [sessionDate, setSessionDate] = useState(todayInputValue());
  const [sessionType, setSessionType] = useState<"Individual" | "Coletivo">("Individual");
  const [collectiveDogIds, setCollectiveDogIds] = useState<string[]>([]);
  const [sessionLocation, setSessionLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Modelos salvos do adestrador (seleção reutilizável, editável)
  const [savedActivities, setSavedActivities] = useState<string[]>([]);
  const [savedCommands, setSavedCommands] = useState<string[]>([]);
  const [savedTasks, setSavedTasks] = useState<string[]>([]);
  const [templatesMsg, setTemplatesMsg] = useState("");

  // Accordion de navegação
  const [expandedSection, setExpandedSection] = useState<AccordionSection>("1");

  // SEÇÃO 1: Atividades Trabalhadas
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivityName, setNewActivityName] = useState("");

  // SEÇÃO 2: Comandos de Obediência/Evolução
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [newCommandName, setNewCommandName] = useState("");

  // SEÇÃO 3: Descrição / Resumo Público
  const [description, setDescription] = useState("");

  // SEÇÃO 4: Notas Privadas
  const [privateNotes, setPrivateNotes] = useState("");

  // SEÇÃO 5: Transcrição & IA
  const [audioTranscription, setAudioTranscription] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiApproved, setAiApproved] = useState(false);

  // SEÇÃO 6: Galeria de Mídias
  const [draftMedia, setDraftMedia] = useState<TrainingMediaItem[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // SEÇÃO 7: Plano do Próximo Treino (Foco + comandos unificados, com INCLUIR)
  const [nextPlan, setNextPlan] = useState<string[]>([]);
  const [newNextPlanItem, setNewNextPlanItem] = useState("");

  // SEÇÃO 8: Tarefas de Casa (Cliente) — cada tarefa carrega a frequência
  // (once / daily / weekly + dias). Vira a recorrência do PortalTask no portal,
  // pra o cliente não marcar só uma vez quando a tarefa é recorrente.
  type NextHomeworkTask = { text: string; recurrence: "once" | "daily" | "weekly"; weekdays: number[] };
  const [nextTasks, setNextTasks] = useState<NextHomeworkTask[]>([]);
  const [newNextTaskText, setNewNextTaskText] = useState("");

  // SEÇÃO 8: Evolução comportamental (nota 0-5 por categoria)
  const [behaviorScores, setBehaviorScores] = useState<Record<string, number>>({});

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId]
  );

  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId]
  );

  // Carrega os modelos salvos (atividades/comandos/tarefas) do adestrador.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/trainer/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.defaultActivities)) setSavedActivities(data.defaultActivities);
        if (Array.isArray(data.defaultCommands)) setSavedCommands(data.defaultCommands);
        if (Array.isArray(data.defaultTutorTasks)) setSavedTasks(data.defaultTutorTasks);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Pré-seleção de cliente/cão (criação) e carga do treino (edição).
  useEffect(() => {
    if (!clients.length) return;

    if (requestedSessionId && !hydratedEdit) {
      const found = trainingSessions.find((s) => s.id === requestedSessionId);
      if (found) {
        setEditingId(found.id);
        setEditingNumber(found.number);
        setTitle(found.title || "Sessão prática estruturada");
        setSessionDate(toInputDate(found.date));
        setSessionLocation(found.location ?? "");
        if (found.clientId) setSelectedClientId(found.clientId);
        if (found.dogId) setSelectedDogId(found.dogId);

        const ds = found.dogSessions?.[0];
        if (ds) {
          setActivities(
            (ds.activities ?? []).map((a, i) => ({
              id: `act-${i}-${Date.now()}`,
              name: a.name,
              completed: a.completed,
              notes: a.notes ?? "",
            }))
          );
          setCommands(
            (ds.commands ?? []).map((c, i) => ({
              id: `cmd-${i}-${Date.now()}`,
              command: c.command,
              rating: c.rating ?? 3,
              notes: c.notes ?? "",
            }))
          );
          setDescription(ds.description ?? "");
          setPrivateNotes(ds.privateNotes ?? "");
          setAiSummary(ds.aiSummary ?? "");
          setAiApproved(Boolean(ds.aiApproved));
          if (Array.isArray(ds.media)) setDraftMedia(ds.media as TrainingMediaItem[]);
          // Plano do próximo treino = comandos recomendados + foco antigo (compat).
          const plan = [...(ds.nextCommands ?? [])];
          if (ds.nextFocus && !plan.includes(ds.nextFocus)) plan.unshift(ds.nextFocus);
          setNextPlan(plan);
          setNextTasks((ds.nextTasks ?? []).map((t: string) => ({ text: t, recurrence: "daily" as const, weekdays: [] })));
          setBehaviorScores(ds.behaviorScores ?? {});
        }
        setHydratedEdit(true);
        return;
      }
    }

    if (requestedSessionId) return; // aguardando o treino carregar do banco

    if (requestedClientId) {
      const requestedClient = clients.find((client) => client.id === requestedClientId);
      if (requestedClient) {
        setSelectedClientId(requestedClient.id);
        const hasRequestedDog = requestedDogId
          ? requestedClient.dogs.some((dog) => dog.id === requestedDogId)
          : false;
        setSelectedDogId(hasRequestedDog ? requestedDogId : requestedClient.dogs[0]?.id ?? "");
        return;
      }
    }

    if (!selectedClientId) {
      setSelectedClientId(clients[0].id);
      setSelectedDogId(clients[0].dogs[0]?.id ?? "");
    }
  }, [clients, requestedClientId, requestedDogId, requestedSessionId, selectedClientId, trainingSessions, hydratedEdit]);

  const isEditing = Boolean(editingId);

  // Treino já registrado para este cão NESTE dia? Evita duplicar: oferece editar
  // o existente em vez de criar outro (corrige o "cada registro vira um novo").
  const sameDateExisting = useMemo(() => {
    if (!selectedDog || isEditing) return null;
    const brDate = toBrDate(sessionDate);
    return trainingSessions.find((s) => s.dogId === selectedDog.id && s.date === brDate) ?? null;
  }, [selectedDog, isEditing, sessionDate, trainingSessions]);

  const nextSessionNumber = useMemo(() => {
    if (editingNumber) return editingNumber;
    if (!selectedDog) return 1;

    const list = trainingSessions.filter((session) => {
      if (session.dogId) return session.dogId === selectedDog.id;
      return session.dogName === selectedDog.name;
    });

    if (!list.length) return 1;
    return Math.max(...list.map((session) => session.number)) + 1;
  }, [selectedDog, trainingSessions, editingNumber]);

  // Salva a lista atual de atividades/comandos/tarefas nos modelos do adestrador.
  async function saveTemplates(kind: "activities" | "commands" | "tasks") {
    setTemplatesMsg("");
    let payload: Record<string, string[]> = {};
    if (kind === "activities") {
      const merged = Array.from(new Set([...savedActivities, ...activities.map((a) => a.name)]));
      payload = { defaultActivities: merged };
      setSavedActivities(merged);
    } else if (kind === "commands") {
      const merged = Array.from(new Set([...savedCommands, ...commands.map((c) => c.command)]));
      payload = { defaultCommands: merged };
      setSavedCommands(merged);
    } else {
      const merged = Array.from(new Set([...savedTasks, ...nextTasks.map((t) => t.text)]));
      payload = { defaultTutorTasks: merged };
      setSavedTasks(merged);
    }
    try {
      const res = await fetch("/api/trainer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setTemplatesMsg(res.ok ? "Modelos atualizados ✓" : "Não foi possível salvar os modelos.");
    } catch {
      setTemplatesMsg("Falha ao salvar os modelos.");
    }
    window.setTimeout(() => setTemplatesMsg(""), 2500);
  }

  // Análise por IA
  async function generateMockAIAnalysis() {
    if (!selectedDog) return;
    setIsGeneratingAI(true);
    try {
      const notes = [
        description,
        audioTranscription,
        privateNotes,
        ...activities.map((a) => `${a.name}: ${a.completed ? "feito" : "pendente"}. ${a.notes}`),
        ...commands.map((c) => `${c.command} (${c.rating}/5): ${c.notes}`),
      ].filter(Boolean).join("\n");

      const response = await fetch("/api/ia/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: `draft-${Date.now()}`,
          trainer_notes: notes || "Sessão sem notas detalhadas.",
          dog_id: selectedDog.id,
          video_tags: commands.map((c) => c.command.toLowerCase()),
          duration_minutes: 60,
          techniques_used: activities.map((a) => a.name),
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const analysis = payload?.analysis;
        if (analysis) {
          setAiSummary(analysis.summary_for_tutor || "");
          const plan: string[] = [];
          if (analysis.next_steps?.[0]) plan.push(analysis.next_steps[0]);
          const lowRated = commands.filter((c) => c.rating <= 3).map((c) => c.command);
          for (const cmd of lowRated) if (!plan.includes(cmd)) plan.push(cmd);
          if (plan.length > 0) setNextPlan((prev) => Array.from(new Set([...prev, ...plan])));
          if (Array.isArray(analysis.recommended_exercises) && analysis.recommended_exercises.length > 0) {
            setNextTasks(analysis.recommended_exercises);
          }
          setAiApproved(false);
          setExpandedSection("4");
          return;
        }
      }
      setAiSummary("Não foi possível gerar a análise agora. Preencha mais detalhes na descrição e tente novamente.");
    } catch {
      setAiSummary("Falha ao consultar a IA. Verifique sua conexão e tente novamente.");
    } finally {
      setIsGeneratingAI(false);
    }
  }

  // SEÇÃO 1
  const addActivity = (name?: string) => {
    const value = (name ?? newActivityName).trim();
    if (!value) return;
    if (activities.some((a) => a.name.toLowerCase() === value.toLowerCase())) {
      if (!name) setNewActivityName("");
      return;
    }
    setActivities((prev) => [...prev, { id: `act-${Date.now()}`, name: value, completed: false, notes: "" }]);
    if (!name) setNewActivityName("");
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((act) => act.id !== id));
  };

  const updateActivity = (id: string, field: keyof ActivityItem, value: string | boolean) => {
    setActivities(activities.map((act) => (act.id === id ? { ...act, [field]: value } : act)));
  };

  // SEÇÃO 2
  const addCommand = (name?: string) => {
    const value = (name ?? newCommandName).trim();
    if (!value) return;
    if (commands.some((c) => c.command.toLowerCase() === value.toLowerCase())) {
      if (!name) setNewCommandName("");
      return;
    }
    setCommands((prev) => [...prev, { id: `cmd-${Date.now()}`, command: value, rating: 3, notes: "" }]);
    if (!name) setNewCommandName("");
  };

  const removeCommand = (id: string) => {
    setCommands(commands.filter((cmd) => cmd.id !== id));
  };

  const updateCommand = (id: string, field: keyof CommandItem, value: string | number) => {
    setCommands(commands.map((cmd) => (cmd.id === id ? { ...cmd, [field]: value } : cmd)));
  };

  // Imagens
  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    setError("");

    if (draftMedia.length >= MAX_IMAGES) {
      setError(`Limite de ${MAX_IMAGES} imagens por registro.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, MAX_IMAGES - draftMedia.length);
    setIsProcessingImages(true);

    try {
      const converted = await Promise.all(selectedFiles.map((file) => toCompressedMedia(file)));
      setDraftMedia((current) => [...current, ...converted]);
    } catch {
      setError("Não foi possível processar as imagens.");
    } finally {
      setIsProcessingImages(false);
      event.target.value = "";
    }
  }

  function removeMedia(mediaId: string) {
    setDraftMedia((current) => current.filter((item) => item.id !== mediaId));
  }

  function resetForm() {
    setTitle("Sessão prática estruturada");
    setSessionDate(todayInputValue());
    setActivities([]);
    setCommands([]);
    setDescription("");
    setPrivateNotes("");
    setAiSummary("");
    setAiApproved(false);
    setAudioTranscription("");
    setDraftMedia([]);
    setNextPlan([]);
    setNextTasks([]);
    setExpandedSection("1");
    setCollectiveDogIds([]);
    setSessionType("Individual");
  }

  // Submit — cria OU edita o mesmo treino.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (!selectedClient || !selectedDog) {
      setError("Selecione cliente e cão para registrar o treino.");
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    const sessionDogIds =
      sessionType === "Coletivo" ? [selectedDog.id, ...collectiveDogIds] : [selectedDog.id];

    const dogSessionsPayload = sessionDogIds.map((dogId) => ({
      dogId,
      activities,
      commands,
      description: description.trim(),
      privateNotes: privateNotes.trim(),
      aiSummary: aiSummary.trim(),
      aiApproved,
      media: draftMedia,
      nextFocus: "",
      nextCommands: nextPlan,
      nextTasks: nextTasks.map((t) => t.text),
      nextTaskOptions: nextTasks.map((t) => ({ text: t.text, recurrence: t.recurrence, weekdays: t.weekdays })),
      behaviorScores,
    }));

    const dogNameLabel =
      sessionType === "Coletivo" && collectiveDogIds.length > 0
        ? `${selectedDog.name} + ${collectiveDogIds.length} (turma)`
        : selectedDog.name;

    const notesPayload = commands.map((c) => ({
      block: c.command,
      score: c.rating * 2,
      comment: c.notes,
    }));

    try {
      let ok = false;
      if (isEditing) {
        ok = await updateTrainingSession({
          id: editingId,
          title: title.trim(),
          date: toBrDate(sessionDate),
          clientName: selectedClient.name,
          dogId: selectedDog.id,
          dogName: dogNameLabel,
          notes: notesPayload,
          media: draftMedia,
          dogSessions: dogSessionsPayload,
          location: sessionLocation,
          type: sessionType,
          status: "Realizado",
        });
      } else {
        ok = await addTrainingSession({
          number: nextSessionNumber,
          title: title.trim(),
          date: toBrDate(sessionDate),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          dogId: selectedDog.id,
          dogName: dogNameLabel,
          notes: notesPayload,
          media: draftMedia,
          // @ts-expect-error — campos estendidos suportados pela API
          dogSessions: dogSessionsPayload,
          type: sessionType,
          location: sessionLocation,
          status: "Realizado",
        });
      }

      if (!ok) {
        setError(isEditing ? "Erro ao atualizar o treino. Verifique a conexão." : "Erro ao salvar o treino. Verifique a conexão.");
        return;
      }

      // Veio de um agendamento? Marca o evento como "Confirmado" — assim ele
      // deixa de aparecer como "Pendente" na agenda depois do treino registrado.
      if (requestedEventId) {
        await setEventStatus(requestedEventId, "Confirmado");
      }
      // Volta para a lista de treinos do MESMO cão.
      const backUrl = `/treinos?clientId=${selectedClientId}&dogId=${selectedDogId}`;
      resetForm();
      router.push(backUrl);
    } catch {
      setError("Ocorreu um erro no processamento.");
    } finally {
      setIsSaving(false);
    }
  }

  const renderSectionHeader = (num: AccordionSection, name: string) => {
    const isExpanded = expandedSection === num;
    return (
      <button
        type="button"
        onClick={() => setExpandedSection(isExpanded ? "1" : num)}
        className="flex w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3.5 text-left font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
            {num}
          </span>
          {name}
        </span>
        <span className="text-xs text-[var(--muted)]">{isExpanded ? "Recolher ▲" : "Expandir ▼"}</span>
      </button>
    );
  };

  // Sugestões (modelos salvos) ainda não usadas na lista atual.
  const activitySuggestions = savedActivities.filter(
    (s) => !activities.some((a) => a.name.toLowerCase() === s.toLowerCase())
  );
  const commandSuggestions = savedCommands.filter(
    (s) => !commands.some((c) => c.command.toLowerCase() === s.toLowerCase())
  );
  const taskSuggestions = savedTasks.filter((s) => !nextTasks.some((t) => t.text === s));

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="page-header">
          <div className="page-header-actions">
            <div className="min-w-0">
              <p className="text-eyebrow mb-1.5">Treinos</p>
              <h1 className="text-display">{isEditing ? "Editar treino" : "Registrar sessão"}</h1>
              <p className="mt-1 text-subtitle">
                {isEditing
                  ? `Editando o treino #${nextSessionNumber} — as alterações salvam no mesmo registro.`
                  : "Preenchimento guiado das seções 1 a 8 da página de treino."}
              </p>
            </div>
            <Link href="/treinos" className="btn-secondary text-[12.5px]">Ver histórico</Link>
          </div>
        </header>

        <div className="card p-5">
          <form onSubmit={handleSubmit} className="mt-1 grid gap-3">
            {/* Metadados Básicos */}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[var(--muted)]">Cliente</span>
                <select
                  value={selectedClientId}
                  onChange={(event) => {
                    const nextClientId = event.target.value;
                    const nextClient = clients.find((client) => client.id === nextClientId);
                    setSelectedClientId(nextClientId);
                    setSelectedDogId(nextClient?.dogs[0]?.id ?? "");
                  }}
                  disabled={isEditing}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-[var(--muted)]">Cão</span>
                <select
                  value={selectedDogId}
                  onChange={(event) => setSelectedDogId(event.target.value)}
                  disabled={isEditing}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                >
                  {(selectedClient?.dogs ?? []).map((dog) => (
                    <option key={dog.id} value={dog.id}>{dog.name} • {dog.breed}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Tipo de sessão */}
            <div className="grid gap-2">
              <span className="text-xs font-medium text-[var(--muted)]">Tipo de sessão</span>
              <div className="flex gap-2">
                {(["Individual", "Coletivo"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSessionType(t);
                      if (t === "Individual") setCollectiveDogIds([]);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${sessionType === t ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]" : "border-[var(--border)] text-[var(--muted)]"}`}
                  >
                    {t === "Individual" ? "🐕 Individual" : "🐕‍🦺 Coletivo (turma)"}
                  </button>
                ))}
              </div>
              {sessionType === "Coletivo" && (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-white/60 p-3">
                  <p className="text-[11px] text-[var(--muted)]">
                    Marque os outros cães da turma. O conteúdo abaixo é aplicado a todos, mas cada cão recebe seu próprio registro e dever de casa.
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {clients.flatMap((client) =>
                      client.dogs
                        .filter((dog) => dog.id !== selectedDog?.id)
                        .map((dog) => {
                          const checked = collectiveDogIds.includes(dog.id);
                          return (
                            <label key={dog.id} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setCollectiveDogIds((prev) =>
                                    e.target.checked ? [...prev, dog.id] : prev.filter((id) => id !== dog.id),
                                  )
                                }
                                className="h-3.5 w-3.5"
                              />
                              <span className="truncate">{dog.name} <span className="text-[var(--muted)]">· {client.name}</span></span>
                            </label>
                          );
                        }),
                    )}
                  </div>
                  {collectiveDogIds.length > 0 && (
                    <p className="mt-2 text-[11px] font-semibold text-[var(--accent-text)]">
                      Turma: {collectiveDogIds.length + 1} cães (incluindo {selectedDog?.name}).
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-medium text-[var(--muted)]">Data do treino</span>
                <DateField
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="w-full"
                  required
                />
              </label>

              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-medium text-[var(--muted)]">Título da Sessão</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </label>

              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-medium text-[var(--muted)]">Local do Treino</span>
                <input
                  value={sessionLocation}
                  onChange={(event) => setSessionLocation(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            {sameDateExisting ? (
              <div
                className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-[var(--warning-bg)] px-3 py-2.5"
                style={{ borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)" }}
              >
                <p className="text-[12px] text-[var(--foreground)]">
                  <strong>{selectedDog?.name}</strong> já tem um treino registrado em {sameDateExisting.date}. Edite o
                  existente em vez de criar outro.
                </p>
                <a href={`/treinos/registro?sessionId=${sameDateExisting.id}`} className="btn-secondary text-[12px]">
                  Editar este treino
                </a>
              </div>
            ) : null}

            {/* SEÇÕES 1 a 8 */}
            <div className="mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-white">

              {/* SEÇÃO 1: Atividades e Comandos Trabalhados (Atividades + Comandos unificados na mesma seção) */}
              {renderSectionHeader("1", "Atividades e Comandos Trabalhados")}
              {expandedSection === "1" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">
                    Tudo o que foi trabalhado nesta sessão, em duas partes: <b>atividades praticadas</b> (exercícios, com observações) e, mais abaixo, <b>comandos de obediência</b> (avaliados por estrelas). A seleção fica salva para reutilizar.
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">Atividades praticadas</p>

                  {activitySuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activitySuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addActivity(s)}
                          className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-text)] hover:bg-[var(--accent)]/10"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 text-xs font-semibold text-[var(--foreground)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={act.completed}
                              onChange={(e) => updateActivity(act.id, "completed", e.target.checked)}
                              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                            />
                            {act.name}
                          </label>
                          <button
                            type="button"
                            onClick={() => removeActivity(act.id)}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                        <input
                          placeholder="Observações da atividade..."
                          value={act.notes}
                          onChange={(e) => updateActivity(act.id, "notes", e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Nova atividade (Ex: Foco no portão)"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addActivity(); } }}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button type="button" onClick={() => addActivity()} className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white">
                      Incluir
                    </button>
                  </div>
                  {activities.length > 0 && (
                    <button type="button" onClick={() => saveTemplates("activities")} className="text-[11px] font-semibold text-[var(--accent-text)] hover:underline">
                      💾 Salvar estas nos meus modelos
                    </button>
                  )}
                </div>
              )}

              {/* Comandos de obediência — 2ª parte da Seção 1 (mesmo acordeão, sem header próprio) */}
              {expandedSection === "1" && (
                <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">Comandos de obediência (avalie por estrelas)</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    Escolha dos seus comandos salvos ou adicione novos e dê estrelas (1-5) ao desempenho.
                  </p>

                  {commandSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {commandSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addCommand(s)}
                          className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-text)] hover:bg-[var(--accent)]/10"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {commands.map((cmd) => (
                      <div key={cmd.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--foreground)]">{cmd.command}</span>
                          <button
                            type="button"
                            onClick={() => removeCommand(cmd.id)}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <StarRating value={cmd.rating} onChange={(rating) => updateCommand(cmd.id, "rating", rating)} />
                          <span className="text-xs font-bold text-[var(--foreground)]">{cmd.rating}/5</span>
                        </div>
                        <input
                          placeholder="Observações da evolução..."
                          value={cmd.notes}
                          onChange={(e) => updateCommand(cmd.id, "notes", e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Novo comando (Ex: Junto, Fica, Solta)"
                      value={newCommandName}
                      onChange={(e) => setNewCommandName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCommand(); } }}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button type="button" onClick={() => addCommand()} className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white">
                      Incluir
                    </button>
                  </div>
                  {commands.length > 0 && (
                    <button type="button" onClick={() => saveTemplates("commands")} className="text-[11px] font-semibold text-[var(--accent-text)] hover:underline">
                      💾 Salvar estes nos meus modelos
                    </button>
                  )}
                </div>
              )}

              {/* SEÇÃO 3: Resumo Público */}
              {renderSectionHeader("2", "Resumo Público para o Cliente")}
              {expandedSection === "2" && (
                <div className="p-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                    placeholder="Descreva de forma simples e estimulante o resumo do treino que o cliente verá no portal."
                  />
                </div>
              )}

              {/* SEÇÃO 4: Notas Privadas */}
              {renderSectionHeader("3", "Notas Privadas (Confidencial)")}
              {expandedSection === "3" && (
                <div className="p-4">
                  <p className="mb-2 text-[10px] text-rose-700">⚠️ Visível apenas para adestradores. Nunca compartilhado com o cliente.</p>
                  <textarea
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-rose-100 bg-rose-50/20 px-3 py-2 text-xs outline-none focus:border-rose-300 text-slate-800"
                    placeholder="Comportamentos observados, anotações de temperamento, observações sobre o cliente, etc."
                  />
                </div>
              )}

              {/* SEÇÃO 5: Transcrição & IA */}
              {renderSectionHeader("4", "Transcrição de Áudio e Análise de IA")}
              {expandedSection === "4" && (
                <div className="p-4 space-y-3.5">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">🎤 Ditado de Notas por Voz</h4>
                    <p className="text-[10px] text-[var(--muted)]">Use o microfone do dispositivo para transcrever observações. O áudio fica no seu navegador.</p>

                    <AudioTranscriber
                      className="mt-2"
                      value={audioTranscription}
                      hint="Pressione, fale e toque em Parar para inserir o texto"
                      onAppend={(text) =>
                        setAudioTranscription((current) => (current ? `${current} ${text}` : text))
                      }
                    />

                    <textarea
                      value={audioTranscription}
                      onChange={(e) => setAudioTranscription(e.target.value)}
                      rows={3}
                      className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-xs outline-none"
                      placeholder="A transcrição em tempo real aparece aqui — você pode editar livremente."
                    />
                  </div>

                  <hr className="border-[var(--border)]" />

                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">🤖 Análise por Inteligência Artificial (Adestro AI)</h4>
                    <p className="text-[10px] text-[var(--muted)]">Gera automaticamente o resumo para o cliente, plano do próximo treino e checklist de tarefas.</p>

                    <button
                      type="button"
                      onClick={generateMockAIAnalysis}
                      disabled={isGeneratingAI}
                      className="mt-2.5 w-full rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-sm hover:from-purple-700 transition"
                    >
                      {isGeneratingAI ? "Gerando Análise..." : "✨ Gerar Relatório e Análise IA"}
                    </button>

                    {aiSummary && (
                      <div className="mt-3 rounded-md border border-purple-200 bg-purple-50/55 p-3 space-y-2">
                        <p className="text-xs font-bold text-purple-900">✨ Resumo Gerado pela IA:</p>
                        <p className="text-xs text-purple-950 italic">&quot;{aiSummary}&quot;</p>

                        <div className="rounded-lg border border-purple-100 bg-white p-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiApproved}
                              onChange={(e) => setAiApproved(e.target.checked)}
                              className="rounded border-purple-300 text-purple-600 focus:ring-purple-400"
                            />
                            Aprovar resumo da IA e dever de casa para o Portal do Cliente
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEÇÃO 6: Galeria */}
              {renderSectionHeader("5", "Galeria de Mídias do Treino")}
              {expandedSection === "5" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">Anexe fotos demonstrativas da aula. O sistema comprime as imagens.</p>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                    className="block w-full text-xs text-[var(--muted)] file:mr-2 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />

                  {isProcessingImages && <p className="text-xs text-[var(--accent-text)]">Compactando imagens...</p>}

                  {draftMedia.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {draftMedia.map((item) => (
                        <div key={item.id} className="relative rounded-md border border-[var(--border)] bg-slate-50 p-1.5 flex flex-col items-center">
                          <div className="relative h-20 w-full overflow-hidden rounded-lg">
                            <Image src={item.dataUrl} alt="Foto do treino" fill unoptimized className="object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedia(item.id)}
                            className="mt-1 w-full rounded bg-rose-50 text-[10px] font-bold text-rose-700 py-0.5 border border-rose-100"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SEÇÃO 7: Plano do Próximo Treino (Foco + comandos, com INCLUIR) */}
              {renderSectionHeader("6", "Plano do Próximo Treino")}
              {expandedSection === "6" && (
                <div className="p-4 space-y-2">
                  <p className="text-[11px] text-[var(--muted)]">
                    Liste o que fazer no próximo encontro (foco + comandos a reforçar). Use <strong>Incluir</strong> para adicionar cada item.
                  </p>
                  <div className="space-y-1.5">
                    {nextPlan.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-2)]/50 p-2 text-xs text-[var(--foreground)]">
                        <span className="flex-1 leading-snug">🎯 {item}</span>
                        <button
                          type="button"
                          onClick={() => setNextPlan(nextPlan.filter((_, idx) => idx !== i))}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Ex: Reforçar permanência no comando Fica"
                      value={newNextPlanItem}
                      onChange={(e) => setNewNextPlanItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!newNextPlanItem.trim()) return;
                          setNextPlan([...nextPlan, newNextPlanItem.trim()]);
                          setNewNextPlanItem("");
                        }
                      }}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newNextPlanItem.trim()) return;
                        setNextPlan([...nextPlan, newNextPlanItem.trim()]);
                        setNewNextPlanItem("");
                      }}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Incluir
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO 8: Dever de Casa */}
              {renderSectionHeader("7", "Dever de Casa — Tarefas do Cliente")}
              {expandedSection === "7" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">
                    Checklist de tarefas de casa para o cliente no portal. Defina a frequência de cada tarefa abaixo — assim o cliente marca todos os dias (ou nos dias certos), não só uma vez.
                  </p>

                  {taskSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setNextTasks((prev) =>
                              prev.some((t) => t.text === s) ? prev : [...prev, { text: s, recurrence: "daily", weekdays: [] }],
                            )
                          }
                          className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-text)] hover:bg-[var(--accent)]/10"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {nextTasks.map((task, i) => (
                      <div key={i} className="rounded-md bg-[var(--surface-2)]/50 p-2 text-xs text-[var(--foreground)]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex-1 leading-snug">🏠 {task.text}</span>
                          <button
                            type="button"
                            onClick={() => setNextTasks(nextTasks.filter((_, idx) => idx !== i))}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {([
                            { key: "daily", label: "Todos os dias" },
                            { key: "weekly", label: "Dias da semana" },
                            { key: "once", label: "Uma vez" },
                          ] as const).map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() =>
                                setNextTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, recurrence: opt.key } : t)))
                              }
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                task.recurrence === opt.key
                                  ? "bg-[var(--accent)] text-white"
                                  : "border border-[var(--border)] bg-white text-[var(--muted)]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {task.recurrence === "weekly" && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, wi) => {
                              const on = task.weekdays.includes(wi);
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() =>
                                    setNextTasks((prev) =>
                                      prev.map((t, idx) =>
                                        idx === i
                                          ? { ...t, weekdays: on ? t.weekdays.filter((x) => x !== wi) : [...t.weekdays, wi] }
                                          : t,
                                      ),
                                    )
                                  }
                                  className={`h-6 w-8 rounded-md text-[10px] font-semibold ${
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
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Nova tarefa de casa para o cliente..."
                      value={newNextTaskText}
                      onChange={(e) => setNewNextTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!newNextTaskText.trim()) return;
                          setNextTasks([...nextTasks, { text: newNextTaskText.trim(), recurrence: "daily", weekdays: [] }]);
                          setNewNextTaskText("");
                        }
                      }}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newNextTaskText.trim()) return;
                        setNextTasks([...nextTasks, { text: newNextTaskText.trim(), recurrence: "daily", weekdays: [] }]);
                        setNewNextTaskText("");
                      }}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Incluir
                    </button>
                  </div>
                  {nextTasks.length > 0 && (
                    <button type="button" onClick={() => saveTemplates("tasks")} className="text-[11px] font-semibold text-[var(--accent-text)] hover:underline">
                      💾 Salvar estas nos meus modelos
                    </button>
                  )}
                </div>
              )}

              {/* SEÇÃO 8: Evolução Comportamental (nota 0-5 por categoria) */}
              {renderSectionHeader("8", "Evolução Comportamental")}
              {expandedSection === "8" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">
                    Dê uma nota (0–5) para cada área. Isso alimenta a evolução do cão ao longo das sessões.
                  </p>
                  <div className="space-y-2">
                    {BEHAVIOR_CATEGORIES.map((cat) => (
                      <div
                        key={cat.key}
                        className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-2)]/40 p-2.5"
                      >
                        <span className="text-xs font-medium text-[var(--foreground)]">{cat.label}</span>
                        <div className="flex items-center gap-2">
                          <StarRating
                            value={behaviorScores[cat.key] ?? 0}
                            onChange={(rating) => setBehaviorScores((prev) => ({ ...prev, [cat.key]: rating }))}
                          />
                          <span className="w-7 text-right text-xs font-bold text-[var(--foreground)]">
                            {behaviorScores[cat.key] ?? 0}/5
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {templatesMsg && <p className="text-[11px] font-medium text-[var(--accent-text)]">{templatesMsg}</p>}
            {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

            <button
              type="submit"
              disabled={isSaving || isProcessingImages}
              className="pc-primary-action rounded-full py-2.5 text-sm font-semibold disabled:opacity-60 mt-1"
            >
              {isSaving
                ? (isEditing ? "Atualizando treino..." : "Salvando treino...")
                : (isEditing ? "Salvar alterações deste treino" : "Salvar Evolução Estruturada")}
            </button>
          </form>
        </div>
        <SessionAiChat
          context={{
            dogName: selectedDog?.name,
            dogBreed: selectedDog?.breed,
            sessionDescription: description,
            commandsWorked: commands.map((c) => ({ command: c.command, rating: c.rating, notes: c.notes })),
            privateNotes: privateNotes,
          }}
        />
      </main>
    </AuthGuard>
  );
}
