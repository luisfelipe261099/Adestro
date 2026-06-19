"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { TagsEditor } from "@/components/tags-editor";
import { useAppStore } from "@/lib/app-store";
import { googleMapsLink } from "@/lib/calendar-ics";
import { maskCEP, maskCPF, maskDate, maskPhone } from "@/lib/masks";

type ClientStatus = "ativos" | "inativos" | "rascunho";
type SortMode = "recentes" | "nome";
type EntityKind = "humanos" | "caes";

function parseBrazilianDate(date: string): number {
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

// Calcula uma idade legível ("2 anos e 3 meses") a partir de uma data ISO
// (YYYY-MM-DD vinda de <input type="date">). Retorna "" se a data for inválida
// ou futura. Não depende de schema: o resultado é gravado no campo `age`.
function dogAgeFromBirthDate(iso: string): string {
  if (!iso) return "";
  const birth = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  if (birth.getTime() > now.getTime()) return "";

  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years === 0 && remMonths === 0) return "Recém-nascido";
  if (years === 0) return `${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;

  const yearLabel = `${years} ${years === 1 ? "ano" : "anos"}`;
  if (remMonths === 0) return yearLabel;
  return `${yearLabel} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getClientStatus(params: { hasRecentSession: boolean }): ClientStatus {
  if (params.hasRecentSession) return "ativos";
  return "inativos";
}

function statusStyle(status: ClientStatus): string {
  if (status === "ativos") return "bg-sky-100 text-sky-800";
  if (status === "rascunho") return "bg-amber-100 text-amber-800 border border-amber-200/50";
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: ClientStatus): string {
  if (status === "ativos") return "Ativo";
  if (status === "rascunho") return "Rascunho";
  return "Inativo";
}

function SmallIcon({ name }: { name: "search" | "filter" | "plus" | "dog" | "money" | "calendar" }) {
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
        <path d="M5 7h14M8 12h8M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "dog") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <circle cx="8" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 18.6c2.7 0 4.8-1.7 4.8-3.9 0-1.9-2-3.5-4.8-3.5s-4.8 1.6-4.8 3.5c0 2.2 2.1 3.9 4.8 3.9Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.8v3.5M16 3.8v3.5M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function ClientsPage() {
  const clients = useAppStore((state) => state.clients);
  const sessions = useAppStore((state) => state.trainingSessions);
  const events = useAppStore((state) => state.calendarEvents);
  const addClientWithDog = useAppStore((state) => state.addClientWithDog);
  const approveClient = useAppStore((state) => state.approveClient);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | ClientStatus>("todos");
  const [entityKind, setEntityKind] = useState<EntityKind>("humanos");
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recentes");
  const [showForm, setShowForm] = useState(false);

  // ─── ESTADO DE GERENCIAMENTO DE TAREFAS (PORTAL) ──────────────────────
  const [activeTaskIdForManagement, setActiveTaskIdForManagement] = useState<string | null>(null);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newPortalTaskTitle, setNewPortalTaskTitle] = useState("");
  const [newPortalTaskDesc, setNewPortalTaskDesc] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [crmEvidenceLightbox, setCrmEvidenceLightbox] = useState<{ src: string; title: string } | null>(null);

  const activeClientForTasks = clients.find((c) => c.id === activeTaskIdForManagement);

  // ─── ESTADO DO FORMULÁRIO EM 5 ETAPAS ────────────────────────────────
  const [formStep, setFormStep] = useState(1);

  // Etapa 1: Dados do Tutor
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  // Etapa 2: Endereço do Tutor
  const [addrNickname, setAddrNickname] = useState("Casa");
  const [addrZipCode, setAddrZipCode] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrComplement, setAddrComplement] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(true);
  const [isCEPLoading, setIsCEPLoading] = useState(false);

  // Etapa 3: Identificação do Cão
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [dogBirthDate, setDogBirthDate] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [dogSex, setDogSex] = useState("Macho");
  const [dogCastrated, setDogCastrated] = useState(false);
  const [dogMicrochip, setDogMicrochip] = useState("");
  const [dogColor, setDogColor] = useState("");
  const [dogPhotoUrl, setDogPhotoUrl] = useState("");
  const [dogPhotoPreview, setDogPhotoPreview] = useState("");

  // Etapa 4: Saúde e Vacinas
  const [vaccines, setVaccines] = useState<Array<{ name: string; date: string; validity: string; alert: boolean }>>([]);
  const [newVacName, setNewVacName] = useState("");
  const [newVacDate, setNewVacDate] = useState("");
  const [newVacValidity, setNewVacValidity] = useState("");
  const [newVacAlert, setNewVacAlert] = useState(true);
  const [dietRestrictions, setDietRestrictions] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [veterinarian, setVeterinarian] = useState("");

  // Etapa 5: Temperamento, Rotinas e Objetivos
  const [tempEnergy, setTempEnergy] = useState("Energia moderada");
  const [tempSocial, setTempSocial] = useState("Sociável com pessoas");
  const [tempDogs, setTempDogs] = useState("Sociável com outros cães");
  const [tempBehavior, setTempBehavior] = useState("");
  const [tempPositive, setTempPositive] = useState("");
  const [rotAlimentation, setRotAlimentation] = useState("");
  const [rotSleep, setRotSleep] = useState("");
  const [rotWalks, setRotWalks] = useState("");
  const [rotPlays, setRotPlays] = useState("");
  const [goalsObediencia, setGoalsObediencia] = useState(true);
  const [goalsComportamento, setGoalsComportamento] = useState(false);
  const [goalsPasseio, setGoalsPasseio] = useState(false);
  const [goalsAvancado, setGoalsAvancado] = useState(false);
  const [goalsReab, setGoalsReab] = useState(false);
  const [propertyType, setPropertyType] = useState("Apartamento");
  const [envConvive, setEnvConvive] = useState("");
  const [envAloneTime, setEnvAloneTime] = useState("2–4h");
  const [envHistory, setEnvHistory] = useState("Nunca foi adestrado");
  const [planLabel, setPlanLabel] = useState("Plano Pro - 8 aulas");
  const [trainingTypesRaw, setTrainingTypesRaw] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  // Busca Automática de CEP
  const handleLookupCEP = async () => {
    const cleanCEP = addrZipCode.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    setIsCEPLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddrStreet(data.logradouro || "");
        setAddrNeighborhood(data.bairro || "");
        setAddrCity(data.localidade || "");
        setAddrState(data.uf || "");
      }
    } catch {
      // ignore
    } finally {
      setIsCEPLoading(false);
    }
  };

  const handleAddVaccine = () => {
    if (!newVacName || !newVacDate) return;
    setVaccines([
      ...vaccines,
      { name: newVacName, date: newVacDate, validity: newVacValidity, alert: newVacAlert }
    ]);
    setNewVacName("");
    setNewVacDate("");
    setNewVacValidity("");
    setNewVacAlert(true);
  };

  const handleRemoveVaccine = (idx: number) => {
    setVaccines(vaccines.filter((_, i) => i !== idx));
  };

  async function handleDogPhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    if (file.size > 1_500_000) {
      setSaveError("Imagem muito grande. Use um arquivo de até 1.5MB.");
      event.target.value = "";
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Falha ao ler imagem."));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!dataUrl) {
      setSaveError("Não foi possível carregar a imagem.");
      event.target.value = "";
      return;
    }

    setSaveError("");
    setDogPhotoUrl("");
    setDogPhotoPreview(dataUrl);
  }

  const clientsWithMeta = useMemo(() => {
    return clients.map((client, index) => {
      const lastSessionDate = sessions
        .filter((session) => session.clientId === client.id || session.clientName === client.name)
        .map((session) => parseBrazilianDate(session.date))
        .sort((a, b) => b - a)[0] ?? 0;

      const hasRecentSession = lastSessionDate > 0;
      // O status SALVO no banco tem prioridade — um cliente recém-cadastrado é
      // "Ativo" e não pode aparecer como "Inativo" só por ainda não ter sessão.
      // getClientStatus fica como fallback para registros legados/sem status.
      const status =
        client.status === "Rascunho"
          ? "rascunho"
          : client.status === "Inativo"
            ? "inativos"
            : client.status === "Ativo"
              ? "ativos"
              : getClientStatus({ hasRecentSession });

      return {
        client,
        status,
        lastSessionDate,
        insertionOrder: index,
      };
    });
  }, [clients, sessions]);

  const filteredClients = useMemo(() => {
    const search = normalizeText(searchTerm.trim());

    return clientsWithMeta
      .filter((item) => {
        if (statusFilter !== "todos" && item.status !== statusFilter) return false;
        if (!search) return true;

        const searchable = normalizeText(
          [
            item.client.name,
            item.client.phone,
            item.client.plan,
            item.client.propertyType,
            ...item.client.dogs.map((dog) => `${dog.name} ${dog.breed} ${dog.trainingTypes.join(" ")}`),
          ].join(" "),
        );

        return searchable.includes(search);
      })
      .sort((a, b) => {
        if (sortMode === "nome") {
          return a.client.name.localeCompare(b.client.name, "pt-BR");
        }

        const bySession = b.lastSessionDate - a.lastSessionDate;
        if (bySession !== 0) return bySession;
        return b.insertionOrder - a.insertionOrder;
      });
  }, [clientsWithMeta, searchTerm, statusFilter, sortMode]);

  const filteredDogs = useMemo(
    () =>
      filteredClients.flatMap((item) =>
        item.client.dogs.map((dog) => ({
          client: item.client,
          dog,
          status: item.status,
        })),
      ),
    [filteredClients],
  );

  const totalDogs = clients.reduce((total, client) => total + client.dogs.length, 0);
  const activeClients = clientsWithMeta.filter((item) => item.status === "ativos").length;
  const adherenceRate = clients.length ? Math.round((activeClients / clients.length) * 100) : 0;

  const fetchClientTasks = async (clientId: string) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/portal-tasks?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClientTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (clientId: string) => {
    if (!newPortalTaskTitle.trim() || isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/portal-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPortalTaskTitle.trim(),
          description: newPortalTaskDesc.trim(),
          clientId,
        }),
      });
      if (res.ok) {
        setNewPortalTaskTitle("");
        setNewPortalTaskDesc("");
        await fetchClientTasks(clientId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (clientId: string, taskId: string) => {
    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;
    try {
      const res = await fetch(`/api/portal-tasks?id=${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchClientTasks(clientId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    // Só salva na ÚLTIMA etapa — evita salvar quando o usuário aperta Enter ou
    // o "Go"/"Enviar" do teclado do celular nas etapas anteriores.
    if (formStep !== 5) return;

    if (!clientName.trim() || !dogName.trim()) {
      setSaveError("Nome do tutor e nome do cão são obrigatórios.");
      return;
    }

    const trainingTypes = trainingTypesRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setSaveError("");
    setIsSaving(true);

    const payload = {
      clientName: clientName.trim(),
      phone: phone.trim() || "(00) 00000-0000",
      email: email.trim(),
      birthDate,
      cpf: cpf.trim(),
      privateNotes,
      status: "Ativo",
      propertyType,
      environment: envConvive,
      plan: planLabel.trim() || "Plano personalizado",
      addresses: [
        {
          nickname: addrNickname,
          zipCode: addrZipCode,
          street: addrStreet,
          number: addrNumber,
          complement: addrComplement,
          neighborhood: addrNeighborhood,
          city: addrCity,
          state: addrState,
          isDefault: addrIsDefault
        }
      ],
      dogName: dogName.trim(),
      breed: breed.trim() || "SRD",
      age: age.trim() || "Não informado",
      weight: weight.trim() || "Não informado",
      photoUrl: dogPhotoPreview || dogPhotoUrl.trim() || undefined,
      trainingTypes: trainingTypes.length ? trainingTypes : ["Obediência básica"],
      sex: dogSex,
      castrated: dogCastrated,
      microchip: dogMicrochip,
      color: dogColor,
      vaccines,
      dietRestrictions,
      healthConditions,
      veterinarian,
      temperament: { energy: tempEnergy, social: tempSocial, dogs: tempDogs, behavior: tempBehavior, positive: tempPositive },
      routine: { alimentation: rotAlimentation, sleep: rotSleep, walks: rotWalks, plays: rotPlays },
      trainingGoals: { obediencia: goalsObediencia, comportamento: goalsComportamento, passeio: goalsPasseio, avancado: goalsAvancado, reabilitacao: goalsReab },
      environmentalAnalysis: { convive: envConvive, aloneTime: envAloneTime, history: envHistory }
    };

    try {
      const result = await addClientWithDog(payload);

      if (!result.ok) {
        setSaveError(result.error || "Erro ao cadastrar. Tente novamente.");
        window.setTimeout(() => setSaveError(""), 6000);
        return;
      }

      // Limpar campos
      setClientName("");
      setPhone("");
      setEmail("");
      setBirthDate("");
      setCpf("");
      setPrivateNotes("");
      setAddrNickname("Casa");
      setAddrZipCode("");
      setAddrStreet("");
      setAddrNumber("");
      setAddrComplement("");
      setAddrNeighborhood("");
      setAddrCity("");
      setAddrState("");
      setDogName("");
      setBreed("");
      setDogBirthDate("");
      setAge("");
      setWeight("");
      setDogMicrochip("");
      setDogColor("");
      setDogPhotoUrl("");
      setDogPhotoPreview("");
      setVaccines([]);
      setDietRestrictions("");
      setHealthConditions("");
      setVeterinarian("");
      setShowForm(false);
      setFormStep(1);
      setSaveMessage("Tutor e cão cadastrados com sucesso.");
      window.setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthGuard role="trainer">
      <main className="page">
        <header className="page-header">
          <div className="page-header-actions">
            <div className="min-w-0">
              <p className="text-eyebrow mb-1.5">Carteira</p>
              <h1 className="text-display">Tutores e cães</h1>
              <p className="mt-1 text-subtitle">
                {clients.length} tutor{clients.length === 1 ? "" : "es"} · {totalDogs} cão{totalDogs === 1 ? "" : "es"} cadastrado{totalDogs === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/agenda" className="btn-secondary text-[12.5px]">Agenda</Link>
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setFormStep(3);
                }}
                className="btn-secondary text-[12.5px]"
              >
                + Cão
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm((current) => !current);
                  setFormStep(1);
                }}
                className="btn-primary text-[12.5px]"
              >
                + Novo tutor
              </button>
            </div>
          </div>
        </header>

        {/* Toolbar: busca + tabs + filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex h-9 flex-1 min-w-[200px] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--muted)]">
            <SmallIcon name="search" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={entityKind === "humanos" ? "Buscar tutor pelo nome" : "Buscar cão pelo nome ou raça"}
              className="w-full border-none bg-transparent text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>

          <div className="tabs">
            <button
              type="button"
              onClick={() => setEntityKind("humanos")}
              data-active={entityKind === "humanos"}
              className="tab-trigger"
            >
              Tutores
            </button>
            <button
              type="button"
              onClick={() => setEntityKind("caes")}
              data-active={entityKind === "caes"}
              className="tab-trigger"
            >
              Cães
            </button>
          </div>

          <div className="tabs">
            {[
              { value: "todos", label: "Todos" },
              { value: "ativos", label: "Ativos" },
              { value: "rascunho", label: "Rascunhos" },
              { value: "inativos", label: "Inativos" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                data-active={statusFilter === item.value}
                onClick={() => setStatusFilter(item.value as "todos" | ClientStatus)}
                className="tab-trigger"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

          {/* Mensagens de Feedback */}
          {saveMessage && (
            <p className="mt-3 rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs text-sky-800">{saveMessage}</p>
          )}

          {/* ─── CADASTRO EM 5 ETAPAS (WIZARD) ────────────────────────────────── */}
          {showForm && (
            <section className="mt-4 rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-[var(--foreground)]">Cadastro em Etapas (Etapa {formStep}/5)</span>
                <span className="text-[10px] font-semibold text-[var(--muted)]">
                  {formStep === 1 ? "Dados do Tutor" :
                   formStep === 2 ? "Endereços" :
                   formStep === 3 ? "Dados do Cão" :
                   formStep === 4 ? "Saúde e Vacinas" :
                   "Temperamento & Objetivos"}
                </span>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="mt-2.5 flex h-1.5 w-full gap-1.5 rounded-full bg-slate-100 overflow-hidden">
                {[1, 2, 3, 4, 5].map(s => (
                  <span
                    key={s}
                    className={`h-full flex-1 rounded-full transition-all ${
                      s <= formStep ? "bg-[var(--accent)]" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              <form
                onSubmit={onSubmit}
                onKeyDown={(e) => {
                  // Enter num campo de texto NÃO envia o formulário — só o botão
                  // "Finalizar Cadastro" salva. (Textarea mantém o Enter normal.)
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                    e.preventDefault();
                  }
                }}
                className="mt-4 space-y-3"
              >

                {/* ETAPA 1: Dados do Tutor */}
                {formStep === 1 && (
                  <div className="grid gap-2.5 animate-in fade-in duration-200">
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome completo do tutor *"
                      required
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="WhatsApp (com DDD) *"
                      required
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="E-mail (opcional)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={birthDate}
                        onChange={(e) => setBirthDate(maskDate(e.target.value))}
                        placeholder="Nascimento (DD/MM/AAAA)"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <input
                        value={cpf}
                        onChange={(e) => setCpf(maskCPF(e.target.value))}
                        placeholder="CPF (opcional)"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => setPrivateNotes(e.target.value)}
                      placeholder="Observações confidenciais do adestrador (não visíveis ao tutor)..."
                      rows={3}
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                  </div>
                )}

                {/* ETAPA 2: Endereço do Tutor */}
                {formStep === 2 && (
                  <div className="grid gap-2.5 animate-in fade-in duration-200">
                    <div className="flex gap-2">
                      <input
                        value={addrZipCode}
                        onChange={(e) => setAddrZipCode(maskCEP(e.target.value))}
                        placeholder="CEP (somente números)"
                        className="flex-1 min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCEP}
                        disabled={isCEPLoading}
                        className="rounded-md bg-sky-100 px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-sky-200"
                      >
                        {isCEPLoading ? "Buscando..." : "Buscar CEP"}
                      </button>
                    </div>

                    <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                      <input
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        placeholder="Logradouro / Rua"
                        required
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <input
                        value={addrNumber}
                        onChange={(e) => setAddrNumber(e.target.value)}
                        placeholder="Número"
                        required
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                    </div>

                    <input
                      value={addrComplement}
                      onChange={(e) => setAddrComplement(e.target.value)}
                      placeholder="Complemento (Apto, bloco, etc.)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />

                    <div className="grid grid-cols-[1.2fr_1fr_0.6fr] gap-2">
                      <input
                        value={addrNeighborhood}
                        onChange={(e) => setAddrNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <input
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        placeholder="Cidade"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <input
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none text-center focus:border-sky-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={addrNickname}
                        onChange={(e) => setAddrNickname(e.target.value)}
                        placeholder="Apelido (ex: Casa, Sítio)"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <label className="flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-slate-50 text-xs text-[var(--muted)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={addrIsDefault}
                          onChange={(e) => setAddrIsDefault(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Endereço Padrão
                      </label>
                    </div>

                    {/* Pré-visualização + botão mapa (módulo 2 §3.1) */}
                    {(addrStreet || addrCity) ? (
                      <a
                        href={googleMapsLink(
                          [addrStreet, addrNumber, addrNeighborhood, addrCity, addrState]
                            .filter(Boolean)
                            .join(", "),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                      >
                        📍 Ver no Google Maps
                      </a>
                    ) : null}
                  </div>
                )}

                {/* ETAPA 3: Dados do Cão */}
                {formStep === 3 && (
                  <div className="grid gap-2.5 animate-in fade-in duration-200">
                    <input
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                      placeholder="Nome do cão *"
                      required
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <input
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="Raça (opcional)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <label className="text-[10px] font-medium text-[var(--muted)]">Nascimento (calcula idade)</label>
                        <input
                          type="date"
                          value={dogBirthDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => {
                            setDogBirthDate(e.target.value);
                            const computed = dogAgeFromBirthDate(e.target.value);
                            if (computed) setAge(computed);
                          }}
                          className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[10px] font-medium text-[var(--muted)]">Peso</label>
                        <input
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="Ex: 20kg"
                          className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                    <input
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Idade (ex: 2 anos) — preenche sozinho pela data de nascimento"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={dogSex}
                        onChange={(e) => setDogSex(e.target.value)}
                        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                      >
                        <option value="Macho">Macho</option>
                        <option value="Fêmea">Fêmea</option>
                      </select>
                      <label className="flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-slate-50 text-xs text-[var(--muted)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dogCastrated}
                          onChange={(e) => setDogCastrated(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Castrado(a)
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={dogMicrochip}
                        onChange={(e) => setDogMicrochip(e.target.value)}
                        placeholder="Microchip (opcional)"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                      <input
                        value={dogColor}
                        onChange={(e) => setDogColor(e.target.value)}
                        placeholder="Cor / Marcações"
                        className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                      />
                    </div>

                    <label className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-xs text-[var(--muted)] cursor-pointer">
                      Foto do Cão (upload ou url)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDogPhotoFileChange}
                        className="mt-1 block w-full text-[10px] file:mr-2 file:rounded-lg file:border file:bg-white file:px-2 file:py-1"
                      />
                    </label>
                  </div>
                )}

                {/* ETAPA 4: Saúde e Vacinas */}
                {formStep === 4 && (
                  <div className="grid gap-2.5 animate-in fade-in duration-200">
                    
                    {/* Lista de Vacinas Adicionadas */}
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Vacinas do Animal</span>
                      {vaccines.length === 0 ? (
                        <p className="mt-1 text-[11px] text-[var(--muted)]">Nenhuma vacina registrada.</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {vaccines.map((v, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-white p-2 text-[11px]">
                              <div>
                                <p className="font-semibold text-slate-900">{v.name}</p>
                                <p className="text-[9px] text-[var(--muted)]">Aplicada: {v.date} {v.validity && `• Validade: ${v.validity}`}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveVaccine(i)}
                                className="text-[10px] font-semibold text-rose-600 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Editor de Vacinas */}
                    <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
                      <span className="text-[10px] font-bold uppercase text-[var(--foreground)] tracking-wider">Adicionar Vacina</span>
                      <input
                        value={newVacName}
                        onChange={e => setNewVacName(e.target.value)}
                        placeholder="Nome da vacina (ex: V10, Antirrábica)"
                        className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1 text-[9px] font-bold text-[var(--muted)] uppercase">
                          Aplicação
                          <input
                            type="text"
                            placeholder="DD/MM/AAAA"
                            value={newVacDate}
                            onChange={e => setNewVacDate(maskDate(e.target.value))}
                            className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          />
                        </label>
                        <label className="grid gap-1 text-[9px] font-bold text-[var(--muted)] uppercase">
                          Validade
                          <input
                            type="text"
                            placeholder="DD/MM/AAAA"
                            value={newVacValidity}
                            onChange={e => setNewVacValidity(maskDate(e.target.value))}
                            className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVaccine}
                        className="rounded-md bg-[var(--accent)] py-2 text-xs font-semibold text-white hover:bg-[#1b719d]"
                      >
                        + Adicionar na lista
                      </button>
                    </div>

                    <input
                      value={dietRestrictions}
                      onChange={(e) => setDietRestrictions(e.target.value)}
                      placeholder="Restrições alimentares (ex: Frango, Grãos)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <input
                      value={healthConditions}
                      onChange={(e) => setHealthConditions(e.target.value)}
                      placeholder="Condições de saúde relevante (ex: Displasia)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    <input
                      value={veterinarian}
                      onChange={(e) => setVeterinarian(e.target.value)}
                      placeholder="Veterinário de referência (Nome e Telefone)"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                  </div>
                )}

                {/* ETAPA 5: Temperamento, Rotinas e Objetivos */}
                {formStep === 5 && (
                  <div className="grid gap-2.5 animate-in fade-in duration-200">
                    
                    {/* Temperamento básico */}
                    <div className="grid grid-cols-3 gap-2">
                      <label className="grid gap-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                        Energia
                        <select
                          value={tempEnergy}
                          onChange={e => setTempEnergy(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[11px] outline-none"
                        >
                          <option value="Alta energia">Alta</option>
                          <option value="Energia moderada">Moderada</option>
                          <option value="Baixa energia">Baixa</option>
                          <option value="Hiperativo">Hiperativo</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                        Pessoas
                        <select
                          value={tempSocial}
                          onChange={e => setTempSocial(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[11px] outline-none"
                        >
                          <option value="Sociável com pessoas">Sociável</option>
                          <option value="Tímido/reservado">Tímido</option>
                          <option value="Agressivo com estranhos">Reativo</option>
                          <option value="Carente/dependente">Carente</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                        Outros cães
                        <select
                          value={tempDogs}
                          onChange={e => setTempDogs(e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[11px] outline-none"
                        >
                          <option value="Sociável com outros cães">Sociável</option>
                          <option value="Reativo a outros cães">Reativo</option>
                          <option value="Dominante">Dominante</option>
                          <option value="Submisso">Submisso</option>
                        </select>
                      </label>
                    </div>

                    <input
                      value={rotAlimentation}
                      onChange={(e) => setRotAlimentation(e.target.value)}
                      placeholder="Alimentação: ração, horários, tipos"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />
                    
                    <input
                      value={planLabel}
                      onChange={(e) => setPlanLabel(e.target.value)}
                      placeholder="Plano / Pacote de aulas atrelado"
                      className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400"
                    />

                    {/* Focos / Objetivos checkboxes */}
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Focos do Adestramento</span>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={goalsObediencia} onChange={e => setGoalsObediencia(e.target.checked)} />
                          Obediência Básica
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={goalsComportamento} onChange={e => setGoalsComportamento(e.target.checked)} />
                          Problemas Comportamentais
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={goalsPasseio} onChange={e => setGoalsPasseio(e.target.checked)} />
                          Passeio Estruturado
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={goalsAvancado} onChange={e => setGoalsAvancado(e.target.checked)} />
                          Comandos Avançados
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {saveError && (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{saveError}</p>
                )}

                {/* Controles do Wizard */}
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormStep(formStep - 1)}
                      className="rounded-md border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--muted)]"
                    >
                      Anterior
                    </button>
                  )}
                  
                  {formStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => setFormStep(formStep + 1)}
                      className="flex-1 rounded-md bg-[var(--accent)] py-2.5 text-xs font-semibold text-white"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 pc-primary-action rounded-md py-2.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {isSaving ? "Salvando..." : "Finalizar Cadastro"}
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* Listagem de Clientes */}
          <section data-tour="clients-list" className="mt-3 space-y-2">
            {filteredClients.length === 0 ? (
              <article className="rounded-md border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
                Nenhum {entityKind === "humanos" ? "tutor" : "cão"} encontrado com os filtros atuais.
              </article>
            ) : null}

            {entityKind === "caes" ? filteredDogs.map(({ client, dog, status }) => (
              <article key={`${client.id}-${dog.id}`} className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-11 w-11 overflow-hidden rounded-full bg-sky-100">
                      <Image
                        src={dog.photoUrl || "/images/dog-default-bolt.svg"}
                        alt={`Foto de ${dog.name}`}
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
                      <p className="text-sm font-semibold text-[var(--foreground)]">{dog.name}</p>
                      <p className="text-xs text-[var(--muted)]">Tutor: {client.name} • {dog.breed || "Raça não informada"}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusStyle(status)}`}>
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)]">
                  <p>Idade: {dog.age || "Não informada"}</p>
                  <p>Peso: {dog.weight || "Não informado"}</p>
                  <p>Plano: {client.plan || "Personalizado"}</p>
                  <p>{client.phone || "Sem telefone"}</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {status === "rascunho" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await approveClient(client.id);
                        if (ok) {
                          setSaveMessage("Ficha de onboarding de " + client.name + " aprovada com sucesso!");
                          window.setTimeout(() => setSaveMessage(""), 4000);
                        }
                      }}
                      className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      Revisar e Aprovar
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/treinos?clientId=${client.id}&dogId=${dog.id}`}
                        className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white whitespace-nowrap"
                      >
                        Ver histórico
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTaskIdForManagement(client.id);
                          fetchClientTasks(client.id);
                        }}
                        className="rounded-full border border-[#145a82] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground)] hover:bg-slate-50 transition whitespace-nowrap"
                      >
                        📋 Tarefas
                      </button>
                    </div>
                  )}
                  <Link href="/agenda" className="text-xs font-semibold text-[var(--foreground)] whitespace-nowrap">Agendar</Link>
                </div>
              </article>
            )) : filteredClients.map((item) => {
              const firstDog = item.client.dogs[0];
              const firstDogId = firstDog?.id;

              return (
                <article key={item.client.id} className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-sky-100">
                        <Image
                          src={firstDog?.photoUrl || "/images/dog-default-bolt.svg"}
                          alt={`Foto de ${firstDog?.name || "Pet"}`}
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
                        <p className="text-sm font-semibold text-[var(--foreground)]">{item.client.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {firstDog ? `${firstDog.name} • ${firstDog.breed}` : "Sem cão cadastrado"}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusStyle(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)]">
                    <p>Plano: {item.client.plan || "Personalizado"}</p>
                    <p>{item.client.propertyType || "Não informado"}</p>
                    <p>{item.client.phone || "Sem telefone"}</p>
                    <p>{item.client.dogs.length} cão(ões)</p>
                  </div>

                  <div className="mt-2 relative">
                    <TagsEditor
                      clientId={item.client.id}
                      initialTags={item.client.tags ?? []}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {item.status === "rascunho" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await approveClient(item.client.id);
                          if (ok) {
                            setSaveMessage("Ficha de onboarding de " + item.client.name + " aprovada com sucesso!");
                            window.setTimeout(() => setSaveMessage(""), 4000);
                          }
                        }}
                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        Revisar e Aprovar
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={firstDogId ? `/treinos?clientId=${item.client.id}&dogId=${firstDogId}` : "/treinos"}
                          className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white whitespace-nowrap"
                        >
                          Ver histórico
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTaskIdForManagement(item.client.id);
                            fetchClientTasks(item.client.id);
                          }}
                          className="rounded-full border border-[#145a82] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground)] hover:bg-slate-50 transition whitespace-nowrap"
                        >
                          📋 Tarefas
                        </button>
                      </div>
                    )}
                    <Link href="/portal" className="text-xs font-semibold text-[var(--foreground)] whitespace-nowrap">Portal</Link>
                  </div>
                </article>
              );
            })}
          </section>
      </main>

      {/* Modal de Gerenciamento de Tarefas */}
      {activeTaskIdForManagement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setActiveTaskIdForManagement(null)}
          />
          <div className="relative w-full max-w-lg rounded-lg border border-[var(--border)] bg-white p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <header className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tarefas de Casa</h3>
                <p className="text-xs text-[var(--muted)]">
                  Tutor: {activeClientForTasks?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskIdForManagement(null)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Fechar
              </button>
            </header>

            {/* Listagem de Tarefas */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingTasks ? (
                <p className="text-center text-xs text-[var(--muted)] py-6">Carregando tarefas...</p>
              ) : clientTasks.length === 0 ? (
                <p className="text-center text-xs text-[var(--muted)] py-8">Nenhuma tarefa cadastrada para este tutor.</p>
              ) : (
                clientTasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-slate-100 bg-slate-50/50 p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${task.completed ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <h4 className={`font-semibold text-xs text-slate-800 ${task.completed ? "line-through text-slate-400" : ""}`}>
                            {task.title}
                          </h4>
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-[var(--muted)] mt-1 ml-4 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Excluir Tarefa */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(activeTaskIdForManagement, task.id)}
                        className="text-rose-600 hover:text-rose-700 text-[10px] font-bold uppercase transition flex-shrink-0"
                        aria-label="Excluir tarefa"
                      >
                        Excluir
                      </button>
                    </div>

                    {/* Evidência se houver */}
                    {task.evidenceUrl && (
                      <div className="ml-4 border-t border-slate-100 pt-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCrmEvidenceLightbox({ src: task.evidenceUrl, title: task.title })}
                            className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex-shrink-0 hover:opacity-85 transition"
                          >
                            {task.evidenceUrl.startsWith("data:video") ? (
                              <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white text-[8px] font-bold">
                                🎥 Vídeo
                              </div>
                            ) : (
                              <Image
                                src={task.evidenceUrl}
                                alt="Evidência do Tutor"
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            )}
                          </button>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700">Evidência enviada pelo tutor</p>
                            <p className="text-[9px] text-[var(--muted)]">Clique na miniatura para expandir</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form para Nova Tarefa */}
            <div className="border-t border-slate-100 pt-3.5 flex-shrink-0 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Nova Tarefa</span>
              <div className="grid gap-2">
                <input
                  type="text"
                  placeholder="Título da tarefa (ex: Treinar o senta antes de comer)"
                  value={newPortalTaskTitle}
                  onChange={(e) => setNewPortalTaskTitle(e.target.value)}
                  className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400 w-full"
                />
                <textarea
                  placeholder="Instruções adicionais para o tutor (opcional)"
                  value={newPortalTaskDesc}
                  onChange={(e) => setNewPortalTaskDesc(e.target.value)}
                  rows={2}
                  className="min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs outline-none focus:border-sky-400 w-full resize-none"
                />
                <button
                  type="button"
                  disabled={isCreatingTask || !newPortalTaskTitle.trim()}
                  onClick={() => handleCreateTask(activeTaskIdForManagement)}
                  className="rounded-md bg-[var(--accent)] text-white py-2 text-xs font-bold transition hover:bg-[#1c719d] disabled:opacity-50"
                >
                  {isCreatingTask ? "Criando..." : "+ Cadastrar Tarefa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox de Evidência no CRM */}
      {crmEvidenceLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setCrmEvidenceLightbox(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-md bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">Evidência: {crmEvidenceLightbox.title}</p>
              <button
                type="button"
                onClick={() => setCrmEvidenceLightbox(null)}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="relative flex h-[60vh] items-center justify-center bg-black">
              {crmEvidenceLightbox.src.startsWith("data:video") ? (
                <video src={crmEvidenceLightbox.src} controls className="max-h-full max-w-full object-contain" autoPlay />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={crmEvidenceLightbox.src} alt={crmEvidenceLightbox.title} className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
