import { NextResponse } from "next/server";

import { getClientKey, rateLimit } from "@/lib/rate-limit";

// Consulta de CEP pelo servidor, e não direto do navegador.
//
// A CSP do app (next.config.ts) tem `connect-src 'self'` mais os domínios da
// Vercel; um fetch do navegador para viacep.com.br é bloqueado. Abrir a CSP
// para um terceiro por causa de um campo de formulário público seria trocar
// segurança por conveniência — o proxy resolve sem mexer nela.
//
// De quebra: o CEP do tutor não sai do navegador dele para um terceiro, e a
// resposta é cacheável porque CEP praticamente não muda.

type Params = { params: Promise<{ cep: string }> };

export async function GET(request: Request, { params }: Params) {
  const limit = rateLimit(getClientKey(request, "cep"));
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429 });
  }

  const { cep } = await params;
  const digits = (cep ?? "").replace(/\D/g, "");
  if (digits.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      // O serviço fora do ar não pode travar o formulário: o tutor digita à mão.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Não foi possível consultar o CEP." }, { status: 502 });
    }

    const data = (await res.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return NextResponse.json(
      {
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
    );
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o CEP." }, { status: 502 });
  }
}
