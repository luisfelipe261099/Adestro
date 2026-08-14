"use client";

import { useRef, useState } from "react";
import { TextField, maskCep, maskDocumento, maskPhone } from "./invite-fields";

export type ClientSectionValue = {
  clientName: string;
  phone: string;
  cpf: string;
  email: string;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
};

export const emptyClientSection = (): ClientSectionValue => ({
  clientName: "",
  phone: "",
  cpf: "",
  email: "",
  address: {
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  },
});

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function SectionClient({
  value,
  onChange,
}: {
  value: ClientSectionValue;
  onChange: (v: ClientSectionValue) => void;
}) {
  const [cepStatus, setCepStatus] = useState<"idle" | "buscando" | "erro">("idle");
  // Guarda o último CEP consultado para o mesmo valor não disparar duas buscas
  // quando o campo perde e recupera o foco.
  const lastLookup = useRef("");

  const set = <K extends keyof ClientSectionValue>(key: K, v: ClientSectionValue[K]) =>
    onChange({ ...value, [key]: v });
  const setAddress = (key: keyof ClientSectionValue["address"], v: string) =>
    onChange({ ...value, address: { ...value.address, [key]: v } });

  async function lookupCep(raw: string) {
    const cep = onlyDigits(raw);
    if (cep.length !== 8 || lastLookup.current === cep) return;
    lastLookup.current = cep;
    setCepStatus("buscando");
    try {
      // Pelo nosso servidor: a CSP do app não deixa o navegador falar com o
      // ViaCEP direto (ver app/api/cep/[cep]/route.ts).
      const res = await fetch(`/api/cep/${cep}`);
      if (!res.ok) {
        setCepStatus("erro");
        return;
      }
      const data = await res.json();
      setCepStatus("idle");
      // Só preenche o que veio; o número e o complemento continuam com o cliente.
      onChange({
        ...value,
        address: {
          ...value.address,
          zipCode: raw,
          street: data.street || value.address.street,
          neighborhood: data.neighborhood || value.address.neighborhood,
          city: data.city || value.address.city,
          state: data.state || value.address.state,
        },
      });
    } catch {
      // Sem internet ou serviço fora do ar: o cliente digita à mão, como antes.
      setCepStatus("erro");
    }
  }

  return (
    <div className="space-y-4">
      <TextField
        label="Nome completo"
        required
        autoComplete="name"
        placeholder="Maria Silva"
        value={value.clientName}
        onChange={(v) => set("clientName", v)}
      />
      <TextField
        label="Telefone / WhatsApp"
        required
        inputMode="tel"
        autoComplete="tel"
        placeholder="(41) 99999-8888"
        mask={maskPhone}
        value={value.phone}
        onChange={(v) => set("phone", v)}
      />
      <TextField
        label="CPF ou RG"
        placeholder="000.000.000-00"
        mask={maskDocumento}
        value={value.cpf}
        onChange={(v) => set("cpf", v)}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="maria@exemplo.com"
        value={value.email}
        onChange={(v) => set("email", v)}
      />

      <div>
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">CEP</span>
          <input
            value={value.address.zipCode}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            onChange={(event) => {
              const v = maskCep(event.target.value);
              setAddress("zipCode", v);
              if (onlyDigits(v).length === 8) void lookupCep(v);
            }}
            onBlur={(event) => void lookupCep(event.target.value)}
            className="input-field mt-2"
          />
        </label>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {cepStatus === "buscando"
            ? "Buscando endereço…"
            : cepStatus === "erro"
              ? "Não achamos esse CEP. Pode preencher o endereço à mão."
              : "Digite o CEP e o endereço se preenche sozinho."}
        </p>
      </div>

      <TextField
        label="Rua"
        autoComplete="address-line1"
        placeholder="Rua das Flores"
        value={value.address.street}
        onChange={(v) => setAddress("street", v)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Número"
          placeholder="10"
          value={value.address.number}
          onChange={(v) => setAddress("number", v)}
        />
        <TextField
          label="Complemento"
          placeholder="Apto 32"
          value={value.address.complement}
          onChange={(v) => setAddress("complement", v)}
        />
      </div>
      <div className="grid grid-cols-[1fr_1fr_5rem] gap-3">
        <TextField
          label="Bairro"
          placeholder="Centro"
          value={value.address.neighborhood}
          onChange={(v) => setAddress("neighborhood", v)}
        />
        <TextField
          label="Cidade"
          placeholder="Curitiba"
          value={value.address.city}
          onChange={(v) => setAddress("city", v)}
        />
        <TextField
          label="UF"
          placeholder="PR"
          value={value.address.state}
          onChange={(v) => setAddress("state", v.toUpperCase().slice(0, 2))}
        />
      </div>
    </div>
  );
}
