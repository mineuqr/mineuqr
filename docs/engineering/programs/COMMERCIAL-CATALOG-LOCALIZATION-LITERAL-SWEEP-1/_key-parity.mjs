/**
 * COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1
 * Key parity + orphan/missing detection for commercialCatalog locale tree.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const outDir = resolve(
  root,
  "docs/engineering/programs/COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1/_audit"
);
mkdirSync(outDir, { recursive: true });

function flatten(obj, prefix = "", out = {}) {
  if (obj == null || typeof obj !== "object") {
    out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}

const en = JSON.parse(
  readFileSync(resolve(root, "client/src/locales/en.json"), "utf8")
);
const ar = JSON.parse(
  readFileSync(resolve(root, "client/src/locales/ar.json"), "utf8")
);

const enFlat = flatten(en.admin?.platformOps?.commercialCatalog ?? {});
const arFlat = flatten(ar.admin?.platformOps?.commercialCatalog ?? {});
const enKeys = Object.keys(enFlat);
const arKeys = Object.keys(arFlat);

const missingInAr = enKeys.filter((k) => !(k in arFlat));
const missingInEn = arKeys.filter((k) => !(k in enFlat));
const emptyEn = enKeys.filter((k) => !String(enFlat[k] ?? "").trim());
const emptyAr = arKeys.filter((k) => !String(arFlat[k] ?? "").trim());
const identicalArEn = enKeys.filter(
  (k) =>
    k in arFlat &&
    typeof enFlat[k] === "string" &&
    enFlat[k] === arFlat[k] &&
    /[A-Za-z]{4,}/.test(String(enFlat[k]))
);

// Collect referenced keys from Catalog UI sources
const srcFiles = [
  "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx",
  "client/src/components/admin/platform-ops/commercial-catalog/CatalogFormDialog.tsx",
  "client/src/components/admin/platform-ops/commercial-catalog/experience/ExperiencePanels.tsx",
  "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx",
  "client/src/components/admin/platform-ops/commercial-catalog/experience/smartValidation.ts",
  "client/src/components/admin/platform-ops/commercial-catalog/catalogUiHelpers.ts",
  "client/src/components/admin/platform-ops/commercial-catalog/experience/experienceNav.ts",
  "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx",
  "client/src/components/commercial/CommercialDualPrice.tsx",
  "client/src/components/commercial/AdminLocalizedPricePreview.tsx",
];

const referenced = new Set();
const ccRe = /\bcc\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
const tRe =
  /t\(\s*["'`]admin\.platformOps\.commercialCatalog\.([^"'`]+)["'`]\s*\)/g;
const keyRe =
  /(?:titleKey|ctaKey)\s*:\s*["'`]([^"'`]+)["'`]/g;
const mapKeyRe =
  /["']admin\.platformOps\.commercialCatalog\.([^"']+)["']/g;

for (const f of srcFiles) {
  const src = readFileSync(resolve(root, f), "utf8");
  let m;
  while ((m = ccRe.exec(src))) referenced.add(m[1]);
  while ((m = tRe.exec(src))) referenced.add(m[1]);
  while ((m = keyRe.exec(src))) referenced.add(m[1]);
  while ((m = mapKeyRe.exec(src))) referenced.add(m[1]);
}

const LEGACY_ORPHAN_PREFIXES = [
  "section.",
  "modules",
  "owns",
  "doesNotOwn",
  "principles",
  "publication",
  "catalogCounts",
  "errors",
  "noVersions",
  "body",
  "foundationLive",
  "experience.compare.",
];

function isLegacyReserved(k) {
  return LEGACY_ORPHAN_PREFIXES.some(
    (p) => k === p || k.startsWith(p) || k.startsWith(p.replace(/\.$/, ""))
  );
}

const missingReferenced = [...referenced].filter((k) => {
  if (k.includes("${")) return false;
  return !(k in enFlat);
});
const orphanEn = enKeys.filter((k) => !referenced.has(k) && !isLegacyReserved(k));

const report = {
  enKeyCount: enKeys.length,
  arKeyCount: arKeys.length,
  missingInAr,
  missingInEn,
  emptyEn,
  emptyAr,
  identicalArEnSample: identicalArEn.slice(0, 30),
  identicalArEnCount: identicalArEn.length,
  referencedCount: referenced.size,
  missingReferenced,
  orphanEnCount: orphanEn.length,
  orphanEnSample: orphanEn.slice(0, 40),
  legacyReservedOrphans: enKeys.filter((k) => !referenced.has(k) && isLegacyReserved(k)).length,
  ok:
    missingInAr.length === 0 &&
    missingInEn.length === 0 &&
    emptyEn.length === 0 &&
    emptyAr.length === 0 &&
    missingReferenced.length === 0,
};

writeFileSync(resolve(outDir, "key-parity-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
