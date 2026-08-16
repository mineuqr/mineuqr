/**
 * PG-1C entitlement evaluation matrix.
 *
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1:
 * Used ONLY by the Legacy Bridge path for unbound subscriptions.
 * Bound subscriptions resolve exclusively from Commercial Snapshot —
 * this matrix must never execute after a SubscriptionBinding exists.
 *
 * COMMERCIAL-PROJECTION-GENERATION-1:
 * Rows cover Projection IDs ∪ Legacy Compat keys (Runtime FeatureKey).
 */

import { FEATURE_KEYS, type FeatureKey } from "./featureKeys";
import type { CommercialPlan } from "./planTypes";
import type { CommercialFeatures, CommercialFlags, CommercialLimits } from "./types";
import {
  CATALOG_PROMOTED_PROJECTION_IDS,
  COMMERCIAL_PROJECTION_IDS,
  LEGACY_COMPAT_FEATURE_KEYS,
  LEGACY_TO_PROJECTION,
  type CommercialProjectionId,
  type LegacyCompatFeatureKey,
} from "@shared/commercial-projection";

/** PG-1C.1B §2.2 — limits by resolved commercial plan. */
export const PLAN_LIMITS: Record<CommercialPlan, CommercialLimits> = {
  TRIAL: { restaurants: 5, categories: 25, items: 500 },
  BASIC: { restaurants: 1, categories: 10, items: 100 },
  PROFESSIONAL: { restaurants: 5, categories: 25, items: 500 },
  ENTERPRISE: { restaurants: null, categories: null, items: null },
  ADMIN: { restaurants: null, categories: null, items: null },
  NONE: { restaurants: 0, categories: 0, items: 0 },
};

type FeatureMatrixRow = Record<FeatureKey, boolean>;

function buildFeatureRow(
  enabled: ReadonlySet<CommercialProjectionId>,
  legacyExtras: Partial<Record<LegacyCompatFeatureKey, boolean>> = {}
): FeatureMatrixRow {
  const row = {} as FeatureMatrixRow;
  for (const id of COMMERCIAL_PROJECTION_IDS) {
    row[id] = enabled.has(id);
  }
  for (const key of LEGACY_COMPAT_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(legacyExtras, key)) {
      row[key] = legacyExtras[key]!;
      continue;
    }
    const mapped = LEGACY_TO_PROJECTION[key];
    if (mapped) {
      row[key] = enabled.has(mapped);
    } else {
      // Deprecated always-on menu facets (historical deniedFeatures defaults).
      row[key] = key === "qrMenu" || key === "search";
    }
  }
  return row;
}

const ALL = new Set<CommercialProjectionId>(COMMERCIAL_PROJECTION_IDS);

const BASIC_PROJECTIONS = new Set<CommercialProjectionId>([
  "ordering",
  ...CATALOG_PROMOTED_PROJECTION_IDS,
]);

const PROFESSIONAL_PROJECTIONS = new Set<CommercialProjectionId>([
  "ordering",
  "checkManagement",
  "waiter",
  "kiosk",
  "reporting",
  "kitchen",
  "printing",
  "devices",
  "counterPickup",
  ...CATALOG_PROMOTED_PROJECTION_IDS,
]);

/** PG-1C.1B §3.2 — availability matrix (Y/N). */
const FEATURE_MATRIX: Record<CommercialPlan, FeatureMatrixRow> = {
  TRIAL: buildFeatureRow(ALL, {
    templates: true,
    customColors: true,
    customFonts: true,
    menuImages: true,
    categories: true,
  }),
  BASIC: buildFeatureRow(BASIC_PROJECTIONS, {
    templates: true,
    categories: true,
    menuImages: true,
  }),
  PROFESSIONAL: buildFeatureRow(PROFESSIONAL_PROJECTIONS, {
    templates: true,
    customColors: true,
    categories: true,
    menuImages: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
  }),
  ENTERPRISE: buildFeatureRow(ALL, {
    templates: true,
    customColors: true,
    customFonts: true,
    categories: true,
    menuImages: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
  }),
  ADMIN: buildFeatureRow(ALL, {
    templates: true,
    customColors: true,
    customFonts: true,
    categories: true,
    menuImages: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
  }),
  NONE: buildFeatureRow(new Set(), {
    qrMenu: true,
    search: true,
    templates: false,
    customColors: false,
    customFonts: false,
    categories: false,
    menuImages: false,
  }),
};

/** PG-1C.1B §4.2 — primary commercial flags by resolved plan. */
export const PLAN_COMMERCIAL_FLAGS: Record<
  CommercialPlan,
  Pick<CommercialFlags, "isTrial" | "isPaid" | "isEnterprise" | "isAdmin">
> = {
  TRIAL: { isTrial: true, isPaid: false, isEnterprise: false, isAdmin: false },
  BASIC: { isTrial: false, isPaid: true, isEnterprise: false, isAdmin: false },
  PROFESSIONAL: {
    isTrial: false,
    isPaid: true,
    isEnterprise: false,
    isAdmin: false,
  },
  ENTERPRISE: {
    isTrial: false,
    isPaid: true,
    isEnterprise: true,
    isAdmin: false,
  },
  ADMIN: { isTrial: false, isPaid: false, isEnterprise: false, isAdmin: true },
  NONE: { isTrial: false, isPaid: false, isEnterprise: false, isAdmin: false },
};

/** PG-1C.1B §4.3 — revenue / billing participation derived from plan. */
export const PLAN_COMMERCIAL_PARTICIPATION: Record<
  CommercialPlan,
  Pick<CommercialFlags, "countsInMrr" | "countsInRevenue" | "invoiceEligible">
> = {
  TRIAL: {
    countsInMrr: false,
    countsInRevenue: false,
    invoiceEligible: false,
  },
  BASIC: {
    countsInMrr: true,
    countsInRevenue: true,
    invoiceEligible: true,
  },
  PROFESSIONAL: {
    countsInMrr: true,
    countsInRevenue: true,
    invoiceEligible: true,
  },
  ENTERPRISE: {
    countsInMrr: true,
    countsInRevenue: true,
    invoiceEligible: true,
  },
  ADMIN: {
    countsInMrr: false,
    countsInRevenue: false,
    invoiceEligible: false,
  },
  NONE: {
    countsInMrr: false,
    countsInRevenue: false,
    invoiceEligible: false,
  },
};

/**
 * COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1
 * Projection IDs enabled for a catalog bridge plan key — from existing matrix SSOT.
 */
export function listProjectionIdsForCommercialPlan(
  plan: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
): CommercialProjectionId[] {
  const set =
    plan === "BASIC"
      ? BASIC_PROJECTIONS
      : plan === "PROFESSIONAL"
        ? PROFESSIONAL_PROJECTIONS
        : ALL;
  return COMMERCIAL_PROJECTION_IDS.filter((id) => set.has(id));
}

export function getLimitsForPlan(plan: CommercialPlan): CommercialLimits {
  return { ...PLAN_LIMITS[plan] };
}

export function getFeaturesForPlan(plan: CommercialPlan): CommercialFeatures {
  const row = FEATURE_MATRIX[plan];
  return FEATURE_KEYS.reduce<CommercialFeatures>((acc, key) => {
    acc[key] = row[key];
    return acc;
  }, {} as CommercialFeatures);
}

export function getCommercialFlagsForPlan(plan: CommercialPlan): CommercialFlags {
  return {
    ...PLAN_COMMERCIAL_FLAGS[plan],
    ...PLAN_COMMERCIAL_PARTICIPATION[plan],
  };
}
