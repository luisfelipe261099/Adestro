"use client";

import { useEffect, useRef, useState } from "react";

// Assinatura do adestrador para recibo e contrato.
//
// Duas formas de preencher, porque o adestrador está tanto no computador
// quanto no celular: desenhar com o dedo/mouse, ou enviar uma foto da
// assinatura em papel. O resultado é sempre um PNG base64 guardado no cadastro.

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);
  const [modo, setModo] = useState<"desenhar" | "enviar">("desenhar");
  const [erro, setErro] = useState("");

  // O canvas é redimensionado pela densidade de tela para o traço não sair
  // serrilhado no celular.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || modo !== "desenhar") return;
    const ratio = window.devicePixelRatio || 1;
    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    canvas.width = largura * ratio;
    canvas.height = altura * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, [modo]);

  function ponto(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function iniciar(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    desenhando.current = true;
    const { x, y } = ponto(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = ponto(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    temTraco.current = true;
  }

  function encerrar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !temTraco.current) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco.current = false;
    onChange("");
  }

  function enviarArquivo(file: File) {
    setErro("");
    if (!file.type.startsWith("image/")) {
      setErro("Envie uma imagem (PNG ou JPG) da sua assinatura.");
      return;
    }
    if (file.size > 1_500_000) {
      setErro("Imagem muito grande. Use até 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-[var(--border)]">
          {(["desenhar", "enviar"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setModo(opcao)}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                modo === opcao
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {opcao === "desenhar" ? "Desenhar" : "Enviar imagem"}
            </button>
          ))}
        </div>
        {value ? (
          <button
            type="button"
            onClick={limpar}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Apagar assinatura
          </button>
        ) : null}
      </div>

      {modo === "desenhar" ? (
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={encerrar}
          onPointerLeave={encerrar}
          className="h-32 w-full touch-none rounded-md border border-dashed border-[var(--border-strong)] bg-white"
          aria-label="Área para desenhar a assinatura"
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) enviarArquivo(file);
          }}
          className="block w-full text-xs file:mr-2 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--surface-2)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--foreground)]"
        />
      )}

      {erro ? <p className="text-[12px] text-rose-600">{erro}</p> : null}

      {value ? (
        <div className="rounded-md border border-[var(--border)] bg-white p-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">Como vai sair no recibo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Assinatura cadastrada" className="h-16 object-contain" />
        </div>
      ) : (
        <p className="text-[12px] text-[var(--muted)]">
          Sem assinatura cadastrada — o recibo e o contrato saem só com o nome.
        </p>
      )}
    </div>
  );
}
