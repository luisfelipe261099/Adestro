"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

type DogData = {
  id: string;
  name: string;
  breed: string | null;
  age: string | null;
  weight: string | null;
  photoUrl: string | null;
  trainingTypes: string;
  sex?: string | null;
  castrated?: boolean;
  microchip?: string | null;
  color?: string | null;
  vaccines?: string | null;
  dietRestrictions?: string | null;
  healthConditions?: string | null;
  veterinarian?: string | null;
  temperament?: string | null;
  routine?: string | null;
  trainingGoals?: string | null;
  environmentalAnalysis?: string | null;
};

type PortalData = {
  trainer: { id: string; name: string; phone: string | null };
  client: {
    id: string;
    name: string;
    phone: string | null;
    email?: string | null;
    birthDate?: string | null;
    cpf?: string | null;
    plan: string | null;
    dogs: DogData[];
  };
  linkMeta: { expiresAt: string; status: "Ativo" };
};

export function PortalOnboardingClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  
  // PIN
  const [pin, setPin] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [unlockAttempt, setUnlockAttempt] = useState(0);

  // Form Steps
  const [formStep, setFormStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- FORM STATES ---
  // Step 1: Cliente
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");

  // Step 2: Address
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

  // Step 3: Dog Identificação
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [dogSex, setDogSex] = useState("Macho");
  const [dogCastrated, setDogCastrated] = useState(false);
  const [dogMicrochip, setDogMicrochip] = useState("");
  const [dogColor, setDogColor] = useState("");
  const [dogPhotoUrl, setDogPhotoUrl] = useState("");
  const [dogPhotoPreview, setDogPhotoPreview] = useState("");

  // Step 4: Saúde e Vacinas
  const [vaccines, setVaccines] = useState<Array<{ name: string; date: string; validity: string; alert: boolean }>>([]);
  const [newVacName, setNewVacName] = useState("");
  const [newVacDate, setNewVacDate] = useState("");
  const [newVacValidity, setNewVacValidity] = useState("");
  const [newVacAlert, setNewVacAlert] = useState(true);
  const [dietRestrictions, setDietRestrictions] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [veterinarian, setVeterinarian] = useState("");

  // Step 5: Temperamento, Rotina e Objetivos
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const pinQuery = useMemo(() => (pinRequired && /^\d{4}$/.test(pin) ? `?pin=${encodeURIComponent(pin)}` : ""), [pinRequired, pin]);

  // Load Portal Data
  useEffect(() => {
    async function loadPortal() {
      setLoading(true);
      if (!pinRequired) setError("");
      try {
        const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}${pinQuery}`, { cache: "no-store" });
        if (response.status === 401) {
          setPinRequired(true);
          setData(null);
          setLoading(false);
          return;
        }
        if (!response.ok) throw new Error("Link inválido");
        const payload = (await response.json()) as PortalData;
        setPinRequired(false);
        setData(payload);

        // Pre-populate Cliente Form
        if (payload.client) {
          setClientName(payload.client.name || "");
          setPhone(payload.client.phone || "");
          setEmail(payload.client.email || "");
          setBirthDate(payload.client.birthDate || "");
          setCpf(payload.client.cpf || "");

          const dog = payload.client.dogs[0];
          if (dog) {
            setDogName(dog.name || "");
            setBreed(dog.breed || "");
            setAge(dog.age || "");
            setWeight(dog.weight || "");
            setDogSex(dog.sex || "Macho");
            setDogCastrated(!!dog.castrated);
            setDogMicrochip(dog.microchip || "");
            setDogColor(dog.color || "");
            setDogPhotoUrl(dog.photoUrl || "");

            // Vaccines
            try {
              if (dog.vaccines) setVaccines(JSON.parse(dog.vaccines));
            } catch { /* empty */ }

            setDietRestrictions(dog.dietRestrictions || "");
            setHealthConditions(dog.healthConditions || "");
            setVeterinarian(dog.veterinarian || "");

            // Temperament
            try {
              if (dog.temperament) {
                const temp = JSON.parse(dog.temperament);
                if (temp.energy) setTempEnergy(temp.energy);
                if (temp.social) setTempSocial(temp.social);
                if (temp.dogs) setTempDogs(temp.dogs);
                if (temp.behavior) setTempBehavior(temp.behavior);
                if (temp.positive) setTempPositive(temp.positive);
              }
            } catch { /* empty */ }

            // Routine
            try {
              if (dog.routine) {
                const rot = JSON.parse(dog.routine);
                if (rot.alimentation) setRotAlimentation(rot.alimentation);
                if (rot.sleep) setRotSleep(rot.sleep);
                if (rot.walks) setRotWalks(rot.walks);
                if (rot.plays) setRotPlays(rot.plays);
              }
            } catch { /* empty */ }

            // Goals
            try {
              if (dog.trainingGoals) {
                const goals = JSON.parse(dog.trainingGoals);
                setGoalsObediencia(!!goals.obediencia);
                setGoalsComportamento(!!goals.comportamento);
                setGoalsPasseio(!!goals.passeio);
                setGoalsAvancado(!!goals.avancado);
                setGoalsReab(!!goals.reabilitacao);
              }
            } catch { /* empty */ }

            // Environmental Analysis
            try {
              if (dog.environmentalAnalysis) {
                const env = JSON.parse(dog.environmentalAnalysis);
                if (env.convive) setEnvConvive(env.convive);
                if (env.aloneTime) setEnvAloneTime(env.aloneTime);
                if (env.history) setEnvHistory(env.history);
              }
            } catch { /* empty */ }
          }
        }
      } catch {
        setError("Este link não está disponível. Peça um novo link ao seu adestrador.");
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [token, pinQuery, pinRequired, unlockAttempt]);

  // Cep lookup
  const handleLookupCEP = async () => {
    const cleanCEP = addrZipCode.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    setIsCEPLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const resData = await res.json();
      if (!resData.erro) {
        setAddrStreet(resData.logradouro || "");
        setAddrNeighborhood(resData.bairro || "");
        setAddrCity(resData.localidade || "");
        setAddrState(resData.uf || "");
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

  // Handle Form Submit
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (!dogName.trim()) {
      setSaveError("O nome do cão é obrigatório.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    const payload = {
      clientName: clientName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      birthDate: birthDate.trim(),
      cpf: cpf.trim(),
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
      breed: breed.trim(),
      age: age.trim(),
      weight: weight.trim(),
      photoUrl: dogPhotoPreview || dogPhotoUrl.trim() || undefined,
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
      const response = await fetch(`/api/portal-public/${encodeURIComponent(token)}/onboarding${pinQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar cadastro");
      }

      setIsSubmitted(true);
    } catch {
      setSaveError("Erro ao enviar onboarding. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  // --- RENDERS ---
  if (loading) {
    return (
      <PageShell kicker="Onboarding" title="Carregando formulário" description="Validando token e carregando a ficha de onboarding...">
        <p className="text-sm text-[var(--muted)]">Aguarde alguns segundos...</p>
      </PageShell>
    );
  }

  if (error || !data) {
    if (pinRequired) {
      return (
        <PageShell kicker="Onboarding" title="Este portal usa PIN" description="Digite o PIN de 4 dígitos enviado pelo adestrador para liberar o acesso.">
          <form
            className="max-w-sm space-y-3 rounded-md border border-[var(--border)] bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!/^\d{4}$/.test(pin)) {
                setError("Digite um PIN válido de 4 dígitos.");
                return;
              }
              setError("");
              setPinRequired(true);
              setUnlockAttempt((value) => value + 1);
            }}
          >
            <label className="grid gap-2 text-sm font-medium">
              PIN de acesso
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 outline-none focus:border-sky-400"
              />
            </label>
            <button type="submit" className="pc-primary-action rounded-full px-4 py-2 text-sm font-semibold">
              Desbloquear onboarding
            </button>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </form>
        </PageShell>
      );
    }

    return (
      <PageShell kicker="Onboarding" title="Link indisponível" description="Este acesso pode ter expirado ou sido revogado pelo adestrador.">
        <p className="text-sm text-[var(--muted)]">{error || "Solicite um novo link ao adestrador."}</p>
      </PageShell>
    );
  }

  if (isSubmitted) {
    return (
      <PageShell kicker="Sucesso!" title="Ficha de Onboarding Enviada" description="Muito obrigado por preencher a ficha de acompanhamento do seu cão.">
        <article className="rounded-lg border border-[var(--border)] bg-white p-6 text-center shadow-sm max-w-md mx-auto">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Enviado para Revisão</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            As informações foram salvas com sucesso como rascunho. Seu adestrador <strong>{data.trainer.name}</strong> irá revisar e aprovar as informações na próxima aula.
          </p>
          <div className="mt-6">
            <Link
              href={`/portal/cliente/${token}${pinQuery}`}
              className="inline-block rounded-full bg-[var(--accent)] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Ir para o Portal do Cliente
            </Link>
          </div>
        </article>
      </PageShell>
    );
  }

  return (
    <PageShell kicker={`Adestrador: ${data.trainer.name}`} title="Ficha de Onboarding do Cão" description="Preencha as informações detalhadas sobre a rotina, saúde e temperamento do seu pet.">
      <section className="mx-auto max-w-md rounded-lg border border-[var(--border)] bg-gradient-to-b from-[#f8fcff] to-[#f2f9ff] p-4 shadow-sm sm:max-w-xl">
        <header className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-[var(--foreground)]">Ficha do Cliente & Cão (Etapa {formStep}/5)</span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">
            {formStep === 1 ? "Dados do Cliente" :
             formStep === 2 ? "Endereço" :
             formStep === 3 ? "Identificação do Cão" :
             formStep === 4 ? "Saúde e Vacinas" :
             "Temperamento & Rotina"}
          </span>
        </header>

        {/* Progresso visual */}
        <div className="mt-3 flex h-1.5 w-full gap-1 rounded-full bg-slate-100 overflow-hidden">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`h-full flex-1 rounded-full transition-all ${
                s <= formStep ? "bg-[var(--accent)]" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          
          {/* STEP 1: TUTOR */}
          {formStep === 1 && (
            <div className="grid gap-3 animate-in fade-in duration-200">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Nome completo do Cliente
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                WhatsApp
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Data de Nascimento
                  <input
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  CPF
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: ADDRESS */}
          {formStep === 2 && (
            <div className="grid gap-3 animate-in fade-in duration-200">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                CEP
                <div className="flex gap-2">
                  <input
                    value={addrZipCode}
                    onChange={(e) => setAddrZipCode(e.target.value)}
                    placeholder="00000-000"
                    className="flex-1 min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCEP}
                    disabled={isCEPLoading}
                    className="rounded-md bg-sky-100 px-4 text-xs font-semibold text-[var(--foreground)] hover:bg-sky-200"
                  >
                    {isCEPLoading ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
              </label>

              <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Logradouro / Rua
                  <input
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    placeholder="Nome da rua"
                    required
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Número
                  <input
                    value={addrNumber}
                    onChange={(e) => setAddrNumber(e.target.value)}
                    placeholder="Nº"
                    required
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
              </div>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Complemento
                <input
                  value={addrComplement}
                  onChange={(e) => setAddrComplement(e.target.value)}
                  placeholder="Apto, bloco, etc. (opcional)"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>

              <div className="grid grid-cols-[1.2fr_1fr_0.6fr] gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Bairro
                  <input
                    value={addrNeighborhood}
                    onChange={(e) => setAddrNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Cidade
                  <input
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Cidade"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  UF
                  <input
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                    className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none text-center focus:border-[#145a82]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Identificador
                  <input
                    value={addrNickname}
                    onChange={(e) => setAddrNickname(e.target.value)}
                    placeholder="Ex: Casa, Trabalho"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white/60 text-xs text-slate-600 cursor-pointer select-none mt-5">
                  <input
                    type="checkbox"
                    checked={addrIsDefault}
                    onChange={(e) => setAddrIsDefault(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Endereço Principal
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: DOG IDENTIFICATION */}
          {formStep === 3 && (
            <div className="grid gap-3 animate-in fade-in duration-200">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Nome do Cão
                <input
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="Nome do pet"
                  required
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Raça
                <input
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="Ex: Border Collie, SRD"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Idade
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Ex: 1 ano e 3 meses"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Peso
                  <input
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Ex: 14 kg"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Sexo
                  <select
                    value={dogSex}
                    onChange={(e) => setDogSex(e.target.value)}
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </label>
                <label className="flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white/60 text-xs text-slate-600 cursor-pointer select-none mt-5">
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
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Microchip
                  <input
                    value={dogMicrochip}
                    onChange={(e) => setDogMicrochip(e.target.value)}
                    placeholder="Nº microchip"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  Cor / Marcações
                  <input
                    value={dogColor}
                    onChange={(e) => setDogColor(e.target.value)}
                    placeholder="Ex: Preto e Branco"
                    className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                  />
                </label>
              </div>
              <label className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-3 text-xs text-slate-600 cursor-pointer">
                Carregar foto do cão (opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDogPhotoFileChange}
                  className="mt-1 block w-full text-[10px] file:mr-2 file:rounded-lg file:border file:bg-white file:px-2 file:py-1 file:font-semibold"
                />
              </label>
            </div>
          )}

          {/* STEP 4: HEALTH & VACCINES */}
          {formStep === 4 && (
            <div className="grid gap-3 animate-in fade-in duration-200">
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Histórico de Vacinas</span>
                {vaccines.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">Nenhuma vacina cadastrada ainda.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {vaccines.map((v, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-white p-2 text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{v.name}</p>
                          <p className="text-[10px] text-[var(--muted)]">Aplicada em: {v.date} {v.validity && `• Validade: ${v.validity}`}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVaccine(i)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vaccine Adder */}
              <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                <span className="text-xs font-bold text-[var(--foreground)]">Adicionar Vacina</span>
                <input
                  value={newVacName}
                  onChange={(e) => setNewVacName(e.target.value)}
                  placeholder="Nome (ex: V10, Antirrábica)"
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-sky-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-[9px] font-bold text-slate-500 uppercase">
                    Aplicação
                    <input
                      placeholder="DD/MM/AAAA"
                      value={newVacDate}
                      onChange={(e) => setNewVacDate(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-[9px] font-bold text-slate-500 uppercase">
                    Validade
                    <input
                      placeholder="DD/MM/AAAA"
                      value={newVacValidity}
                      onChange={(e) => setNewVacValidity(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddVaccine}
                  className="rounded-md bg-[var(--accent)] py-2 text-xs font-semibold text-white hover:bg-[#1b719d]"
                >
                  Incluir vacina
                </button>
              </div>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Restrições alimentares
                <input
                  value={dietRestrictions}
                  onChange={(e) => setDietRestrictions(e.target.value)}
                  placeholder="Ex: Alergia a frango, grãos (opcional)"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Condições de saúde
                <input
                  value={healthConditions}
                  onChange={(e) => setHealthConditions(e.target.value)}
                  placeholder="Ex: Displasia de quadril, sopro no coração"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Veterinário de referência
                <input
                  value={veterinarian}
                  onChange={(e) => setVeterinarian(e.target.value)}
                  placeholder="Nome + Telefone do Vet"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>
            </div>
          )}

          {/* STEP 5: TEMPERAMENT & ROUTINE */}
          {formStep === 5 && (
            <div className="grid gap-3 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="grid gap-1 text-[10px] font-semibold text-slate-500 uppercase">
                  Nível de Energia
                  <select
                    value={tempEnergy}
                    onChange={(e) => setTempEnergy(e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="Alta energia">Alta</option>
                    <option value="Energia moderada">Moderada</option>
                    <option value="Baixa energia">Baixa</option>
                    <option value="Hiperativo">Hiperativo</option>
                  </select>
                </label>

                <label className="grid gap-1 text-[10px] font-semibold text-slate-500 uppercase">
                  Com Pessoas
                  <select
                    value={tempSocial}
                    onChange={(e) => setTempSocial(e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="Sociável com pessoas">Sociável</option>
                    <option value="Tímido/reservado">Tímido</option>
                    <option value="Agressivo com estranhos">Reativo</option>
                    <option value="Carente/dependente">Carente</option>
                  </select>
                </label>

                <label className="grid gap-1 text-[10px] font-semibold text-slate-500 uppercase">
                  Com Cães
                  <select
                    value={tempDogs}
                    onChange={(e) => setTempDogs(e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="Sociável com outros cães">Sociável</option>
                    <option value="Reativo a outros cães">Reativo</option>
                    <option value="Dominante">Dominante</option>
                    <option value="Submisso">Submisso</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Rotina de Alimentação
                <input
                  value={rotAlimentation}
                  onChange={(e) => setRotAlimentation(e.target.value)}
                  placeholder="Ex: Ração seca, 2x ao dia (8h e 19h)"
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Tempo sozinho por dia
                <select
                  value={envAloneTime}
                  onChange={(e) => setEnvAloneTime(e.target.value)}
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                >
                  <option value="Fica pouco sozinho (menos de 2h)">Menos de 2h</option>
                  <option value="2–4h">2h a 4h</option>
                  <option value="4–8h">4h a 8h</option>
                  <option value="Fica muito sozinho (mais de 8h)">Mais de 8h</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Onde o cão convive / Tipo de imóvel
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="min-w-0 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#145a82]"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa com quintal livre">Casa com quintal livre</option>
                  <option value="Casa com acesso restrito ao quintal">Casa sem quintal livre</option>
                  <option value="Sítio / Chácara">Sítio / Chácara</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Problemas comportamentais observados
                <textarea
                  value={tempBehavior}
                  onChange={(e) => setTempBehavior(e.target.value)}
                  placeholder="Ex: Pula nas pessoas, late muito no portão, destrói móveis..."
                  rows={2}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none focus:border-[#145a82]"
                />
              </label>

              <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Objetivos do Adestramento</span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={goalsObediencia} onChange={(e) => setGoalsObediencia(e.target.checked)} />
                    Obediência Básica
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={goalsComportamento} onChange={(e) => setGoalsComportamento(e.target.checked)} />
                    Reeducação Comportamental
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={goalsPasseio} onChange={(e) => setGoalsPasseio(e.target.checked)} />
                    Passeio Tranquilo
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={goalsAvancado} onChange={(e) => setGoalsAvancado(e.target.checked)} />
                    Comandos Avançados
                  </label>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{saveError}</p>
          )}

          {/* Form Actions */}
          <footer className="flex gap-2 border-t border-slate-100 pt-3">
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
                {isSaving ? "Enviando..." : "Enviar Ficha Completa"}
              </button>
            )}
          </footer>

        </form>
      </section>
    </PageShell>
  );
}
