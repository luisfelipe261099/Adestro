// Gera "Pix Copia e Cola" (BR Code estático) no formato EMV/MPM.
// Especificação: Manual do Banco Central — Arranjo Pix.
// Sem gateway pago: usa a chave Pix do próprio adestrador.

type PixInput = {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number; // BRL
  txid?: string;   // até 25 chars alfanuméricos
  description?: string;
};

function format(id: string, value: string): string {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

function sanitizeAscii(input: string, max: number): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, max)
    .trim();
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(input: PixInput): string {
  const merchantAccountInfo = [
    format("00", "BR.GOV.BCB.PIX"),
    format("01", input.pixKey.trim()),
    input.description ? format("02", sanitizeAscii(input.description, 50)) : "",
  ]
    .filter(Boolean)
    .join("");

  const txid = sanitizeAscii(input.txid || "***", 25) || "***";
  const additionalDataField = format("05", txid);

  const amount =
    typeof input.amount === "number" && input.amount > 0
      ? format("54", input.amount.toFixed(2))
      : "";

  const payloadWithoutCrc =
    format("00", "01") + // Payload Format Indicator
    format("01", "11") + // Point of Initiation Method (estático)
    format("26", merchantAccountInfo) +
    format("52", "0000") + // Merchant Category Code
    format("53", "986") + // Currency BRL
    amount +
    format("58", "BR") + // Country
    format("59", sanitizeAscii(input.merchantName, 25)) +
    format("60", sanitizeAscii(input.merchantCity, 15)) +
    format("62", additionalDataField) +
    "6304";

  const crc = crc16(payloadWithoutCrc);
  return payloadWithoutCrc + crc;
}

export function isPixKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Aceita CPF, CNPJ, email, telefone E.164 ou chave aleatória (UUID-like).
  if (/^\d{11}$/.test(trimmed)) return true;
  if (/^\d{14}$/.test(trimmed)) return true;
  if (/^\+?\d{10,15}$/.test(trimmed)) return true;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return true;
  if (/^[a-f0-9-]{32,40}$/i.test(trimmed)) return true;
  return false;
}
