// Normaliza wrappers <main> de páginas legadas para .page (do design system v2).
// Roda manualmente: `node scripts/redesign-page-shells.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  "app/treinos/treinos-client.tsx",
  "app/treinos/registro/registro-client.tsx",
  "app/relatorios/relatorios-client.tsx",
  "app/configuracoes/page.tsx",
  "app/portal/page.tsx",
  "app/planos/page.tsx",
  "app/chat/chat-client.tsx",
  "app/cadastro/cadastro-client.tsx",
  "app/admin/admin-client.tsx",
  "app/admin/faturamento/page.tsx",
  "app/admin/planos/page.tsx",
  "app/admin/relatorios/page.tsx",
  "app/admin/adestradores/adestradores-client.tsx",
];

const REPLACEMENTS = [
  // Wrapper de página
  [/<main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">/g, '<main className="page">'],
  [/<main className="mx-auto w-full max-w-2xl px-3 pb-24 pt-3">/g, '<main className="page">'],
  [/<main className="mx-auto w-full max-w-3xl px-3 pb-24 pt-3">/g, '<main className="page">'],
  [/<main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-3 sm:max-w-7xl">/g, '<main className="page">'],
  // Section outer legada (border + bg)
  [/<section className="rounded-lg border border-\[var\(--border\)\] bg-\[var\(--surface\)\] p-4 shadow-sm">/g, '<div className="space-y-6">'],
  [/<section className="rounded-md border border-\[var\(--border\)\] bg-\[var\(--surface\)\] p-4 shadow-sm">/g, '<div className="space-y-6">'],
];

let changes = 0;
for (const rel of TARGETS) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  let content = fs.readFileSync(full, "utf8");
  const before = content;
  for (const [from, to] of REPLACEMENTS) content = content.replace(from, to);
  if (content !== before) {
    fs.writeFileSync(full, content);
    changes += 1;
    console.log(`✓ ${rel}`);
  }
}
console.log(`\n${changes} arquivos normalizados.`);
