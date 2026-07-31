"use client";

import { FormEvent, useEffect, useState } from "react";
import { INVITE_SECTION_COUNT } from "@/lib/client-invite";
import {
  ClientSectionValue,
  SectionClient,
  emptyClientSection,
} from "./section-client";
import { DogSectionValue, SectionDog, emptyDogSection } from "./section-dog";
import {
  BehaviorSectionValue,
  SectionBehavior,
  emptyBehaviorSection,
  toBehaviorPayload,
} from "./section-behavior";

type Prefill = {
  clientName?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  address?: Record<string, string> | null;
  dog?: Record<string, unknown> | null;
} | null;

type InviteInfo = {
  trainerName: string;
  status: string;
  alreadyUsed: boolean;
  resumeStep: 1 | 2 | 3;
  prefill: Prefill;
};

const SECTION_TITLES = ["Dados do cliente", "Dados do cão", "Comportamento e rotina"];

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  // A largura fica no filho, e nao no <main>: globals.css tem
  // `#__next, main { max-width: 100% }` FORA de @layer, e no Tailwind 4 uma
  // regra sem layer vence as utilities — um max-w-* aqui seria ignorado.
  //
  // Centralização por `my-auto` no filho, e NÃO por `justify-center` no flex:
  // com justify-center, conteúdo mais alto que a tela transborda para os dois
  // lados e o topo fica inalcançável — não há como rolar até ele. Com margem
  // automática, a margem colapsa quando não há espaço e a rolagem funciona.
  return (
    <main className="flex min-h-dvh flex-col px-5 py-10">
      {/* Sem logo aqui: o header do app ja mostra a marca, e repetir dava dois
          "Adestro" empilhados na mesma dobra. */}
      <div className={`mx-auto my-auto w-full ${wide ? "max-w-xl" : "max-w-md"}`}>{children}</div>
    </main>
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strList = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

export function InviteClient({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientValue, setClientValue] = useState<ClientSectionValue>(emptyClientSection);
  const [dogValue, setDogValue] = useState<DogSectionValue>(emptyDogSection);
  const [behaviorValue, setBehaviorValue] = useState<BehaviorSectionValue>(emptyBehaviorSection);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Convite inválido.");
          return;
        }
        setInfo(data);
        setStep(data.resumeStep ?? 1);

        // Retomada: o que já foi respondido volta para a tela. O rastro está no
        // banco, e não no navegador, então retomar funciona em outro aparelho.
        const pre = data.prefill;
        if (pre) {
          setClientValue({
            ...emptyClientSection(),
            clientName: str(pre.clientName),
            phone: str(pre.phone),
            cpf: str(pre.cpf),
            email: str(pre.email),
            address: { ...emptyClientSection().address, ...(pre.address ?? {}) },
          });
          if (pre.dog) {
            const d = pre.dog as Record<string, unknown>;
            const temperament = (d.temperament ?? {}) as Record<string, unknown>;
            const routine = (d.routine ?? {}) as Record<string, unknown>;

            setDogValue({
              ...emptyDogSection(),
              dogName: str(d.dogName),
              photoUrl: str(d.photoUrl),
              breed: str(d.breed),
              birthDate: str(d.birthDate),
              age: str(d.age),
              sex: str(d.sex),
              castrated: !!d.castrated,
              weight: str(d.weight),
              preventiveCare: str(d.preventiveCare),
              dietRestrictions: str(d.dietRestrictions),
              healthConditions: str(d.healthConditions),
              veterinarian: str(d.veterinarian),
            });

            setBehaviorValue({
              ...emptyBehaviorSection(),
              energy: str(temperament.energy),
              social: str(temperament.social),
              dogs: str(temperament.dogs),
              children: str(temperament.children),
              noise: strList(temperament.noise),
              biteHistory: str(temperament.biteHistory),
              resourceGuarding: str(temperament.resourceGuarding),
              handling: str(temperament.handling),
              unwantedBehaviors: strList(temperament.unwantedBehaviors),
              behavior: str(temperament.behavior),
              alimentation: str(routine.alimentation),
              walks: str(routine.walks),
              plays: str(routine.plays),
              sleep: str(routine.sleep),
            });
          }
        }
      } catch {
        if (alive) setLoadError("Não foi possível carregar o convite. Verifique sua conexão.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  function payloadFor(section: 1 | 2 | 3) {
    if (section === 1) {
      const hasAddress = Object.values(clientValue.address).some((v) => v.trim());
      return {
        clientName: clientValue.clientName,
        phone: clientValue.phone,
        cpf: clientValue.cpf,
        email: clientValue.email,
        ...(hasAddress ? { address: clientValue.address } : {}),
      };
    }
    if (section === 2) {
      return {
        ...dogValue,
        photoUrl: dogValue.photoUrl || undefined,
        sex: dogValue.sex || undefined,
        preventiveCare: dogValue.preventiveCare || undefined,
      };
    }
    return toBehaviorPayload(behaviorValue);
  }

  async function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: step, data: payloadFor(step) }),
      });
      const data = await res.json();

      if (!res.ok) {
        // O que já foi digitado nas outras seções continua em memória: só o
        // envio falhou.
        setFormError(data.error ?? "Não foi possível salvar. Tente de novo.");
        setSaving(false);
        return;
      }

      if (step < INVITE_SECTION_COUNT) {
        setStep((data.resumeStep ?? step + 1) as 1 | 2 | 3);
        setSaving(false);
        window.scrollTo({ top: 0 });
        return;
      }

      window.location.href = data.portalUrl;
    } catch {
      setFormError("Não foi possível salvar. Verifique sua conexão e tente de novo.");
      setSaving(false);
    }
  }

  async function reenter() {
    setSaving(true);
    setFormError(null);
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.portalUrl;
      return;
    }
    setFormError(data.error ?? "Não foi possível abrir seu portal.");
    setSaving(false);
  }

  if (loadError) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Convite indisponível</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{loadError}</p>
      </Shell>
    );
  }

  if (!info) {
    return (
      <Shell>
        <p className="text-sm text-[var(--muted)]">Carregando…</p>
      </Shell>
    );
  }

  // Só quem TERMINOU vê esta tela. Quem parou no meio cai no formulário, na
  // seção onde parou.
  if (info.alreadyUsed) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Você já se cadastrou</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Abra seu portal para acompanhar os treinos com {info.trainerName}.
        </p>
        <button type="button" onClick={reenter} disabled={saving} className="btn-primary mt-5 w-full">
          {saving ? "Abrindo…" : "Abrir meu portal"}
        </button>
        {formError && <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p>}
      </Shell>
    );
  }

  const resuming = info.status === "Em preenchimento";

  return (
    <Shell wide>
      <h1 className="text-lg font-semibold">
        {resuming ? "Vamos continuar" : "Vamos começar"}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {resuming ? (
          <>Você já tinha começado o cadastro com <strong>{info.trainerName}</strong>. Continue de onde parou.</>
        ) : (
          <>
            Você foi convidado por <strong>{info.trainerName}</strong>. São algumas perguntas sobre
            você e sobre seu cão. Dá para parar e voltar depois pelo mesmo link.
          </>
        )}
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          <span>{SECTION_TITLES[step - 1]}</span>
          <span>
            Seção {step} de {INVITE_SECTION_COUNT}
          </span>
        </div>
        <div className="mt-2 h-1 w-full rounded-full bg-[var(--border)]">
          <div
            className="h-1 rounded-full bg-[var(--accent-text)] transition-all"
            style={{ width: `${(step / INVITE_SECTION_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={submitSection} className="mt-6 space-y-4">
        {step === 1 && <SectionClient value={clientValue} onChange={setClientValue} />}
        {step === 2 && (
          <SectionDog value={dogValue} onChange={setDogValue} onError={setFormError} />
        )}
        {step === 3 && <SectionBehavior value={behaviorValue} onChange={setBehaviorValue} />}

        {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary flex-1"
              disabled={saving}
              onClick={() => {
                setFormError(null);
                setStep((step - 1) as 1 | 2 | 3);
                window.scrollTo({ top: 0 });
              }}
            >
              Voltar
            </button>
          )}
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving
              ? "Salvando…"
              : step < INVITE_SECTION_COUNT
                ? "Avançar"
                : "Concluir cadastro"}
          </button>
        </div>
      </form>
    </Shell>
  );
}
