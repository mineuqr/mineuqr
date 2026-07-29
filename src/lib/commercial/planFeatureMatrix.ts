/**
 * PG-1C entitlement evaluation matrix.
 *
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1:
 * Used ONLY by the Legacy Bridge path for unbound subscriptions.
 * Bound subscriptions resolve exclusively from Commercial Snapshot —
 * this matrix must never execute after a SubscriptionBinding exists.
 */
import { FEATURE_KEYS, type FeatureKey } from "./featureKeys";
import type { CommercialPlan } from "./planTypes";
import type { CommercialFeatures, CommercialFlags, CommercialLimits } from "./types";

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

/** PG-1C.1B §3.2 — availability matrix (Y/N). */
const FEATURE_MATRIX: Record<CommercialPlan, FeatureMatrixRow> = {
  TRIAL: {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: true,
    cart: true,
    checkout: true,
    requestBill: true,
    callWaiter: true,
    orderTracking: true,
    reports: true,
    excelExport: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
    templates: true,
    customColors: true,
    customFonts: true,
  },
  BASIC: {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: false,
    cart: false,
    checkout: false,
    requestBill: false,
    callWaiter: false,
    orderTracking: false,
    reports: false,
    excelExport: false,
    hotelMode: false,
    roomQr: false,
    dynamicServiceCatalog: false,
    templates: true,
    customColors: false,
    customFonts: false,
  },
  PROFESSIONAL: {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: true,
    cart: true,
    checkout: true,
    requestBill: true,
    callWaiter: true,
    orderTracking: true,
    reports: true,
    excelExport: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
    templates: true,
    customColors: true,
    customFonts: true,
  },
  ENTERPRISE: {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: true,
    cart: true,
    checkout: true,
    requestBill: true,
    callWaiter: true,
    orderTracking: true,
    reports: true,
    excelExport: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
    templates: true,
    customColors: true,
    customFonts: true,
  },
  ADMIN: {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: true,
    cart: true,
    checkout: true,
    requestBill: true,
    callWaiter: true,
    orderTracking: true,
    reports: true,
    excelExport: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
    templates: true,
    customColors: true,
    customFonts: true,
  },
  NONE: {
    qrMenu: true,
    categories: false,
    menuImages: false,
    search: true,
    ordering: false,
    cart: false,
    checkout: false,
    requestBill: false,
    callWaiter: false,
    orderTracking: false,
    reports: false,
    excelExport: false,
    hotelMode: false,
    roomQr: false,
    dynamicServiceCatalog: false,
    templates: false,
    customColors: false,
    customFonts: false,
  },
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
