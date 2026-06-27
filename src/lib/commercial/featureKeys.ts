/** PG-1C.1B §3.1 — normative feature keys for `features.<key>`. */
export const FEATURE_KEYS = [
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
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
