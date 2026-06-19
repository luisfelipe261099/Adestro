// Máscaras de input para formulários (padrão Brasil). Funções puras: recebem o
// texto digitado e devolvem o valor formatado. Use direto no onChange:
//   onChange={(e) => setCpf(maskCPF(e.target.value))}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Telefone/WhatsApp: (00) 0000-0000 (fixo) ou (00) 00000-0000 (celular) */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

/** Data: DD/MM/AAAA */
export function maskDate(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

/** CEP: 00000-000 */
export function maskCEP(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}
