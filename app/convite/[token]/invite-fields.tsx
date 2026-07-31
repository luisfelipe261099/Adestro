"use client";

import { useId, useRef } from "react";
import type { InviteOption } from "@/lib/invite-form";

// Campos compartilhados pelas três seções do convite. Existem como arquivo
// próprio para as seções ficarem legíveis: são ~40 perguntas, e repetir a
// marcação de cada input dentro delas produziria o mesmo arquivo de mil linhas
// que hoje esconde seis campos mortos no onboarding do portal.

export function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: "tel" | "email" | "text" | "numeric";
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      <input
        value={value}
        type={type}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="input-field mt-2"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
      <textarea
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="input-field mt-2"
      />
    </label>
  );
}

// Rádio, e não <select>: é como o formulário original mostrava, e no celular
// poupa um toque por pergunta — com ~15 perguntas fechadas, isso conta.
export function ChoiceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly InviteOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="block">
      <legend className="text-sm font-medium text-[var(--muted)]">{label}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MultiChoiceField({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: readonly InviteOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="block">
      <legend className="text-sm font-medium text-[var(--muted)]">{label}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...values, option.value]
                    : values.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// Reduz antes de enviar: a rota é pública e o banco guarda a string base64
// inteira num LongText. Sem isso, foto de celular passa fácil de 5 MB.
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_MAX_BYTES = 2_000_000;

export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Esse arquivo não parece ser uma imagem."));
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (dataUrl.length > PHOTO_MAX_BYTES) {
          reject(new Error("A foto é grande demais. Tente uma imagem menor."));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoField({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (v: string) => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="block">
      <span className="text-sm font-medium text-[var(--muted)]">Foto do cão</span>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Prévia da foto do cão"
          className="mt-2 h-24 w-24 rounded-md object-cover"
        />
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="mt-2 w-full text-xs"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            onChange(await shrinkImage(file));
          } catch (error) {
            onError(error instanceof Error ? error.message : "Não foi possível usar essa foto.");
            if (ref.current) ref.current.value = "";
          }
        }}
      />
    </div>
  );
}
