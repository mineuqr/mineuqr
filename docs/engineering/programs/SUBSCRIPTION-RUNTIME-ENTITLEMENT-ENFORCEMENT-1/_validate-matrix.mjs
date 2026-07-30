/**
 * Validation helper — matrix completeness (no product change).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const matrixSrc = readFileSync(
  resolve(root, "server/subscription-runtime/capabilityMatrix.ts"),
  "utf8"
);
const featureKeysSrc = readFileSync(
  resolve(root, "src/lib/commercial/featureKeys.ts"),
  "utf8"
);

const FEATURE_KEYS = [
  ...featureKeysSrc.matchAll(/"([a-zA-Z]+)"/g),
]
  .map((m) => m[1])
  .filter((k) =>
    [
      "qrMenu",
      "categories",
      "menuImages",
      "search",
      "ordering",
      "cart",
      "checkout",
      "requestBill",
      "callWaiter",
      "orderTracking",
      "reports",
      "excelExport",
      "hotelMode",
      "roomQr",
      "dynamicServiceCatalog",
      "templates",
      "customColors",
      "customFonts",
    ].includes(k)
  );

const features = [
  ...matrixSrc.matchAll(/kind: "feature", entitlementKey: "([^"]+)"/g),
].map((m) => m[1]);
const limits = [
  ...matrixSrc.matchAll(/kind: "limit", entitlementKey: "([^"]+)"/g),
].map((m) => m[1]);
const caps = [...matrixSrc.matchAll(/capabilityId: "([^"]+)"/g)].map(
  (m) => m[1]
);
const limKeys = [
  "restaurants",
  "categories",
  "items",
  "ordersPerMonth",
  "qrCodes",
  "storage",
  "images",
  "staffAccounts",
  "branches",
  "devices",
];

const report = {
  featureKeys: FEATURE_KEYS.length,
  matrixFeatures: features.length,
  matrixLimits: limits.length,
  uniqueCapabilities: new Set(caps).size,
  duplicateCapabilities: caps.filter((c, i) => caps.indexOf(c) !== i),
  orphanFeatures: FEATURE_KEYS.filter((k) => !features.includes(k)),
  orphanLimits: limKeys.filter((k) => !limits.includes(k)),
  extraFeatures: features.filter((k) => !FEATURE_KEYS.includes(k)),
  complete:
    FEATURE_KEYS.every((k) => features.includes(k)) &&
    limKeys.every((k) => limits.includes(k)) &&
    caps.filter((c, i) => caps.indexOf(c) !== i).length === 0,
};

const outDir = resolve(
  root,
  "docs/engineering/programs/SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1/_validation"
);
mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "matrix-coverage.json"),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
process.exit(report.complete ? 0 : 1);
