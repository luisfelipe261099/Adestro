"use client";

import { TextField } from "./invite-fields";

export type ClientSectionValue = {
  clientName: string;
  phone: string;
  cpf: string;
  email: string;
  emergencyName: string;
  emergencyPhone: string;
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
  emergencyName: "",
  emergencyPhone: "",
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

export function SectionClient({
  value,
  onChange,
}: {
  value: ClientSectionValue;
  onChange: (v: ClientSectionValue) => void;
}) {
  const set = <K extends keyof ClientSectionValue>(key: K, v: ClientSectionValue[K]) =>
    onChange({ ...value, [key]: v });
  const setAddress = (key: keyof ClientSectionValue["address"], v: string) =>
    onChange({ ...value, address: { ...value.address, [key]: v } });

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
        label="CPF ou RG"
        placeholder="000.000.000-00"
        value={value.cpf}
        onChange={(v) => set("cpf", v)}
      />
      <TextField
        label="Telefone / WhatsApp"
        required
        inputMode="tel"
        autoComplete="tel"
        placeholder="(41) 99999-8888"
        value={value.phone}
        onChange={(v) => set("phone", v)}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="maria@exemplo.com"
        value={value.email}
        onChange={(v) => set("email", v)}
      />

      <p className="pt-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        Endereço residencial
      </p>
      <TextField
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        value={value.address.zipCode}
        onChange={(v) => setAddress("zipCode", v)}
      />
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
      <TextField
        label="Bairro"
        placeholder="Centro"
        value={value.address.neighborhood}
        onChange={(v) => setAddress("neighborhood", v)}
      />
      <div className="grid grid-cols-[1fr_5rem] gap-3">
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

      <p className="pt-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        Contato de emergência
      </p>
      <TextField
        label="Nome"
        placeholder="João Silva"
        value={value.emergencyName}
        onChange={(v) => set("emergencyName", v)}
      />
      <TextField
        label="Telefone"
        inputMode="tel"
        placeholder="(41) 98888-7777"
        value={value.emergencyPhone}
        onChange={(v) => set("emergencyPhone", v)}
      />
    </div>
  );
}
