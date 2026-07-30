/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Capability → entitlement key matrix (single canonical mapping).
 */

import type { FeatureKey } from "@commercial/featureKeys";
import { FEATURE_KEYS } from "@commercial/featureKeys";

export type LimitEntitlementKey =
  | "restaurants"
  | "categories"
  | "items"
  | "ordersPerMonth"
  | "qrCodes"
  | "storage"
  | "images"
  | "staffAccounts"
  | "branches"
  | "devices";

export type CapabilityKind = "feature" | "limit";

export type CapabilityEntitlement = {
  capabilityId: string;
  kind: CapabilityKind;
  entitlementKey: FeatureKey | LimitEntitlementKey;
  description: string;
};

/** Every protected commercial capability maps to exactly one entitlement key. */
export const CAPABILITY_ENTITLEMENT_MATRIX: readonly CapabilityEntitlement[] = [
  { capabilityId: "cap.menu.qr", kind: "feature", entitlementKey: "qrMenu", description: "QR menu" },
  { capabilityId: "cap.menu.categories", kind: "feature", entitlementKey: "categories", description: "Menu categories" },
  { capabilityId: "cap.menu.images", kind: "feature", entitlementKey: "menuImages", description: "Menu images" },
  { capabilityId: "cap.menu.search", kind: "feature", entitlementKey: "search", description: "Menu search" },
  { capabilityId: "cap.ordering.core", kind: "feature", entitlementKey: "ordering", description: "Guest/staff ordering" },
  { capabilityId: "cap.ordering.cart", kind: "feature", entitlementKey: "cart", description: "Cart" },
  { capabilityId: "cap.ordering.checkout", kind: "feature", entitlementKey: "checkout", description: "Checkout" },
  { capabilityId: "cap.ordering.requestBill", kind: "feature", entitlementKey: "requestBill", description: "Request bill" },
  { capabilityId: "cap.ordering.callWaiter", kind: "feature", entitlementKey: "callWaiter", description: "Call waiter" },
  { capabilityId: "cap.ordering.tracking", kind: "feature", entitlementKey: "orderTracking", description: "Order tracking" },
  { capabilityId: "cap.reporting.reports", kind: "feature", entitlementKey: "reports", description: "Reports" },
  { capabilityId: "cap.reporting.excel", kind: "feature", entitlementKey: "excelExport", description: "Excel export" },
  { capabilityId: "cap.hotel.mode", kind: "feature", entitlementKey: "hotelMode", description: "Hotel mode" },
  { capabilityId: "cap.hotel.roomQr", kind: "feature", entitlementKey: "roomQr", description: "Room QR" },
  { capabilityId: "cap.hotel.services", kind: "feature", entitlementKey: "dynamicServiceCatalog", description: "Dynamic services" },
  { capabilityId: "cap.branding.templates", kind: "feature", entitlementKey: "templates", description: "Templates" },
  { capabilityId: "cap.branding.colors", kind: "feature", entitlementKey: "customColors", description: "Custom colors" },
  { capabilityId: "cap.branding.fonts", kind: "feature", entitlementKey: "customFonts", description: "Custom fonts" },
  { capabilityId: "cap.limit.restaurants", kind: "limit", entitlementKey: "restaurants", description: "Restaurant quota" },
  { capabilityId: "cap.limit.categories", kind: "limit", entitlementKey: "categories", description: "Category quota" },
  { capabilityId: "cap.limit.items", kind: "limit", entitlementKey: "items", description: "Item quota" },
  { capabilityId: "cap.limit.ordersPerMonth", kind: "limit", entitlementKey: "ordersPerMonth", description: "Orders/month" },
  { capabilityId: "cap.limit.qrCodes", kind: "limit", entitlementKey: "qrCodes", description: "QR codes" },
  { capabilityId: "cap.limit.storage", kind: "limit", entitlementKey: "storage", description: "Storage" },
  { capabilityId: "cap.limit.images", kind: "limit", entitlementKey: "images", description: "Images" },
  { capabilityId: "cap.limit.staffAccounts", kind: "limit", entitlementKey: "staffAccounts", description: "Staff accounts" },
  { capabilityId: "cap.limit.branches", kind: "limit", entitlementKey: "branches", description: "Branches" },
  { capabilityId: "cap.limit.devices", kind: "limit", entitlementKey: "devices", description: "Devices" },
] as const;

const byCapability = new Map(
  CAPABILITY_ENTITLEMENT_MATRIX.map((row) => [row.capabilityId, row])
);

export function resolveCapabilityEntitlement(
  capabilityId: string
): CapabilityEntitlement | null {
  return byCapability.get(capabilityId) ?? null;
}

export function assertFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key);
}

export function allFeatureCapabilityIds(): string[] {
  return CAPABILITY_ENTITLEMENT_MATRIX.filter((c) => c.kind === "feature").map(
    (c) => c.capabilityId
  );
}
