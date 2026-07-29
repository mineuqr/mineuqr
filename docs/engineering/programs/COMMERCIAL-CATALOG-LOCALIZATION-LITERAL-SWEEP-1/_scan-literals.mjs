/**
 * COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1
 * Scan Catalog UI for likely user-facing string literals.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const root = process.cwd();
const scanRoots = [
  "client/src/components/admin/platform-ops/commercial-catalog",
  "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx",
  "client/src/components/commercial/CommercialDualPrice.tsx",
  "client/src/components/commercial/AdminLocalizedPricePreview.tsx",
];

const IGNORE_DIRS = new Set(["__tests__", "node_modules"]);
const findings = [];

function walk(p) {
  const abs = resolve(root, p);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (/\.(tsx|ts)$/.test(abs) && !abs.includes(".test.")) scanFile(abs);
    return;
  }
  for (const name of readdirSync(abs)) {
    if (IGNORE_DIRS.has(name)) continue;
    walk(join(p, name));
  }
}

const PROP_RE =
  /\b(title|description|label|placeholder|primaryActionLabel|emptyTitle|emptyDescription|aria-label|alt|confirmLabel|cancelLabel|toast\.(success|error|message)|header)=\{?\s*["'`]([^"'`]+)["'`]/g;
const JSX_TEXT_RE = />([A-Za-z][^<>{]{1,80})</g;
const TOAST_RE = /toast\.(success|error|message|info)\(\s*["'`]([^"'`]+)["'`]/g;
const ARRAY_STR_RE = /^\s*["']([A-Z][^"']{2,})["']\s*,?\s*$/;

function scanFile(abs) {
  const src = readFileSync(abs, "utf8");
  const rel = relative(root, abs).replace(/\\/g, "/");
  // skip pure logic modules without UI
  if (
    /\/(dependencyGraph|versionCompare|productivityStore|experienceObservability|catalogManagementObservability|useCatalogManagementData)\.ts$/.test(
      rel
    )
  ) {
    return;
  }
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("t(") && line.includes("admin.platformOps.commercialCatalog")) return;
    let m;
    const prop = new RegExp(PROP_RE.source, "g");
    while ((m = prop.exec(line))) {
      const text = m[2];
      if (isNoise(text)) continue;
      findings.push({ file: rel, line: i + 1, kind: "prop", text });
    }
    const toast = new RegExp(TOAST_RE.source, "g");
    while ((m = toast.exec(line))) {
      findings.push({ file: rel, line: i + 1, kind: "toast", text: m[2] });
    }
    const jsx = new RegExp(JSX_TEXT_RE.source, "g");
    while ((m = jsx.exec(line))) {
      const text = m[1].trim();
      if (isNoise(text)) continue;
      if (/^[{}$./\\-]/.test(text)) continue;
      findings.push({ file: rel, line: i + 1, kind: "jsx", text });
    }
    const am = line.match(ARRAY_STR_RE);
    if (am && /PlanCreationWizard|smartValidation|STEPS/.test(rel + line)) {
      findings.push({ file: rel, line: i + 1, kind: "array", text: am[1] });
    }
  });
}

function isNoise(text) {
  if (!text || text.length < 2) return true;
  if (/^(sm|md|lg|xl|2xl|flex|grid|gap|w-|h-|p-|m-|text-|bg-|border|rounded|font-|shadow|dark:|hover:|focus|items-|justify-|col-|row-|max-|min-|overflow|transition|animate|space-|underline|tabular|ring-|opacity|pointer|absolute|relative|fixed|sticky|hidden|block|inline|sr-only|destructive|outline|ghost|default|secondary|primary|healthy|warning|degraded|unavailable|unknown|info|information)/i.test(text))
    return true;
  if (/^(react|sonner|button|input|select|checkbox|div|span|ul|li|p|h[1-6])$/i.test(text))
    return true;
  if (/^[a-z][a-zA-Z0-9]*$/.test(text) && text.length < 4) return true;
  if (/^https?:|^\.|^\//.test(text)) return true;
  if (/^(day|week|month|year|draft|published|deprecated|retired|desktop|tablet|mobile|monthly|yearly)$/i.test(text))
    return false; // user-facing enums — keep
  return false;
}

for (const p of scanRoots) walk(p);

const outDir = resolve(
  root,
  "docs/engineering/programs/COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1/_audit"
);
mkdirSync(outDir, { recursive: true });
const unique = [...new Map(findings.map((f) => [`${f.file}:${f.line}:${f.text}`, f])).values()];
writeFileSync(resolve(outDir, "literal-findings.json"), JSON.stringify(unique, null, 2));
console.log(JSON.stringify({ count: unique.length, files: [...new Set(unique.map((f) => f.file))].length }, null, 2));
