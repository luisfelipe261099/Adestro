"use client";

import {
  ALONE_TIME_OPTIONS,
  BITE_HISTORY_OPTIONS,
  CHILDREN_OPTIONS,
  DOGS_OPTIONS,
  ENERGY_OPTIONS,
  HANDLING_OPTIONS,
  NOISE_OPTIONS,
  PEOPLE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  RESOURCE_GUARDING_OPTIONS,
  TRAINING_HISTORY_OPTIONS,
  UNWANTED_BEHAVIOR_OPTIONS,
} from "@/lib/invite-form";
import {
  CheckboxField,
  ChoiceField,
  MultiChoiceField,
  TextAreaField,
} from "./invite-fields";

export type BehaviorSectionValue = {
  energy: string;
  social: string;
  dogs: string;
  children: string;
  noise: string[];
  biteHistory: string;
  resourceGuarding: string;
  handling: string;
  unwantedBehaviors: string[];
  behavior: string;
  alimentation: string;
  walks: string;
  plays: string;
  sleep: string;
  aloneTime: string;
  propertyType: string;
  history: string;
  goalObediencia: boolean;
  goalComportamento: boolean;
  goalPasseio: boolean;
  goalAvancado: boolean;
  goalReabilitacao: boolean;
};

export const emptyBehaviorSection = (): BehaviorSectionValue => ({
  energy: "",
  social: "",
  dogs: "",
  children: "",
  noise: [],
  biteHistory: "",
  resourceGuarding: "",
  handling: "",
  unwantedBehaviors: [],
  behavior: "",
  alimentation: "",
  walks: "",
  plays: "",
  sleep: "",
  aloneTime: "",
  propertyType: "",
  history: "",
  goalObediencia: false,
  goalComportamento: false,
  goalPasseio: false,
  goalAvancado: false,
  goalReabilitacao: false,
});

// Monta o payload no formato que `inviteBehaviorSchema` espera. Chaves vazias
// são omitidas: gravar "" apagaria resposta anterior numa reedição.
export function toBehaviorPayload(v: BehaviorSectionValue) {
  const clean = <T extends Record<string, unknown>>(obj: T) =>
    Object.fromEntries(
      Object.entries(obj).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== "" && value !== undefined,
      ),
    );

  return {
    temperament: clean({
      energy: v.energy,
      social: v.social,
      dogs: v.dogs,
      children: v.children,
      noise: v.noise,
      biteHistory: v.biteHistory,
      resourceGuarding: v.resourceGuarding,
      handling: v.handling,
      unwantedBehaviors: v.unwantedBehaviors,
      behavior: v.behavior,
    }),
    routine: clean({
      alimentation: v.alimentation,
      walks: v.walks,
      plays: v.plays,
      sleep: v.sleep,
    }),
    environmentalAnalysis: clean({ aloneTime: v.aloneTime, history: v.history }),
    trainingGoals: {
      obediencia: v.goalObediencia,
      comportamento: v.goalComportamento,
      passeio: v.goalPasseio,
      avancado: v.goalAvancado,
      reabilitacao: v.goalReabilitacao,
    },
    ...(v.propertyType ? { propertyType: v.propertyType } : {}),
  };
}

export function SectionBehavior({
  value,
  onChange,
}: {
  value: BehaviorSectionValue;
  onChange: (v: BehaviorSectionValue) => void;
}) {
  const set = <K extends keyof BehaviorSectionValue>(key: K, v: BehaviorSectionValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <ChoiceField
        label="Nível de energia do cão"
        options={ENERGY_OPTIONS}
        value={value.energy}
        onChange={(v) => set("energy", v)}
      />
      <ChoiceField
        label="Convivência com pessoas / estranhos"
        options={PEOPLE_OPTIONS}
        value={value.social}
        onChange={(v) => set("social", v)}
      />
      <ChoiceField
        label="Convivência com outros cães"
        options={DOGS_OPTIONS}
        value={value.dogs}
        onChange={(v) => set("dogs", v)}
      />
      <ChoiceField
        label="Convivência com crianças"
        options={CHILDREN_OPTIONS}
        value={value.children}
        onChange={(v) => set("children", v)}
      />
      <MultiChoiceField
        label="Reação a barulhos fortes (fogos, trovões, obras)"
        options={NOISE_OPTIONS}
        values={value.noise}
        onChange={(v) => set("noise", v)}
      />
      <ChoiceField
        label="Possui histórico de agressividade ou mordidas?"
        options={BITE_HISTORY_OPTIONS}
        value={value.biteHistory}
        onChange={(v) => set("biteHistory", v)}
      />
      <ChoiceField
        label="Possui proteção de recursos (comida, brinquedos ou cama)?"
        options={RESOURCE_GUARDING_OPTIONS}
        value={value.resourceGuarding}
        onChange={(v) => set("resourceGuarding", v)}
      />
      <ChoiceField
        label="Aceita manipulação (patas, orelhas, escovação, banho)?"
        options={HANDLING_OPTIONS}
        value={value.handling}
        onChange={(v) => set("handling", v)}
      />
      <MultiChoiceField
        label="Comportamentos indesejados (marque todos que se aplicam)"
        options={UNWANTED_BEHAVIOR_OPTIONS}
        values={value.unwantedBehaviors}
        onChange={(v) => set("unwantedBehaviors", v)}
      />

      <TextAreaField
        label="Rotina de alimentação"
        placeholder="Ex: ração seca, 2x ao dia (8h e 19h)"
        value={value.alimentation}
        onChange={(v) => set("alimentation", v)}
      />
      <TextAreaField
        label="Rotina de passeios"
        placeholder="Ex: duas voltas no quarteirão, de manhã e à noite"
        value={value.walks}
        onChange={(v) => set("walks", v)}
      />
      <TextAreaField
        label="Rotina de brincadeiras — inclua os brinquedos favoritos"
        placeholder="Ex: bolinha no fim da tarde, mordedor de corda"
        value={value.plays}
        onChange={(v) => set("plays", v)}
      />
      <TextAreaField
        label="Rotina de sono (onde dorme: cama, caixa, casinha…)"
        placeholder="Ex: cama na sala, porta fechada à noite"
        value={value.sleep}
        onChange={(v) => set("sleep", v)}
      />

      <ChoiceField
        label="Tempo que fica sozinho por dia"
        options={ALONE_TIME_OPTIONS}
        value={value.aloneTime}
        onChange={(v) => set("aloneTime", v)}
      />
      <ChoiceField
        label="Onde o cão vive"
        options={PROPERTY_TYPE_OPTIONS}
        value={value.propertyType}
        onChange={(v) => set("propertyType", v)}
      />
      <ChoiceField
        label="Já foi adestrado antes?"
        options={TRAINING_HISTORY_OPTIONS}
        value={value.history}
        onChange={(v) => set("history", v)}
      />

      <fieldset>
        <legend className="text-sm font-medium text-[var(--muted)]">
          O que você quer alcançar com o adestramento
        </legend>
        <div className="mt-2 grid gap-2">
          <CheckboxField
            label="Obediência básica"
            checked={value.goalObediencia}
            onChange={(v) => set("goalObediencia", v)}
          />
          <CheckboxField
            label="Correção de comportamento"
            checked={value.goalComportamento}
            onChange={(v) => set("goalComportamento", v)}
          />
          <CheckboxField
            label="Passeio na guia"
            checked={value.goalPasseio}
            onChange={(v) => set("goalPasseio", v)}
          />
          <CheckboxField
            label="Comandos avançados"
            checked={value.goalAvancado}
            onChange={(v) => set("goalAvancado", v)}
          />
          <CheckboxField
            label="Reabilitação (medo, agressividade)"
            checked={value.goalReabilitacao}
            onChange={(v) => set("goalReabilitacao", v)}
          />
        </div>
      </fieldset>

      <TextAreaField
        label="Observações adicionais sobre o comportamento do cão"
        placeholder="Qualquer coisa que o adestrador precise saber antes da primeira aula"
        value={value.behavior}
        onChange={(v) => set("behavior", v)}
      />
    </div>
  );
}
