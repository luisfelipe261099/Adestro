"use client";

// Gera o recibo como arquivo PDF de verdade (pdf-lib, 100% client-side).
// Usado no envio ao cliente: em vez de mandar só um link de texto no WhatsApp,
// o adestrador compartilha/anexa o PDF.

import { PDFDocument, PDFFont, PDFImage, StandardFonts, rgb } from "pdf-lib";

export type ReceiptPdfData = {
  number: number;
  clientName: string;
  dogName: string;
  service: string;
  /** Valor já formatado em BRL, ex: "350,00" */
  amount: string;
  method: string;
  dateLabel: string;
  businessName?: string;
  businessDocument?: string;
  trainerName?: string;
  /** data URLs (base64) — png ou jpeg */
  logoUrl?: string;
  signatureUrl?: string;
};

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.42, 0.47, 0.55);
const ACCENT = rgb(0.08, 0.35, 0.51); // #145a82 do recibo em tela

async function embedDataUrlImage(pdf: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (!match) return null;
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    return /png/i.test(match[1]) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null; // formato não suportado (ex.: webp) — recibo sai sem a imagem
  }
}

// Helvetica usa WinAnsi: remove caracteres fora da tabela para não estourar o encode.
function sanitize(text: string): string {
  return text.replace(/[^ -ÿ]/g, "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  let y = PAGE_HEIGHT - MARGIN;

  // Logo (opcional) no topo, centralizado
  if (data.logoUrl) {
    const logo = await embedDataUrlImage(pdf, data.logoUrl);
    if (logo) {
      const maxH = 56;
      const scale = Math.min(maxH / logo.height, 160 / logo.width, 1);
      const w = logo.width * scale;
      const h = logo.height * scale;
      page.drawImage(logo, { x: (PAGE_WIDTH - w) / 2, y: y - h, width: w, height: h });
      y -= h + 16;
    }
  }

  // Cabeçalho
  const title = "RECIBO DE PAGAMENTO";
  page.drawText(title, {
    x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 18)) / 2,
    y: y - 18,
    size: 18,
    font: bold,
    color: ACCENT,
  });
  y -= 18 + 8;

  const subtitle = sanitize(`Recibo Nº ${String(data.number).padStart(4, "0")}`);
  page.drawText(subtitle, {
    x: (PAGE_WIDTH - font.widthOfTextAtSize(subtitle, 11)) / 2,
    y: y - 11,
    size: 11,
    font,
    color: MUTED,
  });
  y -= 11 + 6;

  if (data.businessName) {
    const line = sanitize(
      data.businessDocument ? `${data.businessName} · ${data.businessDocument}` : data.businessName,
    );
    page.drawText(line, {
      x: (PAGE_WIDTH - font.widthOfTextAtSize(line, 10)) / 2,
      y: y - 10,
      size: 10,
      font,
      color: MUTED,
    });
    y -= 10 + 6;
  }

  // Linha divisória
  y -= 12;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.91),
  });
  y -= 28;

  // Corpo
  const paragraphs = [
    `Recebemos de ${data.clientName}, tutor(a) do cão ${data.dogName}.`,
    `A importância de R$ ${data.amount} referente à prestação de serviços de adestramento comportamental canino: ${data.service}.`,
    `Pagamento quitado via ${data.method} em ${data.dateLabel}.`,
  ];
  for (const paragraph of paragraphs) {
    for (const line of wrapText(paragraph, font, 12, contentWidth)) {
      page.drawText(line, { x: MARGIN, y: y - 12, size: 12, font, color: INK, lineHeight: 16 });
      y -= 18;
    }
    y -= 10;
  }

  // Assinatura
  y -= 48;
  const centerX = PAGE_WIDTH / 2;
  if (data.signatureUrl) {
    const signature = await embedDataUrlImage(pdf, data.signatureUrl);
    if (signature) {
      const maxH = 52;
      const scale = Math.min(maxH / signature.height, 200 / signature.width, 1);
      const w = signature.width * scale;
      const h = signature.height * scale;
      page.drawImage(signature, { x: centerX - w / 2, y: y, width: w, height: h });
    }
  }
  y -= 8;
  page.drawLine({
    start: { x: centerX - 90, y },
    end: { x: centerX + 90, y },
    thickness: 1,
    color: rgb(0.7, 0.74, 0.79),
  });
  y -= 16;

  const signerName = sanitize(data.trainerName || data.businessName || "Adestrador");
  page.drawText(signerName, {
    x: centerX - bold.widthOfTextAtSize(signerName, 11) / 2,
    y,
    size: 11,
    font: bold,
    color: INK,
  });
  y -= 14;
  const signerRole = "Adestrador(a) responsável";
  page.drawText(signerRole, {
    x: centerX - font.widthOfTextAtSize(signerRole, 9) / 2,
    y,
    size: 9,
    font,
    color: MUTED,
  });

  return pdf.save();
}

export function receiptPdfFileName(number: number, clientName: string): string {
  const slug = clientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `recibo-${String(number).padStart(4, "0")}${slug ? `-${slug}` : ""}.pdf`;
}
