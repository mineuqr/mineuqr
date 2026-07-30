/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 * Legacy FEATURE_KEYS compatibility (Runtime / bound snapshots / UI gates only).
 * NOT Commercial Projection. NOT Catalog Plan vocabulary.
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

/** Same-string legacy keys that remain as projection IDs (`ordering` was both). */
export const LEGACY_DIRECT_PROJECTION_KEYS = ["ordering"] as const;

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
  // Projection IDs are checked by caller via isCommercialProjectionId
  if (isLegacyCompatFeatureKey(key)) {
    return LEGACY_TO_PROJECTION[key];
  }
  return null;
}
