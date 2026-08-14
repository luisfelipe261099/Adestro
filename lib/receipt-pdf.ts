"use client";

// Recibo como arquivo PDF.
//
// Antes, "enviar recibo" mandava no WhatsApp um link para /financeiro — uma
// página do adestrador, atrás de login: o cliente clicava e via a tela de
// entrar. Agora o recibo vira um PDF de verdade, que o adestrador baixa ou
// compartilha direto no WhatsApp pelo compartilhamento nativo do celular.
//
// O jsPDF é carregado sob demanda (import dinâmico) para não pesar no primeiro
// carregamento de quem nunca emite recibo.

export type ReceiptData = {
  numero: number;
  cliente: string;
  cao: string;
  servico: string;
  valor: number;
  metodo: string;
  /** Data de emissão já formatada (dd/mm/aaaa). */
  data: string;
  adestrador: string;
  negocio?: string;
  documento?: string;
  contato?: string;
  /** PNG base64 da assinatura, quando cadastrada. */
  assinatura?: string;
  logo?: string;
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function buildReceiptPdf(dados: ReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margem = 20;
  const largura = doc.internal.pageSize.getWidth();
  let y = margem;

  // Cabeçalho: logo à esquerda quando houver, identificação à direita.
  if (dados.logo?.startsWith("data:image")) {
    try {
      doc.addImage(dados.logo, "PNG", margem, y, 22, 22, undefined, "FAST");
    } catch {
      // logo em formato que o PDF não aceita: segue sem ela
    }
  }

  const xTexto = dados.logo ? margem + 28 : margem;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(dados.negocio || dados.adestrador || "Recibo", xTexto, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  const identificacao = [dados.documento, dados.contato].filter(Boolean).join("  ·  ");
  if (identificacao) doc.text(identificacao, xTexto, y + 13);

  y += 30;
  doc.setDrawColor(210);
  doc.line(margem, y, largura - margem, y);

  // Título
  y += 12;
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RECIBO DE PAGAMENTO", largura / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110);
  doc.text(`Nº ${dados.numero}`, largura / 2, y + 6, { align: "center" });

  // Corpo
  y += 20;
  doc.setTextColor(20);
  doc.setFontSize(11);
  const corpo = [
    `Recebemos de ${dados.cliente}, responsável pelo cão ${dados.cao},`,
    `a importância de ${moeda(dados.valor)} referente à prestação de serviços de`,
    `adestramento comportamental canino: ${dados.servico}.`,
    "",
    `Pagamento quitado via ${dados.metodo} em ${dados.data}.`,
  ];
  for (const linha of corpo) {
    const quebradas = doc.splitTextToSize(linha, largura - margem * 2);
    doc.text(quebradas, margem, y);
    y += quebradas.length * 6.5;
  }

  // Valor em destaque
  y += 6;
  doc.setFillColor(244, 244, 246);
  doc.rect(margem, y, largura - margem * 2, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(moeda(dados.valor), margem + 5, y + 9.5);

  // Assinatura
  y += 40;
  if (dados.assinatura?.startsWith("data:image")) {
    try {
      doc.addImage(dados.assinatura, "PNG", largura / 2 - 25, y - 18, 50, 18, undefined, "FAST");
    } catch {
      // assinatura ilegível para o PDF: fica só a linha
    }
  }
  doc.setDrawColor(160);
  doc.line(largura / 2 - 35, y + 2, largura / 2 + 35, y + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20);
  doc.text(dados.adestrador || "Adestrador", largura / 2, y + 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Assinatura do adestrador", largura / 2, y + 13.5, { align: "center" });

  return doc.output("blob");
}

export function receiptFileName(dados: Pick<ReceiptData, "numero" | "cliente">): string {
  const nome = dados.cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `recibo-${dados.numero}-${nome || "cliente"}.pdf`;
}
