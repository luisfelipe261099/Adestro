import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { checkLimit } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { requireRateLimit } from "@/lib/rate-limit";

// CSV simples: name,phone,email,dogName,dogBreed,notes
// Aceita até 200 linhas por chamada.

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length && rows.length < 200; i++) {
    const cells = lines[i].split(",");
    const row: Record<string, string> = {};
    header.forEach((key, idx) => {
      row[key] = (cells[idx] ?? "").trim();
    });
    if (row.name) rows.push(row);
  }
  return rows;
}

export async function POST(request: Request) {
  const limited = requireRateLimit(request, {
    suffix: "csv-import",
    config: { capacity: 5, refillIntervalMs: 60_000 },
  });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({ where: { userId: session.user.id } });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = (await request.json()) as { csv?: string };
  if (!body.csv) return NextResponse.json({ error: "csv vazio" }, { status: 400 });

  const rows = parseCsv(body.csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nenhuma linha valida no CSV. Cabecalho esperado: name,phone,email,dogName,dogBreed,notes" }, { status: 400 });
  }

  const currentClientCount = await prisma.clientProfile.count({ where: { trainerId: trainer.id } });
  const created: string[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const limitCheck = checkLimit({
      plan: trainer.plan,
      resource: "client",
      currentCount: currentClientCount + created.length,
    });
    if (!limitCheck.ok) {
      skipped.push({ row: i + 2, reason: `Limite do plano atingido (${limitCheck.limit}). Faça upgrade.` });
      break;
    }

    try {
      const client = await prisma.clientProfile.create({
        data: {
          trainerId: trainer.id,
          name: row.name?.slice(0, 120) || "Cliente sem nome",
          phone: row.phone?.slice(0, 20) || "",
          email: row.email?.slice(0, 120) || "",
          privateNotes: row.notes?.slice(0, 500) || "",
          dogs: row.dogname
            ? {
                create: {
                  name: row.dogname.slice(0, 80),
                  breed: row.dogbreed?.slice(0, 80) || "",
                  trainingTypes: JSON.stringify([]),
                },
              }
            : undefined,
        },
      });
      created.push(client.id);
    } catch (error) {
      skipped.push({ row: i + 2, reason: error instanceof Error ? error.message : "Erro ao salvar" });
    }
  }

  await audit({
    trainerId: trainer.id,
    action: "csv.imported",
    detail: { rowsParsed: rows.length, created: created.length, skipped: skipped.length },
    actorEmail: session.user.email ?? null,
    request,
  });

  return NextResponse.json({ created: created.length, skipped, total: rows.length });
}
