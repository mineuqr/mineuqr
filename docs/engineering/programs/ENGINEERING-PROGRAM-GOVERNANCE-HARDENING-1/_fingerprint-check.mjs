/**
 * ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1
 * Parse tsc --noEmit output into a deterministic diagnostic fingerprint.
 * No source mutation. No secrets.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const rawPath = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(dir, "pnpm-check.raw.txt");

const raw = readFileSync(rawPath, "utf8").replace(/^\uFEFF/, "");
const lineRe =
  /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

const diagnostics = [];
for (const line of raw.split(/\r?\n/)) {
  const m = lineRe.exec(line);
  if (!m) continue;
  const file = m[1].replace(/\\/g, "/");
  const message = m[5].replace(/\s+/g, " ").trim();
  diagnostics.push({
    file,
    line: Number(m[2]),
    column: Number(m[3]),
    code: m[4],
    message,
    key: `${file}:${m[2]}:${m[3]}:${m[4]}`,
    identity: `${file}::${m[4]}::${message}`,
  });
}

const byCode = {};
const byFile = {};
for (const d of diagnostics) {
  byCode[d.code] = (byCode[d.code] ?? 0) + 1;
  byFile[d.file] = (byFile[d.file] ?? 0) + 1;
}

const appTsx = diagnostics.filter((d) => d.file === "client/src/App.tsx");

const out = {
  program: "ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1",
  command: "pnpm check → tsc --noEmit",
  source: rawPath.replace(/\\/g, "/"),
  total: diagnostics.length,
  byCode: Object.fromEntries(
    Object.entries(byCode).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  ),
  byFile: Object.fromEntries(
    Object.entries(byFile).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  ),
  appTsx: {
    count: appTsx.length,
    keys: appTsx.map((d) => d.key),
  },
  diagnostics,
};

const dest = process.argv[3]
  ? join(process.cwd(), process.argv[3])
  : join(dir, "DIAGNOSTIC-FINGERPRINT.json");
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      total: out.total,
      codes: Object.keys(out.byCode).length,
      files: Object.keys(out.byFile).length,
      appTsx: out.appTsx.count,
      dest: dest.replace(/\\/g, "/"),
    },
    null,
    2
  )
);
