/**
 * LEGACY-COMPATIBILITY-RETIREMENT-1
 *
 * Normative classification of remaining commercial legacy-compatibility artifacts.
 * Does NOT redesign Projection / Catalog / Runtime.
 * Removal is allowed only when status is UNUSED (or explicitly SAFE_TO_REMOVE).
 */

import { LEGACY_COMPAT_FEATURE_KEYS } from "./legacyCompat";
import type { LegacyCompatFeatureKey } from "./legacyCompat";

export const LEGACY_COMPATIBILITY_RETIREMENT_PROGRAM =
  "LEGACY-COMPATIBILITY-RETIREMENT-1" as const;

export type LegacyCompatUsageClass =
  | "ACTIVE_DEPENDENCY"
  | "TRANSITIONAL"
  | "UNUSED"
  | "UNKNOWN";

export type LegacyRetirementAction =
  | "RETIRE_IMMEDIATELY"
  | "RETIRE_LATER"
  | "KEEP_TEMPORARILY"
  | "BLOCKED";

export type LegacyCompatArtifactRecord = {
  id: string;
  artifact: string;
  path: string;
  usageClass: LegacyCompatUsageClass;
  retirementAction: LegacyRetirementAction;
  consumers: readonly string[];
  evidence: string;
  retirementCondition: string;
};

/**
 * Per-key Runtime entitlement compat classification.
 * All keys remain in RUNTIME_ENTITLEMENT_FEATURE_KEYS until conditions met.
 */
export const LEGACY_COMPAT_KEY_RETIREMENT: Record<
  LegacyCompatFeatureKey,
  {
    usageClass: LegacyCompatUsageClass;
    retirementAction: LegacyRetirementAction;
    consumers: readonly string[];
    evidence: string;
    retirementCondition: string;
  }
> = {
  qrMenu: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["entitlementResolver.deniedFeatures", "snapshot fixtures", "planFeatureMatrix"],
    evidence: "deniedFeatures defaults qrMenu=true; unbound matrix NONE/BASIC rows",
    retirementCondition: "deniedFeatures no longer special-cases qrMenu; zero snapshot refs",
  },
  search: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["entitlementResolver.deniedFeatures", "snapshot fixtures", "planFeatureMatrix"],
    evidence: "deniedFeatures defaults search=true",
    retirementCondition: "deniedFeatures no longer special-cases search; zero snapshot refs",
  },
  categories: {
    usageClass: "TRANSITIONAL",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["planFeatureMatrix", "expandFeatureKeysForRuntime"],
    evidence: "Unbound FEATURE_MATRIX legacyExtras; may exist in bound snapshots",
    retirementCondition: "No bound snapshot includes categories; unbound matrix drops key",
  },
  menuImages: {
    usageClass: "TRANSITIONAL",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["planFeatureMatrix", "expandFeatureKeysForRuntime"],
    evidence: "Unbound FEATURE_MATRIX legacyExtras",
    retirementCondition: "No bound snapshot includes menuImages; unbound matrix drops key",
  },
  cart: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["expandFeatureKeysForRuntime→ordering", "planFeatureMatrix", "Runtime tests"],
    evidence: "Alias cart→ordering; snapshot expand; FEATURE_MATRIX sync",
    retirementCondition: "Zero snapshot/bundle rows with cart; alias removed after audit",
  },
  checkout: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["expandFeatureKeysForRuntime→ordering", "planFeatureMatrix"],
    evidence: "Alias checkout→ordering",
    retirementCondition: "Zero snapshot/bundle rows with checkout",
  },
  requestBill: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["expandFeatureKeysForRuntime→checkManagement", "planFeatureMatrix"],
    evidence: "Alias requestBill→checkManagement",
    retirementCondition: "Zero snapshot/bundle rows with requestBill",
  },
  callWaiter: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["expandFeatureKeysForRuntime→waiter", "planFeatureMatrix", "Runtime tests"],
    evidence: "Alias callWaiter→waiter",
    retirementCondition: "Zero snapshot/bundle rows with callWaiter",
  },
  orderTracking: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["expandFeatureKeysForRuntime→ordering", "planFeatureMatrix"],
    evidence: "Alias orderTracking→ordering",
    retirementCondition: "Zero snapshot/bundle rows with orderTracking",
  },
  reports: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "BLOCKED",
    consumers: [
      "featureVisibility.showReportsUpgradeNotice",
      "ReportsTab",
      "expandFeatureKeysForRuntime→reporting",
      "Runtime tests",
    ],
    evidence: "client/src/lib/commercial/featureVisibility.ts + ReportsTab featureKey=reports",
    retirementCondition:
      "UI gates migrate to projection `reporting` AND zero snapshot refs to reports",
  },
  excelExport: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "BLOCKED",
    consumers: [
      "featureVisibility.showExcelUpgradeLabel",
      "ReportsTab",
      "expandFeatureKeysForRuntime→reporting",
    ],
    evidence: "featureVisibility + ReportsTab featureKey=excelExport",
    retirementCondition:
      "UI gates migrate to projection `reporting` AND zero snapshot refs to excelExport",
  },
  hotelMode: {
    usageClass: "TRANSITIONAL",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["planFeatureMatrix", "expandFeatureKeysForRuntime", "Runtime tests"],
    evidence: "PROFESSIONAL/ENTERPRISE legacyExtras; hasFeature(hotelMode) tests",
    retirementCondition: "Zero snapshot refs; UI does not gate hotelMode; matrix drops key",
  },
  roomQr: {
    usageClass: "TRANSITIONAL",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["planFeatureMatrix", "expandFeatureKeysForRuntime"],
    evidence: "Unbound matrix legacyExtras",
    retirementCondition: "Zero snapshot refs; matrix drops key",
  },
  dynamicServiceCatalog: {
    usageClass: "TRANSITIONAL",
    retirementAction: "KEEP_TEMPORARILY",
    consumers: ["planFeatureMatrix", "expandFeatureKeysForRuntime"],
    evidence: "Unbound matrix legacyExtras",
    retirementCondition: "Zero snapshot refs; matrix drops key",
  },
  templates: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "BLOCKED",
    consumers: [
      "featureVisibility.isPremiumTemplateLocked",
      "TemplateSelector",
      "planFeatureMatrix",
    ],
    evidence: "featureVisibility templates gates; no Projection packaging for branding",
    retirementCondition:
      "AA packages branding into Projection OR gates become always-on; then drop key",
  },
  customColors: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "BLOCKED",
    consumers: ["featureVisibility.showCustomColorsPanel", "ColorCustomizer", "planFeatureMatrix"],
    evidence: "featureVisibility customColors",
    retirementCondition: "Same as templates (branding packaging decision)",
  },
  customFonts: {
    usageClass: "ACTIVE_DEPENDENCY",
    retirementAction: "BLOCKED",
    consumers: ["featureVisibility.showCustomFontsPanel", "FontCustomizer", "planFeatureMatrix"],
    evidence: "featureVisibility customFonts",
    retirementCondition: "Same as templates (branding packaging decision)",
  },
};

/** Structural compatibility mechanisms (beyond per-key list). */
export const LEGACY_COMPAT_STRUCTURE_RETIREMENT: readonly LegacyCompatArtifactRecord[] =
  [
    {
      id: "LEGACY-KEYS-LIST",
      artifact: "LEGACY_COMPAT_FEATURE_KEYS",
      path: "shared/commercial-projection/legacyCompat.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["RUNTIME_ENTITLEMENT_FEATURE_KEYS", "capabilityMatrix", "planFeatureMatrix"],
      evidence: "Unioned into FEATURE_KEYS; matrix rows cap.legacy.*",
      retirementCondition: "Every key in LEGACY_COMPAT_KEY_RETIREMENT reaches RETIRE_IMMEDIATELY",
    },
    {
      id: "LEGACY-ALIAS-MAP",
      artifact: "LEGACY_TO_PROJECTION + normalizeToProjectionId",
      path: "shared/commercial-projection/legacyCompat.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: [
        "expandFeatureKeysForRuntime",
        "normalizeFeatureKeysForProjection",
        "assertCommercialCapabilityFilterKeys",
      ],
      evidence: "Snapshot expand + Catalog write normalize",
      retirementCondition: "Zero legacy alias strings in snapshots/bundles",
    },
    {
      id: "RUNTIME-EXPAND",
      artifact: "expandFeatureKeysForRuntime",
      path: "shared/commercial-projection/index.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: [
        "entitlementResolver.featuresFromSnapshot",
        "snapshotRuntimeAuthority.featuresFromSnapshot",
      ],
      evidence: "Both snapshot assemblers call expandFeatureKeysForRuntime",
      retirementCondition: "All bound snapshots store Projection IDs only",
    },
    {
      id: "MATRIX-LEGACY-ROWS",
      artifact: "LEGACY_COMPAT_MATRIX / cap.legacy.*",
      path: "server/subscription-runtime/capabilityMatrix.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["resolveCapabilityEntitlement", "I-SRE-02 completeness"],
      evidence: "Matrix includes one row per LEGACY_COMPAT_FEATURE_KEYS entry",
      retirementCondition: "Legacy keys removed from FEATURE_KEYS",
    },
    {
      id: "UNBOUND-MATRIX",
      artifact: "planFeatureMatrix legacyExtras",
      path: "src/lib/commercial/planFeatureMatrix.ts",
      usageClass: "TRANSITIONAL",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["Unbound subscription bridge only"],
      evidence: "COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 unbound path",
      retirementCondition: "Zero unbound subscriptions in production",
    },
    {
      id: "UI-GATES-LEGACY-KEYS",
      artifact: "featureVisibility legacy FeatureKeys",
      path: "client/src/lib/commercial/featureVisibility.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "BLOCKED",
      consumers: ["TemplateSelector", "ColorCustomizer", "FontCustomizer", "ReportsTab"],
      evidence: "Direct hasCommercialFeature(templates|customColors|customFonts|reports|excelExport)",
      retirementCondition: "Separate UI entitlement migration program to Projection IDs",
    },
    {
      id: "UI-LABELS-LEGACY",
      artifact: "entitlementsDisplay LEGACY_LABELS",
      path: "client/src/lib/commercial/entitlementsDisplay.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["CommercialFeaturesDisplay", "upgrade banner"],
      evidence: "FEATURE_LABELS merges projection + legacy labels for FEATURE_KEYS",
      retirementCondition: "Legacy keys leave FEATURE_KEYS",
    },
    {
      id: "CATALOG-LOCALE-ORPHANS",
      artifact: "admin.platformOps.commercialCatalog.features.{legacyKey}",
      path: "client/src/locales/en.json + ar.json",
      usageClass: "UNUSED",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["None for Catalog picker (Projection keys only)"],
      evidence:
        "COMMERCIAL_CAPABILITY_FILTER_KEYS are Projection IDs; picker uses catalogFeatureNameKey(projectionId)",
      retirementCondition:
        "AA locale sweep program may delete orphan keys; kept to avoid accidental i18n gaps",
    },
    {
      id: "LEGACY-PLAN-BRIDGE",
      artifact: "LEGACY_PLAN_BRIDGE",
      path: "server/services/commercial-catalog/legacyPlanBridge.ts",
      usageClass: "ACTIVE_DEPENDENCY",
      retirementAction: "KEEP_TEMPORARILY",
      consumers: ["seedAdoptionCatalog", "entitlementResolver catalogPlanFromSnapshot", "adoptionService"],
      evidence: "Maps legacyPlanId ↔ catalogPlanCode for bound/unbound continuity",
      retirementCondition: "All subscriptions Catalog-native; no legacyPlanId resolution",
    },
    {
      id: "LEGACY-DIRECT-PROJECTION-KEYS",
      artifact: "LEGACY_DIRECT_PROJECTION_KEYS (REMOVED)",
      path: "shared/commercial-projection/legacyCompat.ts",
      usageClass: "UNUSED",
      retirementAction: "RETIRE_IMMEDIATELY",
      consumers: ["None — was defined never imported"],
      evidence: "Removed LEGACY-COMPATIBILITY-RETIREMENT-1; grep had only definition site",
      retirementCondition: "Completed — constant deleted from legacyCompat.ts",
    },
  ];

export function listLegacyCompatKeysByAction(
  action: LegacyRetirementAction
): LegacyCompatFeatureKey[] {
  return LEGACY_COMPAT_FEATURE_KEYS.filter(
    (k) => LEGACY_COMPAT_KEY_RETIREMENT[k].retirementAction === action
  );
}

export function assertLegacyCompatKeyClassificationComplete(): void {
  for (const key of LEGACY_COMPAT_FEATURE_KEYS) {
    if (!LEGACY_COMPAT_KEY_RETIREMENT[key]) {
      throw new Error(`Missing retirement classification for ${key}`);
    }
  }
}
