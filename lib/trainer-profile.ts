// Completude do cadastro do adestrador.
//
// O cliente pediu que o cadastro do adestrador seja prioritário no início de
// uso: sem e-mail e WhatsApp não há como falar com ele nem repassar contato ao
// tutor; sem assinatura e logo o recibo e o contrato saem sem identificação.
// Esta é a fonte única do que falta — o aviso da home, a página de
// configurações e o recibo leem daqui, para não divergirem.

export type TrainerProfileFields = {
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  businessName?: string | null;
  businessDocument?: string | null;
  logoUrl?: string | null;
};

export type ProfileItem = {
  key: keyof TrainerProfileFields;
  label: string;
  /** Prioritário = trava o contato com o adestrador ou com o cliente dele. */
  priority: boolean;
  hint: string;
};

export const PROFILE_ITEMS: ProfileItem[] = [
  { key: "name", label: "Nome", priority: true, hint: "Aparece no recibo, no contrato e para o cliente." },
  { key: "email", label: "E-mail de contato", priority: true, hint: "Canal principal de contato com você." },
  { key: "whatsapp", label: "WhatsApp", priority: true, hint: "Usado para falar com você e para o cliente te achar." },
  { key: "signatureUrl", label: "Assinatura", priority: false, hint: "Sai impressa no recibo e no contrato." },
  { key: "photoUrl", label: "Foto", priority: false, hint: "Identifica você no portal do cliente." },
  { key: "logoUrl", label: "Logo", priority: false, hint: "Marca do seu negócio nos documentos." },
  { key: "businessName", label: "Nome do negócio", priority: false, hint: "Cabeçalho do recibo e do contrato." },
  { key: "businessDocument", label: "CPF ou CNPJ", priority: false, hint: "Exigido em recibo e contrato." },
];

function preenchido(valor?: string | null): boolean {
  return typeof valor === "string" && valor.trim().length > 0;
}

export type ProfileStatus = {
  /** Itens ainda vazios, prioritários primeiro. */
  missing: ProfileItem[];
  missingPriority: ProfileItem[];
  filledCount: number;
  totalCount: number;
  /** 0 a 100. */
  percent: number;
  complete: boolean;
};

export function getProfileStatus(trainer: TrainerProfileFields | null | undefined): ProfileStatus {
  const dados = trainer ?? {};
  const missing = PROFILE_ITEMS.filter((item) => !preenchido(dados[item.key]));
  const missingPriority = missing.filter((item) => item.priority);
  const filledCount = PROFILE_ITEMS.length - missing.length;

  return {
    missing: [...missingPriority, ...missing.filter((item) => !item.priority)],
    missingPriority,
    filledCount,
    totalCount: PROFILE_ITEMS.length,
    percent: Math.round((filledCount / PROFILE_ITEMS.length) * 100),
    complete: missing.length === 0,
  };
}

/** Só dígitos, para montar o link do WhatsApp. */
export function whatsappDigits(valor?: string | null): string {
  return (valor ?? "").replace(/\D/g, "");
}
