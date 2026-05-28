"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { AudioTranscriber } from "@/components/audio-transcriber";
import { SessionAiChat } from "@/components/session-ai-chat";
import { type TrainingMediaItem, useAppStore } from "@/lib/app-store";

const MAX_IMAGES = 4;
const MAX_RAW_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
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

type AccordionSection = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export default function RegistroTreinoClientPage() {
  const searchParams = useSearchParams();
  const clients = useAppStore((state) => state.clients);
  const addTrainingSession = useAppStore((state) => state.addTrainingSession);
  const trainingSessions = useAppStore((state) => state.trainingSessions);

  const requestedClientId = searchParams.get("clientId") ?? "";
  const requestedDogId = searchParams.get("dogId") ?? "";

  const [selectedClientId, setSelectedClientId] = useState(requestedClientId || clients[0]?.id || "");
  const [selectedDogId, setSelectedDogId] = useState(requestedDogId || clients[0]?.dogs[0]?.id || "");
  
  // Dados Gerais da Sessão
  const [title, setTitle] = useState("Sessão prática estruturada");
  const [sessionType, setSessionType] = useState<"Individual" | "Coletivo">("Individual");
  const [sessionLocation, setSessionLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Accordion de navegação
  const [expandedSection, setExpandedSection] = useState<AccordionSection>("A");

  // SEÇÃO A: Atividades Trabalhadas
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivityName, setNewActivityName] = useState("");

  // SEÇÃO B: Comandos de Obediência/Evolução
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [newCommandName, setNewCommandName] = useState("");

  // SEÇÃO C: Descrição / Resumo Público
  const [description, setDescription] = useState("");

  // SEÇÃO D: Notas Privadas
  const [privateNotes, setPrivateNotes] = useState("");

  // SEÇÃO E: Transcrição & IA
  const [audioTranscription, setAudioTranscription] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiApproved, setAiApproved] = useState(false);

  // SEÇÃO F: Galeria de Mídias
  const [draftMedia, setDraftMedia] = useState<TrainingMediaItem[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // SEÇÃO G: Próximo Foco
  const [nextFocus, setNextFocus] = useState("");

  // SEÇÃO H: Próximos Comandos
  const [nextCommands, setNextCommands] = useState<string[]>([]);
  const [newNextCommandName, setNewNextCommandName] = useState("");

  // SEÇÃO I: Tarefas de Casa (Tutor)
  const [nextTasks, setNextTasks] = useState<string[]>([]);
  const [newNextTaskText, setNewNextTaskText] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId]
  );

  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId]
  );

  useEffect(() => {
    if (!clients.length) return;

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
  }, [clients, requestedClientId, requestedDogId, selectedClientId]);

  const nextSessionNumber = useMemo(() => {
    if (!selectedDog) return 1;

    const list = trainingSessions.filter((session) => {
      if (session.dogId) return session.dogId === selectedDog.id;
      return session.dogName === selectedDog.name;
    });

    if (!list.length) return 1;
    return Math.max(...list.map((session) => session.number)) + 1;
  }, [selectedDog, trainingSessions]);

  // Análise por IA — chama o endpoint /api/ia/analyze-session com os dados reais
  // que o adestrador acabou de preencher na sessão.
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
          if (analysis.next_steps?.[0]) setNextFocus(analysis.next_steps[0]);
          if (Array.isArray(analysis.recommended_exercises) && analysis.recommended_exercises.length > 0) {
            setNextTasks(analysis.recommended_exercises);
          }
          const lowRated = commands.filter((c) => c.rating <= 3).map((c) => c.command);
          if (lowRated.length > 0) setNextCommands(lowRated);
          setAiApproved(false);
          setExpandedSection("E");
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

  // Funções Auxiliares SEÇÃO A
  const addActivity = () => {
    if (!newActivityName.trim()) return;
    setActivities([
      ...activities,
      {
        id: `act-${Date.now()}`,
        name: newActivityName.trim(),
        completed: false,
        notes: ""
      }
    ]);
    setNewActivityName("");
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((act) => act.id !== id));
  };

  const updateActivity = (id: string, field: keyof ActivityItem, value: any) => {
    setActivities(activities.map((act) => (act.id === id ? { ...act, [field]: value } : act)));
  };

  // Funções Auxiliares SEÇÃO B
  const addCommand = () => {
    if (!newCommandName.trim()) return;
    setCommands([
      ...commands,
      {
        id: `cmd-${Date.now()}`,
        command: newCommandName.trim(),
        rating: 3,
        notes: ""
      }
    ]);
    setNewCommandName("");
  };

  const removeCommand = (id: string) => {
    setCommands(commands.filter((cmd) => cmd.id !== id));
  };

  const updateCommand = (id: string, field: keyof CommandItem, value: any) => {
    setCommands(commands.map((cmd) => (cmd.id === id ? { ...cmd, [field]: value } : cmd)));
  };

  // Imagens do treino
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

  // Submit Geral
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (!selectedClient || !selectedDog) {
      setError("Selecione tutor e cão para registrar o treino.");
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    // Estruturando o payload da DogTrainingSession
    const dogSessionPayload = {
      dogId: selectedDog.id,
      activities,
      commands,
      description: description.trim(),
      privateNotes: privateNotes.trim(),
      aiSummary: aiSummary.trim(),
      aiApproved,
      media: draftMedia,
      nextFocus: nextFocus.trim(),
      nextCommands,
      nextTasks
    };

    try {
      const ok = await addTrainingSession({
        number: nextSessionNumber,
        title: title.trim(),
        date: new Date().toLocaleDateString("pt-BR"),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        dogId: selectedDog.id,
        dogName: selectedDog.name,
        notes: commands.map((c) => ({
          block: c.command,
          score: c.rating * 2, // Converte 1-5 estrelas para nota 1-10 herdada
          comment: c.notes
        })),
        media: draftMedia,
        // Enviar os dados estendidos suportados pela nova API
        // @ts-ignore
        dogSessions: [dogSessionPayload],
        type: sessionType,
        location: sessionLocation,
        status: "Realizado"
      });

      if (!ok) {
        setError("Erro ao salvar o treino estruturado. Verifique a conexão.");
        return;
      }

      setMessage("Treino estruturado (Seções A a I) registrado com sucesso!");
      // Resetar form estruturado
      setDescription("");
      setPrivateNotes("");
      setAiSummary("");
      setAiApproved(false);
      setAudioTranscription("");
      setDraftMedia([]);
      setExpandedSection("A");
    } catch {
      setError("Ocorreu um erro no processamento.");
    } finally {
      setIsSaving(false);
    }
  }

  const renderSectionHeader = (letter: AccordionSection, name: string) => {
    const isExpanded = expandedSection === letter;
    return (
      <button
        type="button"
        onClick={() => setExpandedSection(isExpanded ? "A" : letter)}
        className="flex w-full items-center justify-between border-b border-[var(--border)] bg-[#fcfdfe] px-4 py-3.5 text-left font-semibold text-[var(--foreground)] hover:bg-[#f5fafe] transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-[var(--foreground)]">
            {letter}
          </span>
          {name}
        </span>
        <span className="text-xs text-[var(--muted)]">{isExpanded ? "Recolher ▲" : "Expandir ▼"}</span>
      </button>
    );
  };

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="page-header">
          <div className="page-header-actions">
            <div className="min-w-0">
              <p className="text-eyebrow mb-1.5">Treinos</p>
              <h1 className="text-display">Registrar sessão</h1>
              <p className="mt-1 text-subtitle">Preenchimento guiado das seções A a I da página de treino.</p>
            </div>
            <Link href="/treinos" className="btn-secondary text-[12.5px]">Ver histórico</Link>
          </div>
        </header>

        <div className="card p-5">

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            {/* Metadados Básicos */}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[var(--muted)]">Tutor</span>
                <select
                  value={selectedClientId}
                  onChange={(event) => {
                    const nextClientId = event.target.value;
                    const nextClient = clients.find((client) => client.id === nextClientId);
                    setSelectedClientId(nextClientId);
                    setSelectedDogId(nextClient?.dogs[0]?.id ?? "");
                  }}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
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
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                >
                  {(selectedClient?.dogs ?? []).map((dog) => (
                    <option key={dog.id} value={dog.id}>{dog.name} • {dog.breed}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[var(--muted)]">Título da Sessão</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-[var(--muted)]">Local do Treino</span>
                <input
                  value={sessionLocation}
                  onChange={(event) => setSessionLocation(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </div>

            {/* SEÇÕES ACORDEÃO A a I */}
            <div className="mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-white">
              
              {/* SEÇÃO A: Atividades Trabalhadas */}
              {renderSectionHeader("A", "Atividades Trabalhadas")}
              {expandedSection === "A" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">Adicione as atividades executadas no treino e relate se foram concluídas ou necessitam ajustes.</p>
                  
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-[#fafcff] p-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 text-xs font-semibold text-[#1e5272] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={act.completed}
                              onChange={(e) => updateActivity(act.id, "completed", e.target.checked)}
                              className="rounded border-[var(--border)] text-[var(--foreground)] focus:ring-sky-400"
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
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-300"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Nova atividade (Ex: Foco no portão)"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={addActivity}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Incluir
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO B: Comandos de Obediência/Evolução */}
              {renderSectionHeader("B", "Comandos de Obediência / Evolução")}
              {expandedSection === "B" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">Defina estrelas de desempenho (1-5) para cada comando de obediência trabalhado.</p>
                  
                  <div className="space-y-3">
                    {commands.map((cmd) => (
                      <div key={cmd.id} className="rounded-md border border-slate-100 bg-[#fafcff] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1e5272]">{cmd.command}</span>
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-300"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Novo comando (Ex: Junto, Fica, Solta)"
                      value={newCommandName}
                      onChange={(e) => setNewCommandName(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={addCommand}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Incluir
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO C: Descrição / Resumo Público */}
              {renderSectionHeader("C", "Resumo Público para o Tutor")}
              {expandedSection === "C" && (
                <div className="p-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                    placeholder="Descreva de forma simples e estimulante o resumo do treino que o tutor verá no portal."
                  />
                </div>
              )}

              {/* SEÇÃO D: Notas Privadas */}
              {renderSectionHeader("D", "Notas Privadas (Confidencial)")}
              {expandedSection === "D" && (
                <div className="p-4">
                  <p className="mb-2 text-[10px] text-rose-700">⚠️ Visível apenas para adestradores. Nunca compartilhado com o tutor.</p>
                  <textarea
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-rose-100 bg-rose-50/20 px-3 py-2 text-xs outline-none focus:border-rose-300 text-slate-800"
                    placeholder="Comportamentos observados, anotações de temperamento, observações sobre o tutor, etc."
                  />
                </div>
              )}

              {/* SEÇÃO E: Transcrição & IA */}
              {renderSectionHeader("E", "Transcrição de Áudio e Análise de IA")}
              {expandedSection === "E" && (
                <div className="p-4 space-y-3.5">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">🎤 Ditado de Notas por Voz</h4>
                    <p className="text-[10px] text-[var(--muted)]">Use o microfone do dispositivo para transcrever observações. O áudio fica no seu navegador — não enviamos nada para serviços pagos.</p>

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
                      className="mt-3 w-full rounded-md border border-[var(--border)] bg-[#fafcff] px-3 py-2 text-xs outline-none"
                      placeholder="A transcrição em tempo real aparece aqui — você pode editar livremente."
                    />
                  </div>

                  <hr className="border-[var(--border)]" />

                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">🤖 Análise por Inteligência Artificial (Adestro AI)</h4>
                    <p className="text-[10px] text-[var(--muted)]">Gera automaticamente o resumo para o tutor, foco das próximas aulas e checklist de tarefas a partir dos dados do treino.</p>
                    
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
                        <p className="text-xs text-purple-950 italic">"{aiSummary}"</p>
                        
                        <div className="rounded-lg border border-purple-100 bg-white p-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiApproved}
                              onChange={(e) => setAiApproved(e.target.checked)}
                              className="rounded border-purple-300 text-purple-600 focus:ring-purple-400"
                            />
                            Aprovar resumo da IA e dever de casa para o Portal do Tutor
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEÇÃO F: Galeria de Mídias */}
              {renderSectionHeader("F", "Galeria de Mídias do Treino")}
              {expandedSection === "F" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">Anexe fotos demonstrativas da aula. O sistema comprime as imagens de forma eficiente.</p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                    className="block w-full text-xs text-[var(--muted)] file:mr-2 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />

                  {isProcessingImages && <p className="text-xs text-sky-700">Compactando imagens...</p>}

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

              {/* SEÇÃO G: Próximo Foco */}
              {renderSectionHeader("G", "Foco do Próximo Treino")}
              {expandedSection === "G" && (
                <div className="p-4">
                  <input
                    value={nextFocus}
                    onChange={(e) => setNextFocus(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                    placeholder="Ex: Treinar permanência com o comando Fica"
                  />
                </div>
              )}

              {/* SEÇÃO H: Próximos Comandos */}
              {renderSectionHeader("H", "Próximos Comandos Recomendados")}
              {expandedSection === "H" && (
                <div className="p-4 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {nextCommands.map((cmd, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-bold text-[var(--foreground)] border border-[var(--border)]">
                        {cmd}
                        <button
                          type="button"
                          onClick={() => setNextCommands(nextCommands.filter((_, idx) => idx !== i))}
                          className="font-semibold text-rose-500 hover:text-rose-700 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Novo comando recomendado"
                      value={newNextCommandName}
                      onChange={(e) => setNewNextCommandName(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newNextCommandName.trim()) return;
                        setNextCommands([...nextCommands, newNextCommandName.trim()]);
                        setNewNextCommandName("");
                      }}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO I: Dever de Casa (Tarefas do Tutor) */}
              {renderSectionHeader("I", "Dever de Casa — Tarefas do Tutor")}
              {expandedSection === "I" && (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-[var(--muted)]">Checklist de tarefas de casa que serão recomendadas ao tutor no portal.</p>
                  
                  <div className="space-y-1.5">
                    {nextTasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-800">
                        <span className="flex-1 leading-snug">🏠 {task}</span>
                        <button
                          type="button"
                          onClick={() => setNextTasks(nextTasks.filter((_, idx) => idx !== i))}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Nova tarefa de casa para o tutor..."
                      value={newNextTaskText}
                      onChange={(e) => setNewNextTaskText(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newNextTaskText.trim()) return;
                        setNextTasks([...nextTasks, newNextTaskText.trim()]);
                        setNewNextTaskText("");
                      }}
                      className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

            </div>

            {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

            <button
              type="submit"
              disabled={isSaving || isProcessingImages}
              className="pc-primary-action rounded-full py-2.5 text-sm font-semibold disabled:opacity-60 mt-3"
            >
              {isSaving ? "Salvando treino estruturado..." : "Salvar Evolução Estruturada"}
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