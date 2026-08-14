// O contrato do formulário de convite: o que pode ser respondido e como isso é
// validado. Opções e schemas moram juntos porque são a mesma coisa — os schemas
// são derivados das listas de opção logo abaixo.
//
// Existe como arquivo próprio porque as opções são lidas em dois lugares que não
// se enxergam: o formulário do cliente e a tela do adestrador que mostra as
// respostas. No onboarding do portal elas estão inline no JSX, e foi assim que
// seis campos ficaram declarados, enviados e nunca renderizados sem ninguém ver.
//
// Só depende de `zod`, e de propósito: `scripts/check-client-invite.mts` roda no
// Node puro, que não resolve o alias `@/` nem import relativo sem extensão. Uma
// dependência relativa aqui deixaria a lógica sem teste, e `.ts` explícito no
// import quebra o `tsc` (TS5097).

import { z } from "zod";

export type InviteOption = { value: string; label: string };

export function optionValues(options: readonly InviteOption[]): string[] {
  return options.map((option) => option.value);
}

export function isValidOption(options: readonly InviteOption[], value: string): boolean {
  return options.some((option) => option.value === value);
}

// ── Cão ──────────────────────────────────────────────────────────────────────

export const SEX_OPTIONS: readonly InviteOption[] = [
  { value: "Macho", label: "Macho" },
  { value: "Fêmea", label: "Fêmea" },
];

export const PREVENTIVE_CARE_OPTIONS: readonly InviteOption[] = [
  { value: "Em dia", label: "Em dia" },
  { value: "Pendente / Incompleto", label: "Pendente / Incompleto" },
];

// ── Temperamento ─────────────────────────────────────────────────────────────

// Rótulos do formulário; valores preservados do onboarding.
export const ENERGY_OPTIONS: readonly InviteOption[] = [
  { value: "Baixa energia", label: "Baixo" },
  { value: "Energia moderada", label: "Médio" },
  { value: "Alta energia", label: "Alto" },
  { value: "Hiperativo", label: "Muito Alto" },
];

export const PEOPLE_OPTIONS: readonly InviteOption[] = [
  { value: "Sociável com pessoas", label: "Dócil / Amigável" },
  { value: "Desconfiado com estranhos", label: "Desconfiado" },
  { value: "Agressivo com estranhos", label: "Reativo" },
  { value: "Muito amedrontado com estranhos", label: "Muito Amedrontado" },
];

export const DOGS_OPTIONS: readonly InviteOption[] = [
  { value: "Amigável com outros cães", label: "Amigável" },
  { value: "Neutro com outros cães", label: "Neutro" },
  { value: "Reativo a outros cães", label: "Reativo / Agressivo" },
  { value: "Medroso com outros cães", label: "Medroso" },
];

export const CHILDREN_OPTIONS: readonly InviteOption[] = [
  { value: "Excelente com crianças", label: "Excelente" },
  { value: "Tolerante com crianças", label: "Tolerante" },
  { value: "Não acostumado com crianças", label: "Não acostumado" },
  { value: "Reativo com crianças", label: "Reativo" },
];

export const NOISE_OPTIONS: readonly InviteOption[] = [
  { value: "Tranquilo com barulhos", label: "Tranquilo / Normal" },
  { value: "Fica ansioso com barulhos", label: "Fica ansioso" },
  { value: "Se esconde com barulhos", label: "Procura se esconder" },
  { value: "Entra em pânico com barulhos", label: "Tenta fugir / Pânico" },
];

export const BITE_HISTORY_OPTIONS: readonly InviteOption[] = [
  { value: "Sem histórico de mordida", label: "Não" },
  { value: "Tem histórico de mordida", label: "Sim (descreva nas observações)" },
];

export const RESOURCE_GUARDING_OPTIONS: readonly InviteOption[] = [
  { value: "Protege recursos", label: "Sim" },
  { value: "Não protege recursos", label: "Não" },
];

export const HANDLING_OPTIONS: readonly InviteOption[] = [
  { value: "Aceita manipulação", label: "Aceita bem" },
  { value: "Aceita manipulação com restrições", label: "Com restrições" },
  { value: "Não aceita manipulação", label: "Não aceita" },
];

export const UNWANTED_BEHAVIOR_OPTIONS: readonly InviteOption[] = [
  { value: "Latidos em excesso", label: "Latidos em excesso" },
  { value: "Destruição de objetos/móveis", label: "Destruição de objetos/móveis" },
  { value: "Ansiedade de separação", label: "Ansiedade de separação" },
  { value: "Necessidades fora do lugar", label: "Necessidades fora do lugar" },
  { value: "Puxa muito a guia", label: "Puxa muito a guia" },
  { value: "Outros", label: "Outros" },
];

// ── Ambiente e histórico ─────────────────────────────────────────────────────

export const ALONE_TIME_OPTIONS: readonly InviteOption[] = [
  { value: "Fica pouco sozinho (menos de 2h)", label: "Menos de 2h" },
  { value: "2–4h", label: "2h a 4h" },
  { value: "4–8h", label: "4h a 8h" },
  { value: "Fica muito sozinho (mais de 8h)", label: "Mais de 8h" },
];

export const PROPERTY_TYPE_OPTIONS: readonly InviteOption[] = [
  { value: "Apartamento", label: "Apartamento" },
  { value: "Casa com quintal livre", label: "Casa com quintal livre" },
  { value: "Casa com acesso restrito ao quintal", label: "Casa sem quintal livre" },
  { value: "Sítio / Chácara", label: "Sítio / Chácara" },
];

// "Nunca foi adestrado" era o valor que o onboarding gravava em TODO cão sem
// nunca perguntar. Vira opção de verdade, escolhida pelo cliente.
export const TRAINING_HISTORY_OPTIONS: readonly InviteOption[] = [
  { value: "Nunca foi adestrado", label: "Nunca foi adestrado" },
  { value: "Já fez adestramento básico", label: "Já fez adestramento básico" },
  { value: "Já fez adestramento avançado", label: "Já fez adestramento avançado" },
  { value: "Está em adestramento com outro profissional", label: "Está com outro profissional" },
];

// ─── Validação, por seção do formulário ──────────────────────────────────────

// Base64 de uma foto já reduzida no navegador. O limite existe porque a rota é
// pública e o banco guarda a string inteira num LongText.
export const INVITE_PHOTO_MAX_BYTES = 2_000_000;

const oneOf = (options: readonly InviteOption[]) =>
  z.enum(optionValues(options) as [string, ...string[]]).optional();

const manyOf = (options: readonly InviteOption[]) =>
  z.array(z.enum(optionValues(options) as [string, ...string[]])).optional();

const optionalText = (max: number) => z.string().trim().max(max).optional();

// ── Seção 1: dados do cliente ────────────────────────────────────────────────
export const inviteClientSchema = z.object({
  clientName: z.string().trim().min(1, "Informe seu nome").max(120),
  // Obrigatório: é por ele que o adestrador retoma quem abandona o formulário
  // no meio, que é o motivo de o cadastro ser salvo já nesta seção.
  phone: z.string().trim().min(8, "Informe seu WhatsApp").max(20),
  cpf: optionalText(20),
  email: z
    .string()
    .email("E-mail inválido")
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: z
    .object({
      zipCode: optionalText(12),
      street: optionalText(120),
      number: optionalText(12),
      complement: optionalText(60),
      neighborhood: optionalText(80),
      city: optionalText(80),
      state: optionalText(2),
    })
    .optional(),
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(20),
});

// ── Seção 2: dados do cão ────────────────────────────────────────────────────
export const inviteDogSchema = z.object({
  dogName: z.string().trim().min(1, "Informe o nome do cão").max(80),
  breed: optionalText(80),
  birthDate: optionalText(10),
  age: optionalText(40),
  sex: oneOf(SEX_OPTIONS),
  castrated: z.boolean().optional(),
  weight: optionalText(40),
  microchip: optionalText(60),
  color: optionalText(60),
  preventiveCare: oneOf(PREVENTIVE_CARE_OPTIONS),
  vaccines: z
    .array(
      z.object({
        name: z.string().trim().max(80),
        date: optionalText(10),
        validity: optionalText(10),
        alert: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
  dietRestrictions: optionalText(500),
  healthConditions: optionalText(500),
  veterinarian: optionalText(200),
  photoUrl: z
    .string()
    .max(INVITE_PHOTO_MAX_BYTES, "A foto é grande demais. Tente uma imagem menor.")
    .optional(),
});

// ── Seção 3: comportamento e rotina ──────────────────────────────────────────
// Nada aqui é obrigatório: é a seção mais longa, e barrar o envio por causa dela
// perderia o cadastro inteiro de quem já respondeu as duas primeiras.
export const inviteBehaviorSchema = z.object({
  temperament: z
    .object({
      energy: oneOf(ENERGY_OPTIONS),
      social: oneOf(PEOPLE_OPTIONS),
      dogs: oneOf(DOGS_OPTIONS),
      children: oneOf(CHILDREN_OPTIONS),
      noise: manyOf(NOISE_OPTIONS),
      biteHistory: oneOf(BITE_HISTORY_OPTIONS),
      resourceGuarding: oneOf(RESOURCE_GUARDING_OPTIONS),
      handling: oneOf(HANDLING_OPTIONS),
      unwantedBehaviors: manyOf(UNWANTED_BEHAVIOR_OPTIONS),
      behavior: optionalText(1000),
      positive: optionalText(1000),
    })
    .optional(),
  routine: z
    .object({
      alimentation: optionalText(500),
      walks: optionalText(500),
      plays: optionalText(500),
      sleep: optionalText(500),
    })
    .optional(),
  environmentalAnalysis: z
    .object({
      aloneTime: oneOf(ALONE_TIME_OPTIONS),
      convive: optionalText(300),
      history: oneOf(TRAINING_HISTORY_OPTIONS),
    })
    .optional(),
  trainingGoals: z
    .object({
      obediencia: z.boolean().optional(),
      comportamento: z.boolean().optional(),
      passeio: z.boolean().optional(),
      avancado: z.boolean().optional(),
      reabilitacao: z.boolean().optional(),
    })
    .optional(),
  propertyType: oneOf(PROPERTY_TYPE_OPTIONS),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
export type InviteDogInput = z.infer<typeof inviteDogSchema>;
export type InviteBehaviorInput = z.infer<typeof inviteBehaviorSchema>;
