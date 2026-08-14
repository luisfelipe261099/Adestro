"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { plural } from "@/lib/labels";
import { DateField } from "@/components/date-field";
import { BEHAVIOR_BLOCKS } from "@/lib/behavior";
import { AudioTranscriber } from "@/components/audio-transcriber";
import { SessionAiChat } from "@/components/session-ai-chat";
import { type TrainingMediaItem, useAppStore } from "@/lib/app-store";
import {
  EXERCISE_TONE_VARS as TONE_VARS,
  EXERCISE_TREE,
  averageRating,
  customExerciseKey,
  flattenCatalog,
  groupExercisesByCategory,
  legacyToSessionExercises,
  parseSessionExercises,
  toLegacyCommands,
  toSessionExercise,
  type CatalogArea,
  type CatalogCategory,
  type CatalogExercise,
  type SessionExercise,
} from "@/lib/exercise-tree";

const MAX_IMAGES = 4;
const MAX_DIMENSION = 1280;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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
            aria-label={`Definir ${plural(star, "estrela", "estrelas")}`}
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

// Seções numeradas (1 a 8) — antes eram letras A–I.
type AccordionSection = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
/** `null` = todas fechadas. Ver o comentário em renderSectionHeader. */
type AccordionState = AccordionSection | null;

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
  const [expandedSection, setExpandedSection] = useState<AccordionState>("1");

  // SEÇÃO 1: Exercícios Trabalhados (Categoria > Área > Exercício)
  // A árvore vem do banco (catálogo padrão + os exercícios criados por este
  // adestrador). Na tela ela vira botão direto: 1 toque marca o exercício.
  const [catalog, setCatalog] = useState<CatalogCategory[]>(EXERCISE_TREE);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  // Área com o campo "+ Outro" aberto e o texto digitado nele.
  const [customAreaKey, setCustomAreaKey] = useState("");
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState("");

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

  // Pré-treino: plano combinado na ÚLTIMA sessão deste cão (foco, comandos e
  // tarefas da Seção "Planejamento da próxima"). Vira sugestão de 1 clique.
  // Derivação simples — o React Compiler memoiza sozinho.
  const lastPlan = (() => {
    if (!selectedDogId) return null;
    const toTime = (date: string) => {
      const [d, m, y] = (date ?? "").split("/").map(Number);
      return d && m && y ? new Date(y, m - 1, d).getTime() : 0;
    };
    const past = trainingSessions
      .filter((s) => s.dogId === selectedDogId || (s.dogSessions ?? []).some((ds) => ds.dogId === selectedDogId))
      .sort((a, b) => toTime(b.date) - toTime(a.date));
    for (const s of past) {
      const ds = (s.dogSessions ?? []).find((item) => item.dogId === selectedDogId);
      if (!ds) continue;
      const focus = ds.nextFocus?.trim() ?? "";
      const cmds = (ds.nextCommands ?? []).filter(Boolean);
      const tasks = (ds.nextTasks ?? []).filter(Boolean);
      if (focus || cmds.length || tasks.length) return { date: s.date, focus, commands: cmds, tasks };
    }
    return null;
  })();

  // Resumo do ÚLTIMO treino realizado: o que foi trabalhado e o que o
  // adestrador comentou. Diferente do "pré-treino" acima, que é o plano
  // combinado para hoje — aqui é o retrato do encontro anterior, para ele
  // chegar na aula lembrando de onde parou. Vazio na primeira sessão do cão.
  const lastSession = (() => {
    if (!selectedDogId) return null;
    const toTime = (date: string) => {
      const [d, m, y] = (date ?? "").split("/").map(Number);
      return d && m && y ? new Date(y, m - 1, d).getTime() : 0;
    };
    const past = trainingSessions
      .filter((s) => s.dogId === selectedDogId || (s.dogSessions ?? []).some((ds) => ds.dogId === selectedDogId))
      .sort((a, b) => toTime(b.date) - toTime(a.date));
    const ultima = past[0];
    if (!ultima) return null;
    const ds = (ultima.dogSessions ?? []).find((item) => item.dogId === selectedDogId);
    const exercicios = (ds?.exercises ?? []).map((ex) => `${ex.name} (${ex.rating}/5)`);
    const atividades = (ds?.activities ?? []).filter((a) => a.completed).map((a) => a.name);
    const comentario =
      ds?.description?.trim() ||
      (ultima.notes ?? []).map((n) => n.comment).filter(Boolean).join(" ") ||
      "";
    return {
      date: ultima.date,
      title: ultima.title,
      trabalhado: exercicios.length ? exercicios : atividades,
      comentario,
    };
  })();

  // Importa o plano da última aula: cada item vira exercício marcado (casando
  // pelo nome com o catálogo; o que não casar entra como item avulso).
  function importLastPlan() {
    if (!lastPlan) return;
    const wanted = [lastPlan.focus, ...lastPlan.commands].filter(Boolean).map((name) => ({ command: name }));
    const imported = legacyToSessionExercises(undefined, wanted, catalog);
    setExercises((current) => {
      const existing = new Set(current.map((item) => item.key));
      return [...current, ...imported.filter((item) => !existing.has(item.key))];
    });
  }

  // Catálogo de exercícios: padrão + os criados por este adestrador.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/exercises", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.categories) || !data.categories.length) return;
        setCatalog(data.categories as CatalogCategory[]);
      })
      .catch(() => undefined); // offline: segue com a árvore padrão do código
    return () => {
      cancelled = true;
    };
  }, []);

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
          // Treino novo já vem com `exercises`; os antigos são convertidos de
          // atividades/comandos para não perder nada ao editar.
          const saved = parseSessionExercises(ds.exercises);
          setExercises(
            saved.length ? saved : legacyToSessionExercises(ds.activities, ds.commands, catalog),
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
  }, [
    clients,
    requestedClientId,
    requestedDogId,
    requestedSessionId,
    selectedClientId,
    trainingSessions,
    hydratedEdit,
    catalog,
  ]);

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

  // Salva as tarefas de casa nos modelos do adestrador. Exercícios não passam
  // mais por aqui: o "+ Outro" já grava no catálogo (tabela Exercise).
  async function saveTemplates() {
    setTemplatesMsg("");
    const merged = Array.from(new Set([...savedTasks, ...nextTasks.map((t) => t.text)]));
    const payload: Record<string, string[]> = { defaultTutorTasks: merged };
    setSavedTasks(merged);
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
        ...exercises.map((e) => `${e.categoryName} • ${e.name} (${e.rating}/5): ${e.notes}`),
      ].filter(Boolean).join("\n");

      const response = await fetch("/api/ia/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: `draft-${Date.now()}`,
          trainer_notes: notes || "Sessão sem notas detalhadas.",
          dog_id: selectedDog.id,
          video_tags: exercises.map((e) => e.name.toLowerCase()),
          duration_minutes: 60,
          techniques_used: exercises.map((e) => e.name),
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const analysis = payload?.analysis;
        if (analysis) {
          setAiSummary(analysis.summary_for_tutor || "");
          const plan: string[] = [];
          if (analysis.next_steps?.[0]) plan.push(analysis.next_steps[0]);
          const lowRated = exercises.filter((e) => e.rating <= 3).map((e) => e.name);
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

  // SEÇÃO 1 — marcar/desmarcar exercício em 1 toque, avaliar por estrela.
  const flatCatalog = useMemo(() => flattenCatalog(catalog), [catalog]);
  const markedKeys = useMemo(() => new Set(exercises.map((item) => item.key)), [exercises]);

  // Botões visíveis: filtro por categoria e busca são OPCIONAIS — sem nada
  // marcado a tela já mostra todos os exercícios, agrupados por área.
  const visibleAreas = useMemo(() => {
    const term = normalize(exerciseSearch.trim());
    const groups: Array<{ category: CatalogCategory; area: CatalogArea; exercises: CatalogExercise[] }> = [];
    for (const category of catalog) {
      if (categoryFilter && category.key !== categoryFilter) continue;
      for (const area of category.areas) {
        const matchesArea = term
          ? normalize(`${category.name} ${area.name}`).includes(term)
          : false;
        const list = term
          ? area.exercises.filter(
              (exercise) => matchesArea || normalize(exercise.name).includes(term),
            )
          : area.exercises;
        if (list.length) groups.push({ category, area, exercises: list });
      }
    }
    return groups;
  }, [catalog, categoryFilter, exerciseSearch]);

  // Modelos antigos do adestrador (atividades/comandos salvos antes da árvore).
  // Continuam a 1 toque de distância pra ninguém perder o que já usava.
  const legacyTemplates = useMemo(() => {
    const known = new Set(flatCatalog.map((item) => normalize(item.exercise.name)));
    return Array.from(new Set([...savedActivities, ...savedCommands]))
      .map((name) => name.trim())
      .filter((name) => name && !known.has(normalize(name)))
      .filter((name) => !exercises.some((item) => normalize(item.name) === normalize(name)));
  }, [flatCatalog, savedActivities, savedCommands, exercises]);

  const addLegacyTemplate = (name: string) => {
    setExercises((prev) => [
      ...prev,
      {
        key: `meus.modelos.${normalize(name).replace(/[^a-z0-9]+/g, "-")}`,
        name,
        areaKey: "meus.modelos",
        areaName: "Modelos salvos",
        categoryKey: "meus",
        categoryName: "Meus exercícios",
        rating: 3,
        notes: "",
        custom: true,
      },
    ]);
  };

  const toggleExercise = (key: string) => {
    if (markedKeys.has(key)) {
      setExercises((prev) => prev.filter((item) => item.key !== key));
      return;
    }
    const found = flatCatalog.find((item) => item.exercise.key === key);
    if (!found) return;
    setExercises((prev) => [...prev, toSessionExercise(found)]);
  };

  const updateExercise = (key: string, patch: Partial<SessionExercise>) => {
    setExercises((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  // "+ Outro": grava o exercício novo na Área (tabela Exercise) e já marca na
  // sessão. Sem rede, ele ainda entra na sessão como item personalizado.
  async function addCustomExercise(areaKey: string) {
    const name = customName.trim();
    if (!name) return;
    setCustomError("");

    const area = catalog
      .flatMap((category) => category.areas.map((item) => ({ category, area: item })))
      .find((item) => item.area.key === areaKey);
    if (!area) return;

    let created: { id?: string; key: string; name: string } = {
      key: customExerciseKey(areaKey, name),
      name,
    };

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaKey, name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.exercise?.key) created = data.exercise;
      } else {
        setCustomError("Exercício adicionado nesta sessão, mas não foi salvo no catálogo.");
      }
    } catch {
      setCustomError("Sem conexão: o exercício vale para esta sessão, mas não ficou salvo no catálogo.");
    }

    setCatalog((prev) =>
      prev.map((category) =>
        category.key !== area.category.key
          ? category
          : {
              ...category,
              areas: category.areas.map((item) =>
                item.key !== areaKey || item.exercises.some((exercise) => exercise.key === created.key)
                  ? item
                  : {
                      ...item,
                      exercises: [
                        ...item.exercises,
                        { id: created.id, key: created.key, name: created.name, order: 900, custom: true },
                      ],
                    },
              ),
            },
      ),
    );

    setExercises((prev) =>
      prev.some((item) => item.key === created.key)
        ? prev
        : [
            ...prev,
            {
              key: created.key,
              name: created.name,
              areaKey,
              areaName: area.area.name,
              categoryKey: area.category.key,
              categoryName: area.category.name,
              rating: 3,
              notes: "",
              exerciseId: created.id,
              custom: true,
            },
          ],
    );

    setCustomName("");
    setCustomAreaKey("");
  }

  // Tira do catálogo um exercício que o próprio adestrador criou (erro de
  // digitação, exercício que não usa mais). O catálogo padrão não some.
  async function removeCustomExercise(exercise: CatalogExercise, areaKey: string) {
    setCatalog((prev) =>
      prev.map((category) => ({
        ...category,
        areas: category.areas.map((area) =>
          area.key !== areaKey
            ? area
            : { ...area, exercises: area.exercises.filter((item) => item.key !== exercise.key) },
        ),
      })),
    );
    setExercises((prev) => prev.filter((item) => item.key !== exercise.key));

    if (!exercise.id) return; // criado offline: nunca chegou ao banco
    try {
      await fetch(`/api/exercises?id=${encodeURIComponent(exercise.id)}`, { method: "DELETE" });
    } catch {
      setCustomError("Sem conexão: o exercício volta a aparecer quando a página recarregar.");
    }
  }

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
    setExercises([]);
    setExerciseSearch("");
    setCategoryFilter("");
    setCustomAreaKey("");
    setCustomName("");
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

    // `exercises` é o registro real da sessão. `commands` continua sendo
    // gravado como projeção do mesmo conteúdo porque o portal do cliente, os
    // relatórios e a IA leem esse campo desde sempre — e a base ainda tem
    // sessões antigas nesse formato.
    const legacyCommands = toLegacyCommands(exercises);

    const dogSessionsPayload = sessionDogIds.map((dogId) => ({
      dogId,
      exercises,
      activities: [],
      commands: legacyCommands,
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

    const notesPayload = exercises.map((e) => ({
      block: e.name,
      score: e.rating * 2,
      comment: e.notes,
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

  const renderSectionHeader = (num: AccordionSection, name: string, optional = false) => {
    const isExpanded = expandedSection === num;
    return (
      <button
        type="button"
        // Clicar no título de uma seção aberta fecha ELA. Antes voltava para a
        // seção 1, o que jogava a página para o topo: o adestrador clicava no
        // item 7 e via o item 1 abrir sozinho.
        onClick={() => setExpandedSection(isExpanded ? null : num)}
        className={`flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors ${
          isExpanded
            ? "border-[var(--accent)] border-l-4 bg-[var(--accent)] text-white"
            : "border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
        }`}
      >
        <span className={`flex items-center gap-2 text-sm font-bold ${isExpanded ? "text-white" : "text-[var(--foreground)]"}`}>
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
              isExpanded ? "bg-white/20 text-white" : "bg-[var(--accent)] text-white"
            }`}
          >
            {num}
          </span>
          {name}
          {optional ? (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[12px] font-medium uppercase tracking-wide text-[var(--muted)]">
              opcional
            </span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180 text-white" : "text-[var(--muted)]"}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  };

  // Sugestões (modelos salvos) ainda não usadas na lista atual.
  const taskSuggestions = savedTasks.filter((s) => !nextTasks.some((t) => t.text === s));

  // Resumo que vai virar o relatório: exercícios agrupados por categoria.
  const exerciseGroups = groupExercisesByCategory(exercises, catalog);

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
                    {t === "Individual" ? "Individual" : "Coletivo (turma)"}
                  </button>
                ))}
              </div>
              {sessionType === "Coletivo" && (
                <div className="rounded-md border border-dashed border-[var(--border)] bg-white/60 p-3">
                  <p className="text-[12px] text-[var(--muted)]">
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
                    <p className="mt-2 text-[12px] font-semibold text-[var(--accent-text)]">
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

              {/* SEÇÃO 1: Exercícios Trabalhados (Categoria > Área > Exercício) */}
              {renderSectionHeader("1", "Exercícios Trabalhados")}
              {expandedSection === "1" && (
                <div className="p-4 space-y-3" data-tour="exercise-tree">
                  <p className="text-[12px] text-[var(--muted)]">
                    Um toque marca o exercício e a <b>estrela (1-5) avalia aquele exercício</b>. Categoria e Área
                    servem só para filtrar e agrupar — o resumo para o cliente sai agrupado por categoria sozinho.
                  </p>

                  {/* Resumo do último treino realizado deste cão */}
                  {lastSession ? (
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--muted)]">
                          Resumo do último treino — {lastSession.date}
                        </p>
                        {selectedDogId ? (
                          <Link
                            href={`/caes/${selectedDogId}`}
                            className="text-[12px] font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Ver histórico de treinos do cão →
                          </Link>
                        ) : null}
                      </div>
                      <ul className="mt-1.5 space-y-0.5 text-[12.5px] leading-5 text-[var(--foreground)]">
                        {lastSession.trabalhado.length ? (
                          <li>• Trabalhado: {lastSession.trabalhado.join(", ")}</li>
                        ) : null}
                        {lastSession.comentario ? <li>• Comentário: {lastSession.comentario}</li> : null}
                        {!lastSession.trabalhado.length && !lastSession.comentario ? (
                          <li className="text-[var(--muted)]">Sessão anterior sem detalhes registrados.</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}

                  {/* Pré-treino: plano combinado na última aula deste cão */}
                  {lastPlan ? (
                    <div className="rounded-md border border-[var(--card-purple-border)] bg-[var(--card-purple-bg)] p-3">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--card-purple)]">
                        📋 Pré-treino — plano combinado na última aula ({lastPlan.date})
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-[12.5px] leading-5 text-[var(--foreground)]">
                        {lastPlan.focus ? <li>• Foco: {lastPlan.focus}</li> : null}
                        {lastPlan.commands.length ? <li>• Exercícios: {lastPlan.commands.join(", ")}</li> : null}
                        {lastPlan.tasks.length ? <li>• Tarefas que o cliente praticou em casa: {lastPlan.tasks.join(", ")}</li> : null}
                      </ul>
                      <button
                        type="button"
                        onClick={importLastPlan}
                        className="mt-2 rounded-full bg-[var(--card-purple)] px-3 py-1 text-[12px] font-bold text-white hover:opacity-90"
                      >
                        Usar este plano nesta sessão →
                      </button>
                    </div>
                  ) : null}

                  {/* Marcados nesta sessão — já agrupados por categoria */}
                  {exercises.length > 0 && (
                    <div className="space-y-2.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
                          Marcados nesta sessão ({exercises.length})
                        </p>
                        <span className="text-[12px] font-bold text-[var(--foreground)]">
                          Média {averageRating(exercises).toFixed(1)}/5
                        </span>
                      </div>

                      {exerciseGroups.map((group) => (
                        <div key={group.categoryKey} className="space-y-1.5">
                          <div
                            className="flex items-center justify-between rounded-md border px-2.5 py-1"
                            style={{
                              color: TONE_VARS[group.tone].fg,
                              backgroundColor: TONE_VARS[group.tone].bg,
                              borderColor: TONE_VARS[group.tone].border,
                            }}
                          >
                            <span className="text-[12px] font-bold uppercase tracking-wide">{group.categoryName}</span>
                            <span className="text-[12px] font-bold">{group.average.toFixed(1)}/5</span>
                          </div>

                          {group.items.map((item) => (
                            <div key={item.key} className="space-y-2 rounded-md border border-[var(--border)] bg-white p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[var(--foreground)]">{item.name}</p>
                                  <p className="text-[12px] text-[var(--muted)]">{item.areaName}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setExercises((prev) => prev.filter((x) => x.key !== item.key))}
                                  className="shrink-0 text-[12px] font-bold text-rose-500 hover:underline"
                                >
                                  Excluir
                                </button>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <StarRating
                                  value={item.rating}
                                  onChange={(rating) => updateExercise(item.key, { rating })}
                                />
                                <span className="text-xs font-bold text-[var(--foreground)]">{item.rating}/5</span>
                              </div>
                              <input
                                placeholder="Observações deste exercício..."
                                value={item.notes}
                                onChange={(e) => updateExercise(item.key, { notes: e.target.value })}
                                className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Busca + filtro de categoria (opcionais) */}
                  <div className="space-y-2">
                    <input
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      placeholder="Buscar exercício (ex: recall, focinheira, portão)"
                      className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("")}
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold ${
                          categoryFilter === ""
                            ? "bg-[var(--accent)] text-white"
                            : "border border-[var(--border)] bg-white text-[var(--muted)]"
                        }`}
                      >
                        Todas
                      </button>
                      {catalog.map((category) => {
                        const active = categoryFilter === category.key;
                        return (
                          <button
                            key={category.key}
                            type="button"
                            onClick={() => setCategoryFilter(active ? "" : category.key)}
                            className="whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-semibold"
                            style={
                              active
                                ? {
                                    color: "#fff",
                                    backgroundColor: TONE_VARS[category.tone].fg,
                                    borderColor: TONE_VARS[category.tone].fg,
                                  }
                                : {
                                    color: TONE_VARS[category.tone].fg,
                                    backgroundColor: TONE_VARS[category.tone].bg,
                                    borderColor: TONE_VARS[category.tone].border,
                                  }
                            }
                          >
                            {category.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Exercícios como botões diretos — 1 toque marca */}
                  <div className="space-y-3">
                    {visibleAreas.map(({ category, area, exercises: list }) => (
                      <div key={area.key}>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          <span style={{ color: TONE_VARS[category.tone].fg }}>{category.name}</span> · {area.name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {list.map((exercise) => {
                            const marked = markedKeys.has(exercise.key);
                            const chipStyle = marked
                              ? {
                                  color: "#fff",
                                  backgroundColor: TONE_VARS[category.tone].fg,
                                  borderColor: TONE_VARS[category.tone].fg,
                                }
                              : {
                                  color: "var(--foreground)",
                                  backgroundColor: "var(--surface)",
                                  borderColor: "var(--border)",
                                };
                            return (
                              <span key={exercise.key} className="inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() => toggleExercise(exercise.key)}
                                  aria-pressed={marked}
                                  className={`border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                                    exercise.custom ? "rounded-l-full border-r-0 border-dashed" : "rounded-full"
                                  }`}
                                  style={chipStyle}
                                >
                                  {marked ? "✓ " : ""}
                                  {exercise.name}
                                </button>
                                {exercise.custom && (
                                  <button
                                    type="button"
                                    onClick={() => void removeCustomExercise(exercise, area.key)}
                                    aria-label={`Remover ${exercise.name} do meu catálogo`}
                                    title="Remover do meu catálogo"
                                    className="rounded-r-full border border-l-0 border-dashed px-2 py-1 text-[12px] font-bold"
                                    style={chipStyle}
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomAreaKey(customAreaKey === area.key ? "" : area.key);
                              setCustomName("");
                              setCustomError("");
                            }}
                            className="rounded-full border border-dashed border-[var(--border)] bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
                          >
                            + Outro
                          </button>
                        </div>

                        {customAreaKey === area.key && (
                          <div className="mt-1.5 flex gap-2">
                            <input
                              autoFocus
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void addCustomExercise(area.key);
                                }
                              }}
                              placeholder={`Novo exercício em ${area.name}`}
                              className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                            />
                            <button
                              type="button"
                              onClick={() => void addCustomExercise(area.key)}
                              className="rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                            >
                              Incluir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {visibleAreas.length === 0 && (
                      <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center text-[12px] text-[var(--muted)]">
                        Nenhum exercício encontrado. Limpe a busca ou use o “+ Outro” da área certa para criar um.
                      </p>
                    )}
                  </div>

                  {customError && <p className="text-[12px] font-medium text-amber-700">{customError}</p>}

                  {/* Modelos antigos do adestrador — continuam a 1 toque */}
                  {legacyTemplates.length > 0 && (
                    <div className="rounded-md border border-dashed border-[var(--border)] p-3">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Meus modelos salvos
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {legacyTemplates.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => addLegacyTemplate(name)}
                            className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--foreground)] hover:border-[var(--accent)]"
                          >
                            + {name}
                          </button>
                        ))}
                      </div>
                    </div>
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
              {renderSectionHeader("3", "Notas Privadas (Confidencial)", true)}
              {expandedSection === "3" && (
                <div className="p-4">
                  <p className="mb-2 text-[12px] text-rose-700">Visível apenas para adestradores. Nunca compartilhado com o cliente.</p>
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
              {renderSectionHeader("4", "Transcrição de Áudio e Análise de IA", true)}
              {expandedSection === "4" && (
                <div className="p-4 space-y-3.5">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">Ditado de Notas por Voz</h4>
                    <p className="text-[12px] text-[var(--muted)]">Use o microfone do dispositivo para transcrever observações. O áudio fica no seu navegador.</p>

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
                    <h4 className="text-xs font-bold text-[var(--foreground)]">Análise por Inteligência Artificial (Adestro AI)</h4>
                    <p className="text-[12px] text-[var(--muted)]">Gera automaticamente o resumo para o cliente, plano do próximo treino e checklist de tarefas.</p>

                    <button
                      type="button"
                      onClick={generateMockAIAnalysis}
                      disabled={isGeneratingAI}
                      className="mt-2.5 w-full rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-sm hover:from-purple-700 transition"
                    >
                      {isGeneratingAI ? "Gerando Análise..." : "Gerar Relatório e Análise IA"}
                    </button>

                    {aiSummary && (
                      <div className="mt-3 rounded-md border border-purple-200 bg-purple-50/55 p-3 space-y-2">
                        <p className="text-xs font-bold text-purple-900">Resumo Gerado pela IA:</p>
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
              {renderSectionHeader("5", "Galeria de Mídias do Treino", true)}
              {expandedSection === "5" && (
                <div className="p-4 space-y-3">
                  <p className="text-[12px] text-[var(--muted)]">Anexe fotos demonstrativas da aula. O sistema comprime as imagens.</p>

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
                            className="mt-1 w-full rounded bg-rose-50 text-[12px] font-bold text-rose-700 py-0.5 border border-rose-100"
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
              {renderSectionHeader("6", "Plano do Próximo Treino", true)}
              {expandedSection === "6" && (
                <div className="p-4 space-y-2">
                  <p className="text-[12px] text-[var(--muted)]">
                    Liste o que fazer no próximo encontro (foco + comandos a reforçar). Use <strong>Incluir</strong> para adicionar cada item.
                  </p>
                  <div className="space-y-1.5">
                    {nextPlan.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-2)]/50 p-2 text-xs text-[var(--foreground)]">
                        <span className="flex-1 leading-snug">{item}</span>
                        <button
                          type="button"
                          onClick={() => setNextPlan(nextPlan.filter((_, idx) => idx !== i))}
                          className="text-[12px] font-bold text-rose-500 hover:underline"
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
              {renderSectionHeader("7", "Dever de Casa — Tarefas do Cliente", true)}
              {expandedSection === "7" && (
                <div className="p-4 space-y-3">
                  <p className="text-[12px] text-[var(--muted)]">
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
                          className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-text)] hover:bg-[var(--accent)]/10"
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
                          <span className="flex-1 leading-snug">{task.text}</span>
                          <button
                            type="button"
                            onClick={() => setNextTasks(nextTasks.filter((_, idx) => idx !== i))}
                            className="text-[12px] font-bold text-rose-500 hover:underline"
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
                              className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
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
                                  className={`h-6 w-8 rounded-md text-[12px] font-semibold ${
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
                    <button type="button" onClick={() => saveTemplates()} className="text-[12px] font-semibold text-[var(--accent-text)] hover:underline">
                      Salvar estas nos meus modelos
                    </button>
                  )}
                </div>
              )}

              {/* SEÇÃO 8: Evolução Comportamental (nota 0-5 por categoria) */}
              {renderSectionHeader("8", "Evolução Comportamental", true)}
              {expandedSection === "8" && (
                <div className="p-4 space-y-4">
                  <p className="text-[12px] text-[var(--muted)]">
                    Dê uma nota (0–5) para cada área. Em TODAS as escalas, mais estrelas = melhor —
                    inclusive nas emocionais (5/5 em Estabilidade = cão calmo e equilibrado).
                  </p>
                  {BEHAVIOR_BLOCKS.map((block) => (
                    <div key={block.key} className="rounded-md border border-[var(--border)] overflow-hidden">
                      <div className={`px-3 py-2 ${block.key === "emocional" ? "bg-[var(--card-purple-bg)]" : "bg-[var(--card-blue-bg)]"}`}>
                        <p className={`text-[12px] font-bold uppercase tracking-wide ${block.key === "emocional" ? "text-[var(--card-purple)]" : "text-[var(--card-blue)]"}`}>
                          {block.title}
                        </p>
                        <p className="text-[12px] text-[var(--muted)]">{block.subtitle}</p>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {block.categories.map((cat) => (
                          <div
                            key={cat.key}
                            className="flex items-center justify-between gap-2 bg-[var(--surface)] p-2.5"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-[var(--foreground)]">{cat.label}</span>
                              {cat.hint ? (
                                <p className="text-[12px] leading-4 text-[var(--muted)]">{cat.hint}</p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
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
                  ))}
                </div>
              )}

            </div>

            {templatesMsg && <p className="text-[12px] font-medium text-[var(--accent-text)]">{templatesMsg}</p>}
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
            commandsWorked: exercises.map((e) => ({ command: e.name, rating: e.rating, notes: e.notes })),
            privateNotes: privateNotes,
          }}
        />
      </main>
    </AuthGuard>
  );
}
