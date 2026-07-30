/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * COMMERCIAL-PROJECTION-GENERATION-1
 * Capability → entitlement key matrix (Projection IDs + Legacy Compat).
 */

import type { FeatureKey } from "@commercial/featureKeys";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import {
  COMMERCIAL_PROJECTION_REGISTRY,
  LEGACY_COMPAT_FEATURE_KEYS,
  type LegacyCompatFeatureKey,
} from "@shared/commercial-projection";

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

/** Legacy runtime capability IDs retained for bound-snapshot / UI-gate continuity. */
const LEGACY_COMPAT_MATRIX: readonly CapabilityEntitlement[] =
  LEGACY_COMPAT_FEATURE_KEYS.map((key) => ({
    capabilityId: `cap.legacy.${key}`,
    kind: "feature" as const,
    entitlementKey: key as LegacyCompatFeatureKey,
    description: `Legacy compat: ${key}`,
  }));

const PROJECTION_MATRIX: readonly CapabilityEntitlement[] =
  COMMERCIAL_PROJECTION_REGISTRY.map((row) => ({
    capabilityId: row.runtimeCapabilityId,
    kind: "feature" as const,
    entitlementKey: row.projectionId,
    description: row.capabilityName,
  }));

/** Every protected commercial capability maps to exactly one entitlement key. */
export const CAPABILITY_ENTITLEMENT_MATRIX: readonly CapabilityEntitlement[] = [
  ...PROJECTION_MATRIX,
  ...LEGACY_COMPAT_MATRIX,
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
