// Substituições em massa para normalizar visual antigo (cores hardcoded,
// radii exagerados, gradients pastel) para os tokens do design system v2.
// Roda uma vez: `node scripts/redesign-replace.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DIRS = ["app", "components"];
const EXT = [".tsx", ".ts"];

// Cada par é regex/string ou string/string. Aplicação em ordem.
const REPLACEMENTS = [
  // Raios exagerados → md (0.375rem) ou lg (0.5rem) onde fizer sentido
  [/\brounded-\[2\.25rem\]/g, "rounded-lg"],
  [/\brounded-\[2rem\]/g, "rounded-lg"],
  [/\brounded-\[1\.75rem\]/g, "rounded-lg"],
  [/\brounded-\[1\.5rem\]/g, "rounded-lg"],
  [/\brounded-\[1\.25rem\]/g, "rounded-md"],
  [/\brounded-3xl/g, "rounded-lg"],
  [/\brounded-2xl/g, "rounded-md"],
  [/\brounded-xl/g, "rounded-md"],

  // Sombras heavy → none ou xs
  [/\bshadow-\[var\(--shadow\)\]/g, "shadow-sm"],
  [/\bshadow-\[0_18px_45px_rgba\(17,73,110,0\.18\)\]/g, "shadow-md"],
  [/\bshadow-\[0_20px_50px_rgba\(15,72,106,0\.15\)\]/g, "shadow-md"],
  [/\bshadow-\[0_-8px_30px_rgba\(15,72,106,0\.06\)\]/g, "shadow-sm"],
  [/\bshadow-\[0_10px_24px_rgba\(15,72,106,0\.09\)\]/g, "shadow-sm"],
  [/\bshadow-\[0_12px_24px_rgba\(20,90,130,0\.24\)\]/g, "shadow-sm"],

  // Backgrounds pastel hardcoded → surface
  [/\bbg-\[#f7fbff\]\/95/g, "bg-[var(--surface)]"],
  [/\bbg-\[#f7fbff\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[#fcfdff\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[#fbfeff\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[rgba\(247,253,255,0\.95\)\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[rgba\(247,253,255,0\.86\)\]/g, "bg-[var(--surface)]/85"],
  [/\bbg-\[rgba\(243,251,255,0\.88\)\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[rgba\(250,255,255,0\.94\)\]/g, "bg-[var(--surface)]"],
  [/\bbg-\[rgba\(248,253,255,0\.97\)\]/g, "bg-[var(--surface)]"],
  [/\bbg-sky-50\/30/g, "bg-[var(--surface-2)]/30"],
  [/\bbg-sky-50\/40/g, "bg-[var(--surface-2)]/40"],
  [/\bbg-sky-50\/50/g, "bg-[var(--surface-2)]/50"],
  [/\bbg-sky-50\/60/g, "bg-[var(--surface-2)]/60"],
  [/\bbg-sky-50\/80/g, "bg-[var(--surface-2)]/80"],
  [/\bbg-sky-50(?!\d|\/)/g, "bg-[var(--surface-2)]"],

  // Border antigos → token
  [/\bborder-\[#cfe4f3\]/g, "border-[var(--border)]"],
  [/\bborder-\[#c9dfef\]/g, "border-[var(--border)]"],
  [/\bborder-\[rgba\(20,79,116,0\.18\)\]/g, "border-[var(--border)]"],
  [/\bborder-\[rgba\(176,116,32,0\.28\)\]/g, "border-[var(--warning)]/30"],
  [/\bborder-sky-100/g, "border-[var(--border)]"],
  [/\bborder-sky-200/g, "border-[var(--border-strong)]"],

  // Texto/accent antigos → tokens
  [/\btext-\[#145a82\]/g, "text-[var(--foreground)]"],
  [/\btext-\[#0f3d5e\]/g, "text-[var(--foreground)]"],
  [/\btext-\[#2d6f99\]/g, "text-[var(--muted)]"],
  [/\btext-\[rgba\(20,90,130,0\.74\)\]/g, "text-[var(--muted)]"],
  [/\btext-\[rgba\(20,90,130,0\.8\)\]/g, "text-[var(--muted)]"],
  [/\btext-\[rgba\(28,65,92,0\.8\)\]/g, "text-[var(--muted)]"],
  [/\bbg-\[#145a82\](?!\/)/g, "bg-[var(--accent)]"],
  [/\bbg-\[#124f72\]/g, "bg-[var(--accent)]"],
  [/\bbg-\[#0f3d5e\]/g, "bg-[var(--accent)]"],

  // Pílulas de cores → badges semânticos
  [/\bbg-orange-500(?!\d)/g, "bg-[var(--danger)]"],

  // Tracking arrebatador → mais discreto
  [/\btracking-\[0\.24em\]/g, "tracking-wider"],
  [/\btracking-\[0\.22em\]/g, "tracking-wider"],
  [/\btracking-\[0\.18em\]/g, "tracking-wider"],
  [/\btracking-\[0\.16em\]/g, "tracking-wider"],
  [/\btracking-\[0\.14em\]/g, "tracking-wider"],
  [/\btracking-\[0\.12em\]/g, "tracking-wide"],

  // Font display antiga → padrão (Inter)
  [/\bfont-display\s+/g, ""],

  // Backdrop blur exagerado
  [/\bbackdrop-blur-xl/g, "backdrop-blur"],

  // Hover bg colorido genérico → surface-2
  [/\bhover:bg-sky-50(?![/\d])/g, "hover:bg-[var(--surface-2)]"],
];

let scannedCount = 0;
let changedCount = 0;
let totalReplacements = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (EXT.includes(path.extname(entry.name))) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  scannedCount += 1;
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let fileReplacements = 0;

  for (const [from, to] of REPLACEMENTS) {
    const before = content;
    if (from instanceof RegExp) {
      content = content.replace(from, to);
    } else {
      content = content.split(from).join(to);
    }
    if (before !== content) {
      const count = (before.match(from instanceof RegExp ? from : new RegExp(escapeRegex(from), "g")) || []).length;
      fileReplacements += count;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    changedCount += 1;
    totalReplacements += fileReplacements;
    console.log(`  ${path.relative(ROOT, filePath)} — ${fileReplacements} substituições`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log("Aplicando substituições do design system v2…\n");
for (const dir of DIRS) walk(path.join(ROOT, dir));
console.log(`\n✓ ${scannedCount} arquivos escaneados`);
console.log(`✓ ${changedCount} arquivos alterados`);
console.log(`✓ ${totalReplacements} substituições aplicadas`);
