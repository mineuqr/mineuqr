/**
 * Emit ERROR-CLASSIFICATION.md from ERROR-CLASSIFICATION.json.
 * Forensic snapshot of the 188-error baseline (before remediation).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(dir, "ERROR-CLASSIFICATION.json"), "utf8")
);

function esc(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

const lines = [];
lines.push("# ERROR CLASSIFICATION");
lines.push("");
lines.push("**Program:** TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1");
lines.push("**Scope:** all 188 diagnostics from the forensic `pnpm check` baseline");
lines.push("**Comparison baseline:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1 / DIAGNOSTIC-FINGERPRINT.json");
lines.push("**Baseline state of this population:** UNCHANGED = 188; NEW = 0; REMOVED = 0; CHANGED = 0; MOVED_ONLY = 0; UNCLASSIFIED = 0");
lines.push("");
lines.push("This file classifies the **188-error forensic population**. FIX_NOW items listed here were still present at classification time. Post-remediation status is in TEST-RESULTS.md and FINAL-REPORT.md.");
lines.push("");
lines.push("## Decision totals (forensic, before FIX_NOW)");
lines.push("");
lines.push("| Decision | Count |");
lines.push("|----------|------:|");
for (const [k, v] of Object.entries(data.decisionCounts)) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("## Category totals");
lines.push("");
lines.push("| Category | Count |");
lines.push("|----------|------:|");
for (const [k, v] of Object.entries(data.categoryCounts)) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("## Priority totals");
lines.push("");
lines.push("| Priority | Count |");
lines.push("|----------|------:|");
for (const [k, v] of Object.entries(data.priorityCounts)) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("## All 188 diagnostics");
lines.push("");

for (const r of data.rows) {
  lines.push(`### ${r.diagnosticId}`);
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| diagnostic ID | ${r.diagnosticId} |`);
  lines.push(`| file | \`${esc(r.file)}\` |`);
  lines.push(`| line | ${r.line} |`);
  lines.push(`| column | ${r.column} |`);
  lines.push(`| TS code | ${r.code} |`);
  lines.push(`| normalized message | ${esc(r.message)} |`);
  lines.push(`| baseline state | ${r.baselineState} |`);
  lines.push(`| current state | ${r.currentState} |`);
  lines.push(`| category | ${r.category} — ${esc(r.categoryName)} |`);
  lines.push(`| priority | ${r.priority} |`);
  lines.push(`| likely cause | ${esc(r.likelyCause)} |`);
  lines.push(`| evidence | ${esc(r.evidence)} |`);
  lines.push(`| remediation decision | ${r.remediationDecision} |`);
  lines.push(`| status | ${r.status} |`);
  lines.push("");
}

writeFileSync(join(dir, "ERROR-CLASSIFICATION.md"), `${lines.join("\n")}\n`);
console.log(`wrote ERROR-CLASSIFICATION.md rows=${data.rows.length}`);
