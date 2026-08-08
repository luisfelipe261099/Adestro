"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAppStore } from "@/lib/app-store";
import { behaviorLabel } from "@/lib/behavior";
import {
  EXERCISE_TONE_VARS,
  categoryTone,
  groupExercisesByCategory,
  sessionExercisesFromParsed,
} from "@/lib/exercise-tree";

type DraftTrainingNote = {
  id: string;
  block: string;
  score: number;
  comment: string;
};

type DraftTrainingMedia = {
  id: string;
  dataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  mainSizeKb: number;
  thumbSizeKb: number;
  createdAt: string;
};

type FeedFilter = "today" | "week" | "all" | "pending";
type FeedStatus = "confirmado" | "andamento" | "pendente";

const MAX_MEDIA_ITEMS = 5;
const TARGET_MAIN_IMAGE_KB = 115;
const MAX_MAIN_IMAGE_KB = 170;
const TARGET_THUMB_KB = 24;
const MAX_THUMB_KB = 40;
const MAX_TOTAL_MEDIA_KB = 750;
const MAX_DIMENSION = 1280;
const THUMB_MAX_DIMENSION = 320;

function createDraftTrainingNote(block = "Guia"): DraftTrainingNote {
  return {
    id: `note-${Math.random().toString(36).slice(2, 10)}`,
    block,
    score: 7,
    comment: "Boa evolução com reforço no timing.",
  };
}

function parseBrazilianDate(date: string): number {
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function averageSessionScore(notes: Array<{ score: number }>): number {
  if (!notes.length) return 0;
  return notes.reduce((total, note) => total + note.score, 0) / notes.length;
}

function statusFromScore(score: number): FeedStatus {
  if (score >= 8) return "confirmado";
  if (score >= 6) return "andamento";
  return "pendente";
}

function statusLabel(status: FeedStatus): string {
  if (status === "confirmado") return "Concluído";
  if (status === "andamento") return "Em andamento";
  return "Pendente";
}

function statusClass(status: FeedStatus): string {
  if (status === "confirmado") return "bg-emerald-100 text-emerald-800";
  if (status === "andamento") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

// Nota do treino (0-10) renderizada como estrelas (0-5). Cada estrela = 2 pontos.
function StarRating({ score, className = "" }: { score: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(score / 2)));
  return (
    <span className={`tracking-tight ${className}`} aria-label={`Nota ${score.toFixed(1)} de 10`}>
      <span className="text-amber-500">{"★".repeat(filled)}</span>
      <span className="text-[var(--border)]">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

function TinyIcon({ name }: { name: "search" | "filter" | "back" | "plus" | "play" | "list" | "whats" }) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "back") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="m9 7 8 5-8 5V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.5 9h7M8.5 13h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M7 18h10a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1l-1.2-2H9.2L8 6H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

async function compressTrainingImage(file: File): Promise<DraftTrainingMedia> {
  const sourceDataUrl = await fileToDataUrl(file);
  const image = new window.Image();
  image.src = sourceDataUrl;
  await image.decode();

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível");
  ctx.drawImage(image, 0, 0, width, height);

  function encodeWebpWithTarget(sourceCanvas: HTMLCanvasElement, targetKb: number) {
    const qualities = [0.82, 0.72, 0.62, 0.52, 0.42, 0.34];
    let bestDataUrl = "";
    let bestSizeKb = Number.POSITIVE_INFINITY;

    for (const quality of qualities) {
      const dataUrl = sourceCanvas.toDataURL("image/webp", quality);
      const base64Part = dataUrl.split(",")[1] ?? "";
      const sizeBytes = Math.ceil((base64Part.length * 3) / 4);
      const sizeKb = Math.round(sizeBytes / 1024);

      if (sizeKb < bestSizeKb) {
        bestDataUrl = dataUrl;
        bestSizeKb = sizeKb;
      }

      if (sizeKb <= targetKb) {
        bestDataUrl = dataUrl;
        bestSizeKb = sizeKb;
        break;
      }
    }

    return { dataUrl: bestDataUrl, sizeKb: bestSizeKb };
  }

  const mainEncoded = encodeWebpWithTarget(canvas, TARGET_MAIN_IMAGE_KB);

  const thumbScale = Math.min(1, THUMB_MAX_DIMENSION / Math.max(width, height));
  const thumbWidth = Math.max(1, Math.round(width * thumbScale));
  const thumbHeight = Math.max(1, Math.round(height * thumbScale));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext("2d");
  if (!thumbCtx) throw new Error("Canvas de miniatura não disponível");
  thumbCtx.drawImage(image, 0, 0, thumbWidth, thumbHeight);
  const thumbEncoded = encodeWebpWithTarget(thumbCanvas, TARGET_THUMB_KB);

  return {
    id: `media-${Math.random().toString(36).slice(2, 10)}`,
    dataUrl: mainEncoded.dataUrl,
    thumbDataUrl: thumbEncoded.dataUrl,
    width,
    height,
    sizeKb: mainEncoded.sizeKb + thumbEncoded.sizeKb,
    mainSizeKb: mainEncoded.sizeKb,
    thumbSizeKb: thumbEncoded.sizeKb,
    createdAt: new Date().toISOString(),
  };
}

export default function TrainingPage() {
  const searchParams = useSearchParams();
  const clients = useAppStore((state) => state.clients);
  const trainingSessions = useAppStore((state) => state.trainingSessions);
  const addTrainingSession = useAppStore((state) => state.addTrainingSession);

  const initialClientId = searchParams.get("clientId") ?? clients[0]?.id ?? "";
  const initialDogId = searchParams.get("dogId") ?? clients[0]?.dogs[0]?.id ?? "";

  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [selectedDogId, setSelectedDogId] = useState(initialDogId);
  const [searchTerm, setSearchTerm] = useState("");
  // Quem chega por "Histórico" de um cão específico quer o histórico DELE,
  // inteiro — não o feed do dia de todos os cães. Sem isso o botão parecia
  // levar a uma lista aleatória.
  const focusDogId = searchParams.get("dogId") ?? "";
  const [feedFilter, setFeedFilter] = useState<FeedFilter>(focusDogId ? "all" : "today");
  const [feedDogId, setFeedDogId] = useState(focusDogId);
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState<DraftTrainingNote[]>([createDraftTrainingNote()]);
  const [draftMedia, setDraftMedia] = useState<DraftTrainingMedia[]>([]);
  const [isCompressingMedia, setIsCompressingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [clients, selectedClientId],
  );

  const selectedDog = useMemo(
    () => selectedClient?.dogs.find((dog) => dog.id === selectedDogId) ?? selectedClient?.dogs[0],
    [selectedClient, selectedDogId],
  );

  const selectedClientValue = selectedClient?.id ?? "";
  const selectedDogValue = selectedDog?.id ?? "";

  const selectedSessions = useMemo(() => {
    if (!selectedDog) return [];

    return trainingSessions.filter((session) => {
      if (session.dogId) return session.dogId === selectedDog.id;
      return session.dogName === selectedDog.name;
    });
  }, [selectedDog, trainingSessions]);

  const nextSessionNumber = selectedSessions.length
    ? Math.max(...selectedSessions.map((session) => session.number)) + 1
    : 1;

  const blockOptions = Array.from(
    new Set([
      "Guia",
      "Place",
      "Distracoes",
      ...(selectedDog?.trainingTypes ?? []),
      ...trainingSessions.flatMap((session) => session.notes.map((note) => note.block)),
    ]),
  );

  const feedSessions = useMemo(
    () => [...trainingSessions].sort((left, right) => {
      const byDate = parseBrazilianDate(right.date) - parseBrazilianDate(left.date);
      if (byDate !== 0) return byDate;
      return right.number - left.number;
    }),
    [trainingSessions],
  );

  const dogDirectory = useMemo(() => {
    const map = new Map<string, { name: string; breed: string; photoUrl?: string; clientName: string }>();

    clients.forEach((client) => {
      client.dogs.forEach((dog) => {
        map.set(dog.id, {
          name: dog.name,
          breed: dog.breed,
          photoUrl: dog.photoUrl,
          clientName: client.name,
        });
      });
    });

    return map;
  }, [clients]);

  const phoneByDogId = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => {
      client.dogs.forEach((dog) => {
        map.set(dog.id, client.phone);
      });
    });
    return map;
  }, [clients]);

  const filteredFeed = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let nextSessions = feedSessions;

    // Recorte por cão, quando a navegação pediu um cão específico.
    if (feedDogId) {
      const focusName = dogDirectory.get(feedDogId)?.name;
      nextSessions = nextSessions.filter((session) => {
        if (session.dogId) return session.dogId === feedDogId;
        if ((session.dogSessions ?? []).some((ds) => ds.dogId === feedDogId)) return true;
        return !!focusName && session.dogName === focusName;
      });
    }

    if (feedFilter !== "all") {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekThreshold = dayStart - 6 * 24 * 60 * 60 * 1000;

      nextSessions = nextSessions.filter((session) => {
        const dateValue = parseBrazilianDate(session.date);
        const status = statusFromScore(averageSessionScore(session.notes));

        if (feedFilter === "today") return dateValue >= dayStart;
        if (feedFilter === "week") return dateValue >= weekThreshold;
        return status === "pendente";
      });
    }

    if (!normalizedSearch) return nextSessions;

    return nextSessions.filter((session) => {
      const haystack = [
        session.title,
        session.clientName,
        session.dogName,
        ...session.notes.map((note) => `${note.block} ${note.comment}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [feedFilter, feedSessions, searchTerm, feedDogId, dogDirectory]);

  function handleOpenWhatsApp(phone?: string, dogName?: string) {
    const normalizedPhone = (phone ?? "").replace(/\D/g, "");
    if (!normalizedPhone) {
      setSaveError("Cliente sem telefone válido para abrir WhatsApp.");
      window.setTimeout(() => setSaveError(""), 3000);
      return;
    }

    const message = encodeURIComponent(
      `Oi! Estou registrando o treino${dogName ? ` do ${dogName}` : ""} e vou te atualizar com a evolucao.`,
    );

    window.open(`https://wa.me/55${normalizedPhone}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  const feedTitle =
    feedFilter === "today"
      ? "Treinos de hoje"
      : feedFilter === "week"
      ? "Treinos da semana"
      : feedFilter === "pending"
      ? "Treinos que precisam de atenção"
      : "Todos os treinos";

  const averageDraftScore = draftNotes.length
    ? (draftNotes.reduce((total, note) => total + note.score, 0) / draftNotes.length).toFixed(1)
    : "0.0";

  const draftBlocksLabel = draftNotes.map((note) => note.block).join(" • ");
  const totalMediaKb = draftMedia.reduce((sum, item) => sum + item.sizeKb, 0);

  function resetDraftNotes(defaultBlock = selectedDog?.trainingTypes[0] ?? "Guia") {
    setDraftNotes([createDraftTrainingNote(defaultBlock)]);
  }

  function updateDraftNote(noteId: string, field: keyof Omit<DraftTrainingNote, "id">, value: string | number) {
    setDraftNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              [field]: value,
            }
          : note,
      ),
    );
  }

  function addDraftNote() {
    setDraftNotes((currentNotes) => [
      ...currentNotes,
      createDraftTrainingNote(selectedDog?.trainingTypes[0] ?? blockOptions[0] ?? "Guia"),
    ]);
  }

  function removeDraftNote(noteId: string) {
    setDraftNotes((currentNotes) => {
      if (currentNotes.length === 1) return currentNotes;
      return currentNotes.filter((note) => note.id !== noteId);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const validNotes = draftNotes
      .map((note) => ({
        block: note.block.trim(),
        score: note.score,
        comment: note.comment.trim(),
      }))
      .filter((note) => note.block && note.comment);

    if (!title.trim() || !selectedClient || !selectedDog || !validNotes.length) return;
    if (totalMediaKb > MAX_TOTAL_MEDIA_KB) {
      setSaveError("As imagens da sessão excedem o limite total permitido.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      const ok = await addTrainingSession({
        number: nextSessionNumber,
        title: title.trim(),
        date: new Date().toLocaleDateString("pt-BR"),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        dogId: selectedDog.id,
        dogName: selectedDog.name,
        notes: validNotes,
        media: draftMedia,
      });

      if (ok) {
        setTitle("Sessão prática");
        resetDraftNotes();
        setDraftMedia([]);
        setMediaError("");
        setShowForm(false);
      } else {
        setSaveError("Erro ao salvar sessão. Verifique sua conexão e tente novamente.");
        window.setTimeout(() => setSaveError(""), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMediaSelect(files: FileList | null) {
    if (!files?.length) return;

    setMediaError("");
    const room = MAX_MEDIA_ITEMS - draftMedia.length;
    if (room <= 0) {
      setMediaError(`Limite de ${MAX_MEDIA_ITEMS} imagens por sessao atingido.`);
      return;
    }

    const selected = Array.from(files).slice(0, room);
    setIsCompressingMedia(true);

    try {
      const compressed = await Promise.all(
        selected.map(async (file) => {
          if (!file.type.startsWith("image/")) {
            throw new Error("Apenas imagens sao permitidas.");
          }

          const media = await compressTrainingImage(file);
          if ((media.mainSizeKb ?? media.sizeKb) > MAX_MAIN_IMAGE_KB) {
            throw new Error(`Imagem principal acima do limite de ${MAX_MAIN_IMAGE_KB}KB.`);
          }

          if ((media.thumbSizeKb ?? 0) > MAX_THUMB_KB) {
            throw new Error(`Miniatura acima do limite de ${MAX_THUMB_KB}KB.`);
          }

          return media;
        }),
      );

      const nextMedia = [...draftMedia, ...compressed];
      const nextTotalKb = nextMedia.reduce((sum, item) => sum + item.sizeKb, 0);
      if (nextTotalKb > MAX_TOTAL_MEDIA_KB) {
        setMediaError(`Total de imagens excede ${MAX_TOTAL_MEDIA_KB}KB. Remova alguma imagem.`);
        return;
      }

      setDraftMedia(nextMedia);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao processar imagem.";
      setMediaError(message);
    } finally {
      setIsCompressingMedia(false);
    }
  }

  function removeDraftMedia(mediaId: string) {
    setDraftMedia((current) => current.filter((item) => item.id !== mediaId));
  }

  return (
    <AuthGuard role="trainer">
      <main className="page">
        {clients.length === 0 ? (
          <section className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">Nenhum cliente cadastrado</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Cadastre um cliente e seu cão para começar os registros.</p>
            <Link href="/clientes" className="pc-primary-action mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
              Cadastrar cliente
            </Link>
          </section>
        ) : (
          <section data-tour="treinos-feed" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]">
                  <TinyIcon name="back" />
                </Link>
                <div>
                  <p className="text-base font-semibold text-[var(--foreground)]">Histórico de treinos</p>
                  <p className="text-[12px] text-[var(--muted)]">Consulte aulas registradas e abra o registro guiado.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white"
                aria-label="Novo treino"
              >
                <TinyIcon name="plus" />
              </button>
            </header>

            <section className="mt-3 flex gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[var(--muted)]">
                <TinyIcon name="search" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por cão ou cliente..."
                  className="w-full border-none bg-transparent text-sm text-[var(--foreground)] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowQuickFilters((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--foreground)]"
                aria-label="Filtros"
              >
                <TinyIcon name="filter" />
              </button>
            </section>

            {/* Recorte por cão visível e removível — filtro escondido engana tanto
                quanto lista sem filtro nenhum. */}
            {feedDogId ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent-text)]">
                  Mostrando só: {dogDirectory.get(feedDogId)?.name ?? "este cão"}
                  <button
                    type="button"
                    onClick={() => setFeedDogId("")}
                    aria-label="Mostrar treinos de todos os cães"
                    className="text-[14px] leading-none"
                  >
                    ×
                  </button>
                </span>
              </div>
            ) : null}

            <section className={`mt-3 flex gap-2 overflow-x-auto pb-1 ${showQuickFilters ? "" : "hidden"}`}>
              {[
                { value: "today", label: "Hoje" },
                { value: "week", label: "Semana" },
                { value: "all", label: "Todos" },
                { value: "pending", label: "Atenção" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedFilter(option.value as FeedFilter)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold ${
                    feedFilter === option.value
                      ? "bg-[var(--accent)] text-white"
                      : option.value === "pending"
                      ? "bg-[#fff4df] text-[#9a6b09]"
                      : "border border-[var(--border)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </section>

            <section className="mt-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">{feedTitle}</p>
              <div className="flex items-center gap-3">
                <Link href="/treinos/registro" className="text-[12px] font-semibold text-[var(--foreground)]">Registrar aula</Link>
                <Link href="/agenda" className="text-[12px] font-semibold text-[var(--foreground)]">Ver agenda</Link>
              </div>
            </section>

            <section className="mt-2 space-y-2.5">
              {filteredFeed.slice(0, 8).map((session) => {
                const score = averageSessionScore(session.notes);
                const dogMeta = session.dogId ? dogDirectory.get(session.dogId) : undefined;
                const dogName = session.dogName || dogMeta?.name || "Cão";
                const breed = dogMeta?.breed || "Sem raca";
                const clientName = session.clientName || dogMeta?.clientName || "Cliente";
                const firstNote = session.notes[0];
                const isExpanded = expandedSessionId === session.id;
                const detailedSessions = session.dogSessions ?? [];
                const firstDetailed = detailedSessions[0];
                const hasDetailedSessions = detailedSessions.length > 0;
                // Resumo público e comandos aparecem inline — sem precisar abrir "Detalhes".
                const publicSummary = firstDetailed?.description || firstNote?.comment || "";
                const topExercises = firstDetailed
                  ? sessionExercisesFromParsed(firstDetailed).slice(0, 4)
                  : [];

                return (
                  <article key={session.id} className="rounded-md border border-[var(--border)] bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="relative h-11 w-11 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <Image
                            src={dogMeta?.photoUrl || "/images/dog-default-bolt.svg"}
                            alt={`Foto de ${dogName}`}
                            fill
                            sizes="44px"
                            unoptimized
                            onError={(event) => {
                              event.currentTarget.src = "/images/dog-default-bolt.svg";
                            }}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <Link
                            href={`/treinos/registro?sessionId=${session.id}`}
                            className="text-sm font-semibold text-[var(--foreground)] hover:underline"
                          >
                            {dogName}
                          </Link>
                          <p className="text-[12px] text-[var(--muted)]">{clientName} • {breed}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <StarRating score={score} className="text-[13px]" />
                            <span className="text-[12px] text-[var(--muted)]">{score.toFixed(1)}/10</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[12px] font-semibold text-[var(--foreground)]">
                          Registrado
                        </span>
                        <span className="text-[12px] text-[var(--muted)]">{session.date}</span>
                      </div>
                    </div>

                    {publicSummary && (
                      <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted-strong)]">
                        {publicSummary}
                      </p>
                    )}

                    {topExercises.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {topExercises.map((item, idx) => (
                          <span
                            key={`${item.key}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
                            style={{
                              color: EXERCISE_TONE_VARS[categoryTone(item.categoryKey)].fg,
                              backgroundColor: EXERCISE_TONE_VARS[categoryTone(item.categoryKey)].bg,
                              borderColor: EXERCISE_TONE_VARS[categoryTone(item.categoryKey)].border,
                            }}
                          >
                            {item.name}
                            <span className="text-amber-500">{"★".repeat(item.rating || 0)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-3.5 border-t border-slate-100 pt-3 space-y-3 text-xs text-slate-700 animate-in fade-in duration-200">
                        {hasDetailedSessions ? (
                          // @ts-ignore
                          session.dogSessions.map((ds, index) => (
                            <div key={ds.id || index} className="space-y-3">
                              {/* Exercícios trabalhados — agrupados por categoria */}
                              {(() => {
                                const groups = groupExercisesByCategory(sessionExercisesFromParsed(ds));
                                if (!groups.length) return null;
                                return (
                                  <div>
                                    <p className="font-bold text-[var(--foreground)] uppercase tracking-[0.08em] text-[12px]">
                                      1. Exercícios trabalhados
                                    </p>
                                    <div className="mt-1.5 space-y-2">
                                      {groups.map((group) => (
                                        <div
                                          key={group.categoryKey}
                                          className="rounded-md border p-2"
                                          style={{
                                            backgroundColor: EXERCISE_TONE_VARS[group.tone].bg,
                                            borderColor: EXERCISE_TONE_VARS[group.tone].border,
                                          }}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span
                                              className="text-[12px] font-bold uppercase tracking-wide"
                                              style={{ color: EXERCISE_TONE_VARS[group.tone].fg }}
                                            >
                                              {group.categoryName}
                                            </span>
                                            <span
                                              className="text-[12px] font-bold"
                                              style={{ color: EXERCISE_TONE_VARS[group.tone].fg }}
                                            >
                                              {group.average.toFixed(1)}/5
                                            </span>
                                          </div>
                                          <ul className="mt-1 space-y-1">
                                            {group.items.map((item, idx) => (
                                              <li key={`${item.key}-${idx}`}>
                                                <div className="flex items-center justify-between gap-1.5">
                                                  <span className="font-semibold text-slate-800">
                                                    {item.name}
                                                    <span className="ml-1 font-normal text-slate-500">· {item.areaName}</span>
                                                  </span>
                                                  <span className="text-amber-500">{"★".repeat(item.rating || 0)}</span>
                                                </div>
                                                {item.notes && (
                                                  <p className="text-[12px] text-slate-500 italic mt-0.5">{item.notes}</p>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Seção C: Resumo Público */}
                              {ds.description && (
                                <div>
                                  <p className="font-bold text-[var(--foreground)] uppercase tracking-[0.08em] text-[12px]">3. Resumo do Cliente</p>
                                  <p className="mt-1 text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed">{ds.description}</p>
                                </div>
                              )}

                              {/* Seção D: Notas Privadas */}
                              {ds.privateNotes && (
                                <div>
                                  <p className="font-bold text-rose-700 uppercase tracking-[0.08em] text-[12px]">4. Notas Privadas (Confidencial)</p>
                                  <p className="mt-1 text-rose-950 bg-rose-50/50 p-2 rounded-lg leading-relaxed border border-rose-100">{ds.privateNotes}</p>
                                </div>
                              )}

                              {/* Seção E: IA Resumo */}
                              {ds.aiSummary && (
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-purple-800 uppercase tracking-[0.08em] text-[12px]">5. Análise e Resumo da IA</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${ds.aiApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                                      {ds.aiApproved ? "Aprovado p/ Portal" : "Não Aprovado"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-purple-950 bg-purple-50/50 p-2 rounded-lg leading-relaxed border border-purple-100 italic">"{ds.aiSummary}"</p>
                                </div>
                              )}

                              {/* Seção 7: Plano do Próximo Treino (Foco + comandos unificados) */}
                              {((ds.nextFocus && ds.nextFocus.trim()) || (ds.nextCommands && ds.nextCommands.length > 0)) && (
                                <div>
                                  <p className="font-bold text-[var(--foreground)] uppercase tracking-[0.08em] text-[12px]">7. Plano do Próximo Treino</p>
                                  <ul className="mt-1 space-y-1 pl-1">
                                    {ds.nextFocus && ds.nextFocus.trim() && (
                                      <li className="text-slate-700 font-semibold">{ds.nextFocus}</li>
                                    )}
                                    {(ds.nextCommands ?? []).map((nc: string, idx: number) => (
                                      <li key={idx} className="text-slate-700">{nc}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Seção 8: Dever de Casa */}
                              {ds.nextTasks && ds.nextTasks.length > 0 && (
                                <div>
                                  <p className="font-bold text-[var(--foreground)] uppercase tracking-[0.08em] text-[12px]">8. Dever de Casa para o Cliente</p>
                                  <ul className="mt-1 space-y-1 pl-1">
                                    {ds.nextTasks.map((t: string, idx: number) => (
                                      <li key={idx} className="text-slate-700">{t}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Evolução Comportamental (notas 0-5) */}
                              {ds.behaviorScores && Object.keys(ds.behaviorScores).length > 0 && (
                                <div>
                                  <p className="font-bold text-[var(--foreground)] uppercase tracking-[0.08em] text-[12px]">Evolução Comportamental</p>
                                  <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 pl-1">
                                    {Object.entries(ds.behaviorScores)
                                      .filter(([, v]) => Number(v) > 0)
                                      .map(([k, v]) => (
                                        <li key={k} className="flex items-center justify-between text-slate-700">
                                          <span>{behaviorLabel(k)}</span>
                                          <span className="font-semibold">{Number(v)}/5</span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          // Fallback para treino simples antigo
                          <div className="space-y-2">
                            <p className="font-bold text-slate-500 uppercase tracking-[0.08em] text-[12px]">Evolução do Treino</p>
                            {session.notes.map((n, idx) => (
                              <div key={idx} className="bg-slate-50 p-2 rounded-lg">
                                <p className="font-semibold text-slate-800">{n.block} (Nota: {n.score}/10)</p>
                                <p className="text-slate-600 mt-0.5">{n.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                      <button
                        type="button"
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)] font-semibold"
                      >
                        {isExpanded ? "Recolher" : "Ver ficha completa"}
                      </button>
                      <Link
                        href={`/treinos/registro?sessionId=${session.id}`}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)]"
                      >
                        <TinyIcon name="list" />
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(session.dogId ? phoneByDogId.get(session.dogId) : undefined, dogName)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[var(--foreground)]"
                      >
                        <TinyIcon name="whats" />
                        WhatsApp
                      </button>
                    </div>
                  </article>
                );
              })}

              {!filteredFeed.length ? (
                <article className="rounded-md border border-dashed border-[var(--border)] bg-white p-4 text-xs text-[var(--muted)]">
                  Nenhum treino encontrado para este filtro.
                </article>
              ) : null}
            </section>

            <section className="mt-4 rounded-md border border-[var(--border)] bg-[#f1f8fe] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Registro guiado da aula</p>
                  <p className="text-xs text-[var(--muted)]">Use um caminho único para resumo, avaliação, fotos e tarefa de casa.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                >
                  {showForm ? "Fechar" : "Registro rápido"}
                </button>
              </div>
            </section>

            {showForm ? (
              <article className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Registrar treino</p>
                <form onSubmit={onSubmit} className="mt-3 grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[12px] font-medium text-[var(--muted)]">Cliente</span>
                      <select
                        value={selectedClientValue}
                        onChange={(event) => {
                          const nextClientId = event.target.value;
                          const nextClient = clients.find((client) => client.id === nextClientId);
                          const nextDog = nextClient?.dogs[0];
                          setSelectedClientId(nextClientId);
                          setSelectedDogId(nextDog?.id ?? "");
                          resetDraftNotes(nextDog?.trainingTypes[0] ?? "Guia");
                        }}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      >
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-[12px] font-medium text-[var(--muted)]">Cão</span>
                      <select
                        value={selectedDogValue}
                        onChange={(event) => {
                          const nextDogId = event.target.value;
                          const nextDog = selectedClient?.dogs.find((dog) => dog.id === nextDogId);
                          setSelectedDogId(nextDogId);
                          resetDraftNotes(nextDog?.trainingTypes[0] ?? "Guia");
                        }}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      >
                        {(selectedClient?.dogs ?? []).map((dog) => (
                          <option key={dog.id} value={dog.id}>{dog.name} • {dog.breed}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                    placeholder="Título da sessão"
                    required
                  />

                  <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">Blocos: {draftBlocksLabel || "Sem blocos"}</p>
                    <button
                      type="button"
                      onClick={addDraftNote}
                      className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-semibold text-[var(--foreground)]"
                    >
                      Adicionar bloco
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draftNotes.map((note, index) => (
                      <div key={note.id} className="rounded-md border border-[var(--border)] bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[var(--foreground)]">Bloco {index + 1}</p>
                          {draftNotes.length > 1 ? (
                            <button type="button" onClick={() => removeDraftNote(note.id)} className="text-[12px] font-semibold text-amber-800">
                              Remover
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_95px]">
                          <select
                            value={note.block}
                            onChange={(event) => updateDraftNote(note.id, "block", event.target.value)}
                            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                          >
                            {blockOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={note.score}
                            onChange={(event) => updateDraftNote(note.id, "score", Number(event.target.value))}
                            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                          />
                        </div>

                        <textarea
                          value={note.comment}
                          onChange={(event) => updateDraftNote(note.id, "comment", event.target.value)}
                          className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-sky-400"
                          placeholder="Resumo tecnico do bloco"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[var(--muted)]">Imagens: {draftMedia.length}/{MAX_MEDIA_ITEMS} • {totalMediaKb}/{MAX_TOTAL_MEDIA_KB}KB</p>
                      <label className="cursor-pointer rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-semibold text-[var(--foreground)]">
                        {isCompressingMedia ? "Comprimindo..." : "Adicionar"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={isCompressingMedia}
                          onChange={(event) => {
                            handleMediaSelect(event.target.files);
                            event.currentTarget.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {mediaError ? <p className="mt-2 text-xs text-rose-700">{mediaError}</p> : null}
                    {draftMedia.length ? (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {draftMedia.map((media) => (
                          <div key={media.id} className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                            <div className="relative h-16 w-full">
                              <Image
                                src={media.thumbDataUrl || media.dataUrl}
                                alt="Treino"
                                fill
                                sizes="(min-width: 640px) 10vw, 25vw"
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDraftMedia(media.id)}
                              className="w-full border-t border-[var(--border)] px-1 py-1 text-[12px] font-semibold text-amber-800"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button type="submit" disabled={isSaving} className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {isSaving ? "Salvando..." : "Salvar sessão"}
                  </button>

                  {saveError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{saveError}</p> : null}

                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
                    Caso: {selectedClient?.name} • {selectedDog?.name} • Sessao {nextSessionNumber} • Media {averageDraftScore}/10
                  </div>
                </form>
              </article>
            ) : null}
          </section>
        )}
      </main>
    </AuthGuard>
  );
}
