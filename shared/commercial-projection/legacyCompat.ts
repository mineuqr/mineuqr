/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 * LEGACY-COMPATIBILITY-RETIREMENT-1 — transitional Runtime / snapshot / UI-gate compat.
 *
 * NOT Commercial Projection. NOT Catalog Plan vocabulary.
 * Classification SSOT: ./legacyRetirement.ts
 * Do NOT add keys without ACTIVE/TRANSITIONAL evidence + retirement condition.
 */

import type { CommercialProjectionId } from "./schema";

/** Legacy entitlement strings that may appear in bound snapshots / UI gates. */
export const LEGACY_COMPAT_FEATURE_KEYS = [
  "qrMenu",
  "categories",
  "menuImages",
  "search",
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
] as const;

export type LegacyCompatFeatureKey =
  (typeof LEGACY_COMPAT_FEATURE_KEYS)[number];

/**
 * Legacy → Projection alias (when reading snapshots / normalizing writes).
 * Deprecated facets without a projection map to null (dropped from Catalog).
 */
export const LEGACY_TO_PROJECTION: Readonly<
  Record<LegacyCompatFeatureKey, CommercialProjectionId | null>
> = {
  qrMenu: null,
  categories: null,
  menuImages: null,
  search: null,
  cart: "ordering",
  checkout: "ordering",
  requestBill: "checkManagement",
  callWaiter: "waiter",
  orderTracking: "ordering",
  reports: "reporting",
  excelExport: "reporting",
  hotelMode: null,
  roomQr: null,
  dynamicServiceCatalog: null,
  templates: null,
  customColors: null,
  customFonts: null,
};

export function isLegacyCompatFeatureKey(
  key: string
): key is LegacyCompatFeatureKey {
  return (LEGACY_COMPAT_FEATURE_KEYS as readonly string[]).includes(key);
}

/**
 * Normalize any commercial feature string to a Projection ID when possible.
 * Returns null for deprecated / non-projected keys.
 */
export function normalizeToProjectionId(
  key: string
): CommercialProjectionId | null {
  if (key === "ordering") return "ordering";
  if (isLegacyCompatFeatureKey(key)) {
    return LEGACY_TO_PROJECTION[key];
  }
  return null;
}
