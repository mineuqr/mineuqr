/**
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1
 *
 * Commercial Capability Filter SSOT — adopts PLATFORM-CAPABILITY-DISCOVERY-1
 * as the authority for what commercial plans may enable/disable.
 *
 * Commercial Plans are Capability Filters only (I-SRE-02 vocabulary).
 * Does NOT redesign Catalog, Runtime, Discovery, or Billing.
 */

/** Classification — every production capability is exactly one. */
export const COMMERCIAL_CAPABILITY_CLASSES = [
  "commercializable",
  "internal_only",
] as const;

export type CommercialCapabilityClass =
  (typeof COMMERCIAL_CAPABILITY_CLASSES)[number];

/**
 * Normative commercial filter keys (enable/disable toggles on a Plan).
 * Identical to certified FEATURE_KEYS / I-SRE-02 feature entitlements.
 * Plans MUST NOT invent keys outside this set.
 */
export const COMMERCIAL_CAPABILITY_FILTER_KEYS = [
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

export type CommercialCapabilityFilterKey =
  (typeof COMMERCIAL_CAPABILITY_FILTER_KEYS)[number];

export const COMMERCIAL_LIMIT_FILTER_KEYS = [
  "restaurants",
  "items",
  "categories",
  "ordersPerMonth",
  "qrCodes",
  "storage",
  "images",
  "staffAccounts",
  "branches",
  "devices",
] as const;

export type CommercialLimitFilterKey =
  (typeof COMMERCIAL_LIMIT_FILTER_KEYS)[number];

/** Join: Discovery CAP · Runtime matrix cap.* · Plan filter key */
export type CommercialCapabilityFilterRow = {
  filterKey: CommercialCapabilityFilterKey;
  discoveryCapIds: readonly string[];
  runtimeCapabilityId: string;
  class: "commercializable";
  inFilterVocabulary: true;
  productionImplemented: boolean;
  /** Domain hasFeature/requireFeature (not UI hide alone). */
  runtimeEnforced: "full" | "partial" | "flags_only" | "coarse_legacy";
  ownerDomain: string;
};

/**
 * Capability Catalog → Commercial Filter crosswalk (SSOT for plan packaging).
 * Discovery CAP IDs remain discovery identifiers; filter keys are plan toggles.
 */
export const COMMERCIAL_CAPABILITY_FILTER_REGISTRY: readonly CommercialCapabilityFilterRow[] =
  [
    {
      filterKey: "qrMenu",
      discoveryCapIds: ["CAP-05", "CAP-06"],
      runtimeCapabilityId: "cap.menu.qr",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Restaurant",
    },
    {
      filterKey: "categories",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.menu.categories",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Restaurant",
    },
    {
      filterKey: "menuImages",
      discoveryCapIds: ["CAP-05", "CAP-41"],
      runtimeCapabilityId: "cap.menu.images",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Restaurant",
    },
    {
      filterKey: "search",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.menu.search",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Restaurant",
    },
    {
      filterKey: "ordering",
      discoveryCapIds: ["CAP-03", "CAP-01", "CAP-32"],
      runtimeCapabilityId: "cap.ordering.core",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "full",
      ownerDomain: "Ordering Platform",
    },
    {
      filterKey: "cart",
      discoveryCapIds: ["CAP-04", "CAP-03"],
      runtimeCapabilityId: "cap.ordering.cart",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Ordering Client",
    },
    {
      filterKey: "checkout",
      discoveryCapIds: ["CAP-04", "CAP-03"],
      runtimeCapabilityId: "cap.ordering.checkout",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Ordering Client",
    },
    {
      filterKey: "requestBill",
      discoveryCapIds: ["CAP-08", "CAP-31"],
      runtimeCapabilityId: "cap.ordering.requestBill",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Settlement / Waiter",
    },
    {
      filterKey: "callWaiter",
      discoveryCapIds: ["CAP-31"],
      runtimeCapabilityId: "cap.ordering.callWaiter",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Waiter",
    },
    {
      filterKey: "orderTracking",
      discoveryCapIds: ["CAP-02", "CAP-34"],
      runtimeCapabilityId: "cap.ordering.tracking",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Order Read / Notifications",
    },
    {
      filterKey: "reports",
      discoveryCapIds: ["CAP-22"],
      runtimeCapabilityId: "cap.reporting.reports",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Reporting",
    },
    {
      filterKey: "excelExport",
      discoveryCapIds: ["CAP-22"],
      runtimeCapabilityId: "cap.reporting.excel",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Reporting",
    },
    {
      filterKey: "hotelMode",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.hotel.mode",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Hotel",
    },
    {
      filterKey: "roomQr",
      discoveryCapIds: ["CAP-06"],
      runtimeCapabilityId: "cap.hotel.roomQr",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Table",
    },
    {
      filterKey: "dynamicServiceCatalog",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.hotel.services",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "flags_only",
      ownerDomain: "Menu/Offers",
    },
    {
      filterKey: "templates",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.branding.templates",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "coarse_legacy",
      ownerDomain: "Menu/Branding",
    },
    {
      filterKey: "customColors",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.branding.colors",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "coarse_legacy",
      ownerDomain: "Menu/Branding",
    },
    {
      filterKey: "customFonts",
      discoveryCapIds: ["CAP-05"],
      runtimeCapabilityId: "cap.branding.fonts",
      class: "commercializable",
      inFilterVocabulary: true,
      productionImplemented: true,
      runtimeEnforced: "coarse_legacy",
      ownerDomain: "Menu/Branding",
    },
  ] as const;

/** Platform Discovery CAP classification (all 46). */
export type DiscoveryCapabilityClassification = {
  capId: string;
  name: string;
  class: CommercialCapabilityClass;
  /** When commercializable but not yet a plan filter key. */
  inFilterVocabulary: boolean;
  ownerDomain: string;
};

export const DISCOVERY_CAPABILITY_CLASSIFICATION: readonly DiscoveryCapabilityClassification[] =
  [
    { capId: "CAP-01", name: "Order Platform", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Order" },
    { capId: "CAP-02", name: "Order Read Model", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Order" },
    { capId: "CAP-03", name: "Ordering Platform", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Ordering" },
    { capId: "CAP-04", name: "Ordering Client", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Ordering Client" },
    { capId: "CAP-05", name: "Menu & Restaurant", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Menu/Restaurant" },
    { capId: "CAP-06", name: "Table", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Table" },
    { capId: "CAP-07", name: "Operational Session", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Session" },
    { capId: "CAP-08", name: "Check Settlement", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Settlement" },
    { capId: "CAP-09", name: "Order Settlement", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-10", name: "Split Payment", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-11", name: "Multi-Check Allocation", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-12", name: "Settlement Record", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-13", name: "Refund", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-14", name: "Financial Core Language", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Settlement" },
    { capId: "CAP-15", name: "Document Identity", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Cross-cutting" },
    { capId: "CAP-16", name: "CRMP", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Register" },
    { capId: "CAP-17", name: "Financial Shift", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Register" },
    { capId: "CAP-18", name: "Custody Plane", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Register/Settlement" },
    { capId: "CAP-19", name: "Commercial Catalog", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Commercial Catalog" },
    { capId: "CAP-20", name: "Snapshot Authority", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Subscription/Commercial" },
    { capId: "CAP-21", name: "Subscription", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Subscription" },
    { capId: "CAP-22", name: "Reporting", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Reporting" },
    { capId: "CAP-23", name: "Billing Providers", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Payments" },
    { capId: "CAP-24", name: "Tenant Identity", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Tenant Identity" },
    { capId: "CAP-25", name: "Auth & RBAC", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Identity/RBAC" },
    { capId: "CAP-26", name: "Kitchen", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Kitchen" },
    { capId: "CAP-27", name: "Printing", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Printing" },
    { capId: "CAP-28", name: "Realtime", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Realtime" },
    { capId: "CAP-29", name: "Device Mgmt", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Device" },
    { capId: "CAP-30", name: "Screen Pairing", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Device/Screen" },
    { capId: "CAP-31", name: "Waiter", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Waiter" },
    { capId: "CAP-32", name: "Kiosk", class: "commercializable", inFilterVocabulary: true, ownerDomain: "CX/Ordering" },
    { capId: "CAP-33", name: "Counter Pickup", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Ordering" },
    { capId: "CAP-34", name: "Notifications", class: "commercializable", inFilterVocabulary: true, ownerDomain: "Notifications" },
    { capId: "CAP-35", name: "Platform Ops Admin", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Administration" },
    { capId: "CAP-36", name: "Audit & Ops Taxonomy", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Observability" },
    { capId: "CAP-37", name: "DRAP", class: "internal_only", inFilterVocabulary: false, ownerDomain: "DRAP" },
    { capId: "CAP-38", name: "Performance", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Performance" },
    { capId: "CAP-39", name: "Ops Runtime", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Infrastructure" },
    { capId: "CAP-40", name: "Event Idempotency", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Order/Event" },
    { capId: "CAP-41", name: "Media Storage", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Infrastructure" },
    { capId: "CAP-42", name: "Country Currency", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Reference data" },
    { capId: "CAP-43", name: "Commercial Analytics", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Admin/Commercial" },
    { capId: "CAP-44", name: "Architecture Governance", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Architecture Authority" },
    { capId: "CAP-45", name: "AI Assistant", class: "commercializable", inFilterVocabulary: false, ownerDomain: "Planned AI" },
    { capId: "CAP-46", name: "Order Latency", class: "internal_only", inFilterVocabulary: false, ownerDomain: "Observability" },
  ] as const;

export function isCommercialCapabilityFilterKey(
  key: string
): key is CommercialCapabilityFilterKey {
  return (COMMERCIAL_CAPABILITY_FILTER_KEYS as readonly string[]).includes(key);
}

export function isCommercialLimitFilterKey(
  key: string
): key is CommercialLimitFilterKey {
  return (COMMERCIAL_LIMIT_FILTER_KEYS as readonly string[]).includes(key);
}

export function assertCommercialCapabilityFilterKeys(
  keys: readonly string[]
): { ok: true } | { ok: false; invalid: string[] } {
  const invalid = keys.filter((k) => !isCommercialCapabilityFilterKey(k));
  return invalid.length ? { ok: false, invalid } : { ok: true };
}

export function listCommercializableDiscoveryCaps(): DiscoveryCapabilityClassification[] {
  return DISCOVERY_CAPABILITY_CLASSIFICATION.filter(
    (c) => c.class === "commercializable"
  );
}

export function listInternalOnlyDiscoveryCaps(): DiscoveryCapabilityClassification[] {
  return DISCOVERY_CAPABILITY_CLASSIFICATION.filter(
    (c) => c.class === "internal_only"
  );
}

export const COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM =
  "COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1" as const;
