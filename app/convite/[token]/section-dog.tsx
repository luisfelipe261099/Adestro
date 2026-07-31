"use client";

import { PREVENTIVE_CARE_OPTIONS, SEX_OPTIONS } from "@/lib/invite-form";
import {
  CheckboxField,
  ChoiceField,
  PhotoField,
  TextAreaField,
  TextField,
} from "./invite-fields";

export type Vaccine = { name: string; date: string; validity: string };

export type DogSectionValue = {
  dogName: string;
  photoUrl: string;
  breed: string;
  birthDate: string;
  age: string;
  sex: string;
  castrated: boolean;
  weight: string;
  microchip: string;
  color: string;
  preventiveCare: string;
  vaccines: Vaccine[];
  dietRestrictions: string;
  healthConditions: string;
  veterinarian: string;
};

export const emptyDogSection = (): DogSectionValue => ({
  dogName: "",
  photoUrl: "",
  breed: "",
  birthDate: "",
  age: "",
  sex: "",
  castrated: false,
  weight: "",
  microchip: "",
  color: "",
  preventiveCare: "",
  vaccines: [],
  dietRestrictions: "",
  healthConditions: "",
  veterinarian: "",
});

export function SectionDog({
  value,
  onChange,
  onError,
}: {
  value: DogSectionValue;
  onChange: (v: DogSectionValue) => void;
  onError: (message: string) => void;
}) {
  const set = <K extends keyof DogSectionValue>(key: K, v: DogSectionValue[K]) =>
    onChange({ ...value, [key]: v });

  const setVaccine = (index: number, key: keyof Vaccine, v: string) =>
    onChange({
      ...value,
      vaccines: value.vaccines.map((item, i) => (i === index ? { ...item, [key]: v } : item)),
    });

  return (
    <div className="space-y-4">
      <TextField
        label="Nome do cão"
        required
        placeholder="Bolt"
        value={value.dogName}
        onChange={(v) => set("dogName", v)}
      />
      <PhotoField value={value.photoUrl} onChange={(v) => set("photoUrl", v)} onError={onError} />
      <TextField
        label="Raça / SRD (vira-lata)"
        placeholder="Border Collie"
        value={value.breed}
        onChange={(v) => set("breed", v)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Data de nascimento"
          type="date"
          value={value.birthDate}
          onChange={(v) => set("birthDate", v)}
        />
        <TextField
          label="Ou idade aproximada"
          placeholder="1 ano e 3 meses"
          value={value.age}
          onChange={(v) => set("age", v)}
        />
      </div>

      <ChoiceField
        label="Sexo"
        options={SEX_OPTIONS}
        value={value.sex}
        onChange={(v) => set("sex", v)}
      />
      <CheckboxField
        label="Castrado(a)"
        checked={value.castrated}
        onChange={(v) => set("castrated", v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Porte / peso"
          placeholder="18 kg"
          value={value.weight}
          onChange={(v) => set("weight", v)}
        />
        <TextField
          label="Cor"
          placeholder="Preto e branco"
          value={value.color}
          onChange={(v) => set("color", v)}
        />
      </div>
      <TextField
        label="Microchip"
        placeholder="Nº do microchip"
        value={value.microchip}
        onChange={(v) => set("microchip", v)}
      />

      <ChoiceField
        label="Vacinação e antipulgas"
        options={PREVENTIVE_CARE_OPTIONS}
        value={value.preventiveCare}
        onChange={(v) => set("preventiveCare", v)}
      />

      <div>
        <span className="text-sm font-medium text-[var(--muted)]">
          Vacinas (opcional — nome, data e validade)
        </span>
        <div className="mt-2 space-y-2">
          {value.vaccines.map((vaccine, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
              <div className="grid gap-2">
                <input
                  value={vaccine.name}
                  placeholder="Nome (ex: V10, Antirrábica)"
                  onChange={(e) => setVaccine(index, "name", e.target.value)}
                  className="input-field"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={vaccine.date}
                    type="date"
                    onChange={(e) => setVaccine(index, "date", e.target.value)}
                    className="input-field"
                  />
                  <input
                    value={vaccine.validity}
                    type="date"
                    onChange={(e) => setVaccine(index, "validity", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-[var(--danger)]"
                onClick={() =>
                  onChange({ ...value, vaccines: value.vaccines.filter((_, i) => i !== index) })
                }
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-[var(--muted)] underline"
            onClick={() =>
              onChange({
                ...value,
                vaccines: [...value.vaccines, { name: "", date: "", validity: "" }],
              })
            }
          >
            + Adicionar vacina
          </button>
        </div>
      </div>

      <TextAreaField
        label="Alergias ou restrições alimentares"
        placeholder="Ex: alergia a frango"
        value={value.dietRestrictions}
        onChange={(v) => set("dietRestrictions", v)}
      />
      <TextAreaField
        label="Problemas de saúde ou medicamentos em uso"
        placeholder="Ex: displasia de quadril, uso de anti-inflamatório"
        value={value.healthConditions}
        onChange={(v) => set("healthConditions", v)}
      />
      <TextField
        label="Veterinário (nome e telefone)"
        placeholder="Dra. Ana — (41) 97777-6666"
        value={value.veterinarian}
        onChange={(v) => set("veterinarian", v)}
      />
    </div>
  );
}
