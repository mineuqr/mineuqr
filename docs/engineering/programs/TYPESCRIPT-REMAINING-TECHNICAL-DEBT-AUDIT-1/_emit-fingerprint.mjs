/**
 * Parse tsc --pretty false output into a fingerprint JSON.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const rawPath = process.argv[2];
const outName = process.argv[3] || "DIAGNOSTIC-FINGERPRINT.json";
const raw = readFileSync(join(dir, rawPath), "utf8");

const re =
  /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const diagnostics = [];
let pending = null;
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(re);
  if (m) {
    if (pending) diagnostics.push(pending);
    const file = m[1].replace(/\\/g, "/");
    const message = m[5];
    pending = {
      file,
      line: Number(m[2]),
      column: Number(m[3]),
      code: m[4],
      message,
      key: `${file}:${m[2]}:${m[3]}:${m[4]}`,
      identity: `${file}::${m[4]}::${message}`,
    };
  } else if (pending && line.startsWith("  ")) {
    pending.message += ` ${line.trim()}`;
    pending.identity = `${pending.file}::${pending.code}::${pending.message}`;
  }
}
if (pending) diagnostics.push(pending);

const byCode = {};
const byFile = {};
for (const d of diagnostics) {
  byCode[d.code] = (byCode[d.code] ?? 0) + 1;
  byFile[d.file] = (byFile[d.file] ?? 0) + 1;
}

const fp = {
  program: "TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1",
  command: "tsc --noEmit --incremental false --pretty false",
  source: join(dir, rawPath).replace(/\\/g, "/"),
  total: diagnostics.length,
  byCode,
  byFile,
  appTsx: {
    count: diagnostics.filter((d) => d.file.endsWith("App.tsx")).length,
    keys: diagnostics.filter((d) => d.file.endsWith("App.tsx")).map((d) => d.key),
  },
  occupancyHits: diagnostics.filter((d) =>
    /occupancy|checkLimit|commercialLimitOccupancy/i.test(d.file + d.message)
  ).length,
  diagnostics,
};

writeFileSync(join(dir, outName), `${JSON.stringify(fp, null, 2)}\n`);
console.log(
  JSON.stringify(
    { total: fp.total, byCode, appTsx: fp.appTsx.count, occupancyHits: fp.occupancyHits },
    null,
    2
  )
);
