// Opções de toda pergunta fechada do formulário de convite.
//
// Existe como arquivo próprio porque as opções são lidas em dois lugares que não
// se enxergam: o formulário do tutor e a tela do adestrador que mostra as
// respostas. No onboarding do portal elas estão inline no JSX, e foi assim que
// seis campos ficaram declarados, enviados e nunca renderizados sem ninguém ver.
//
// `value` é o que vai para o banco. `label` é o que o tutor lê.
// Os dois diferem quando há valor legado a preservar: cães cadastrados antes
// deste formulário já têm o valor antigo gravado, e a tela do adestrador
// renderiza a string crua, sem tabela de/para.

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
// nunca perguntar. Vira opção de verdade, escolhida pelo tutor.
export const TRAINING_HISTORY_OPTIONS: readonly InviteOption[] = [
  { value: "Nunca foi adestrado", label: "Nunca foi adestrado" },
  { value: "Já fez adestramento básico", label: "Já fez adestramento básico" },
  { value: "Já fez adestramento avançado", label: "Já fez adestramento avançado" },
  { value: "Está em adestramento com outro profissional", label: "Está com outro profissional" },
];
