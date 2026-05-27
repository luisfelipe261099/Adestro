// Helpers para gerar deeplinks wa.me (sem custo, abre o WhatsApp do próprio adestrador).
// Não usa API paga (Twilio/WhatsApp Business). O adestrador clica e o WhatsApp abre
// já com a mensagem pronta para enviar ao tutor.

export type WaMessageVars = Record<string, string | number | undefined>;

export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return "";
  // Se já vier com DDI (55…), mantém. Se for número BR sem DDI, prefixa 55.
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

export function buildWaUrl(phone: string | undefined | null, message: string): string {
  const e164 = normalizePhone(phone);
  const text = encodeURIComponent(message.trim());
  if (!e164) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${e164}?text=${text}`;
}

// Templates de mensagem do documento (módulo 7 §8.1)
export const waTemplates = {
  agendamentoCriado: (vars: { tutor: string; cao: string; data: string; hora: string; link?: string }) =>
    `Olá ${vars.tutor}! O treino do(a) ${vars.cao} foi agendado para ${vars.data} às ${vars.hora}.` +
    (vars.link ? `\n\nConfirme a presença aqui: ${vars.link}` : ""),

  lembreteTreino: (vars: { cao: string; hora: string; adestrador: string }) =>
    `Lembrete: treino do(a) ${vars.cao} amanhã às ${vars.hora} com ${vars.adestrador}. Até lá! 🐾`,

  confirmacaoSolicitada: (vars: { cao: string; data: string; link: string }) =>
    `Por favor, confirme a presença do(a) ${vars.cao} no treino de ${vars.data}:\n${vars.link}`,

  treinoRealizado: (vars: { cao: string; link: string }) =>
    `Ótimo treino hoje com o(a) ${vars.cao}! 🎉 Veja o resumo e as fotos: ${vars.link}`,

  tarefaDiaria: (vars: { cao: string; link: string }) =>
    `${vars.cao} tem tarefas para hoje! 🐶 Confira no portal: ${vars.link}`,

  cobrancaPendente: (vars: { tutor: string; valor: string; data: string; pix?: string }) =>
    `Olá ${vars.tutor}! Sua próxima cobrança de R$ ${vars.valor} vence em ${vars.data}.` +
    (vars.pix ? `\n\nChave Pix: ${vars.pix}` : ""),

  cobrancaAtrasada: (vars: { tutor: string; valor: string; diasAtraso: number }) =>
    `Olá ${vars.tutor}! A cobrança de R$ ${vars.valor} venceu há ${vars.diasAtraso} dia(s). Pode dar uma olhada? 🙏`,

  relatorioMensal: (vars: { cao: string; mes: string; link: string }) =>
    `O relatório de evolução do(a) ${vars.cao} referente a ${vars.mes} já está disponível: ${vars.link}`,

  reciboPagamento: (vars: { tutor: string; valor: string; servico: string; link?: string }) =>
    `Olá ${vars.tutor}, segue o recibo do pagamento de R$ ${vars.valor} referente a ${vars.servico}.` +
    (vars.link ? `\n\n${vars.link}` : ""),

  portalDoCao: (vars: { cao: string; link: string }) =>
    `Pronto, ${vars.cao} tem um portal exclusivo no Adestro! 🐾\n\nAcesse para ver tarefas, evolução e o último treino:\n${vars.link}`,
};
