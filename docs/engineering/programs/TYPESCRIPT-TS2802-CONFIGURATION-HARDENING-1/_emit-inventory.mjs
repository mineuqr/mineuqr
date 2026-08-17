/**
 * Emit TS2802 inventory from the program fingerprint.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const fp = JSON.parse(readFileSync(join(dir, "DIAGNOSTIC-FINGERPRINT.json"), "utf8"));
const rows = fp.diagnostics.filter((d) => d.code === "TS2802");

function kind(message) {
  if (message.includes("ReadonlyMap")) return "ReadonlyMap for-of";
  if (message.includes("MapIterator")) return "MapIterator for-of";
  if (message.includes("Set<") || message.includes("Type 'Set")) return "Set for-of";
  if (message.includes("Map<") || message.includes("Type 'Map")) return "Map for-of";
  return "iterable for-of";
}

function pipeline(file) {
  if (file.startsWith("client/")) return "Vite client bundle (tsc check-only)";
  if (file.startsWith("server/")) return "esbuild Node bundle (tsc check-only)";
  if (file.startsWith("shared/")) return "consumed by Vite and/or esbuild (tsc check-only)";
  return "tsc check-only";
}

const byKind = {};
const byPipeline = {};
for (const r of rows) {
  const k = kind(r.message);
  const p = pipeline(r.file);
  byKind[k] = (byKind[k] ?? 0) + 1;
  byPipeline[p] = (byPipeline[p] ?? 0) + 1;
}

const lines = [];
lines.push("# TS2802 INVENTORY");
lines.push("");
lines.push(`**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1`);
lines.push(`**Count:** ${rows.length}`);
lines.push(`**Command:** pnpm check → tsc --noEmit`);
lines.push("");
lines.push("All 118 diagnostics are the same family: `for-of` (or equivalent iteration) over Map/Set/Iterator while tsc’s implicit target is ES5.");
lines.push("");
lines.push("Runtime of generated code is **not** tsc. tsc is `noEmit`. Client emit is Vite; server emit is esbuild `--platform=node`.");
lines.push("");
lines.push("## By iterable kind");
lines.push("");
lines.push("| Kind | Count |");
lines.push("|------|------:|");
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("## By build pipeline (check vs emit)");
lines.push("");
lines.push("| Pipeline | Count |");
lines.push("|----------|------:|");
for (const [k, v] of Object.entries(byPipeline).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("## Every occurrence");
lines.push("");

let i = 1;
for (const r of rows) {
  lines.push(`### TS2802-${String(i).padStart(3, "0")}`);
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| file | \`${r.file}\` |`);
  lines.push(`| line | ${r.line} |`);
  lines.push(`| column | ${r.column} |`);
  lines.push(`| diagnostic | ${r.message.replace(/\|/g, "\\|")} |`);
  lines.push(`| syntax | ${kind(r.message)} |`);
  lines.push("| depends on iterable/downlevel | yes — native Map/Set iteration |");
  lines.push("| tsc emit | none (`noEmit: true`) |");
  lines.push(`| production pipeline | ${pipeline(r.file)} |`);
  lines.push("");
  i += 1;
}

writeFileSync(join(dir, "TS2802-INVENTORY.md"), `${lines.join("\n")}\n`);
console.log(JSON.stringify({ count: rows.length, byKind, byPipeline }, null, 2));
